const db = require('../config/db');

exports.getAllBooks = async (req, res) => {
    try {
        const [books] = await db.query('SELECT * FROM books');
        res.json(books);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.addBook = async (req, res) => {
    const { book_name, author, category, total_quantity, available_quantity } = req.body;

    if (!book_name || !author || total_quantity === undefined || total_quantity === null || total_quantity === '') {
        return res.status(400).json({ message: 'Missing required fields (Book Title, Author, or Quantity)' });
    }

    const totalQty = parseInt(total_quantity) || 1;
    const availQty = available_quantity !== undefined && available_quantity !== null && available_quantity !== ''
        ? parseInt(available_quantity)
        : totalQty;

    let image_url = req.body.uploaded_image_url || null;
    let pdf_url = req.body.uploaded_pdf_url || null;

    if (req.files) {
        if (req.files['image'] && req.files['image'][0]) {
            const p = req.files['image'][0].path.replace(/\\/g, '/');
            image_url = p.includes('uploads/') ? 'uploads/' + p.split('uploads/').pop() : p;
        }
        if (req.files['pdf'] && req.files['pdf'][0]) {
            const p = req.files['pdf'][0].path.replace(/\\/g, '/');
            pdf_url = p.includes('uploads/') ? 'uploads/' + p.split('uploads/').pop() : p;
        }
    }

    try {
        const [result] = await db.query(
            'INSERT INTO books (book_name, author, category, total_quantity, available_quantity, image_url, pdf_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [book_name, author, category || 'General', totalQty, availQty, image_url, pdf_url]
        );
        res.status(201).json({ message: 'Book added successfully', bookId: result.insertId });
    } catch (error) {
        console.error('addBook Error:', error);
        res.status(500).json({ message: error.message || 'Server error', error: error.message });
    }
};

exports.updateBook = async (req, res) => {
    const { id } = req.params;
    const { book_name, author, category, total_quantity, available_quantity } = req.body;

    let image_url = req.body.uploaded_image_url || null;
    let pdf_url = req.body.uploaded_pdf_url || null;

    if (req.files) {
        if (req.files['image'] && req.files['image'][0]) {
            const p = req.files['image'][0].path.replace(/\\/g, '/');
            image_url = p.includes('uploads/') ? 'uploads/' + p.split('uploads/').pop() : p;
        }
        if (req.files['pdf'] && req.files['pdf'][0]) {
            const p = req.files['pdf'][0].path.replace(/\\/g, '/');
            pdf_url = p.includes('uploads/') ? 'uploads/' + p.split('uploads/').pop() : p;
        }
    }

    try {
        const totalQty = parseInt(total_quantity) || 1;
        const availQty = available_quantity !== undefined && available_quantity !== null && available_quantity !== ''
            ? parseInt(available_quantity)
            : totalQty;

        let query = 'UPDATE books SET book_name = ?, author = ?, category = ?, total_quantity = ?, available_quantity = ?';
        const params = [book_name, author, category || 'General', totalQty, availQty];

        if (image_url) {
            query += ', image_url = ?';
            params.push(image_url);
        }
        if (pdf_url) {
            query += ', pdf_url = ?';
            params.push(pdf_url);
        }

        query += ' WHERE id = ?';
        params.push(id);

        await db.query(query, params);
        res.json({ message: 'Book updated successfully' });
    } catch (error) {
        console.error('updateBook Error:', error);
        res.status(500).json({ message: error.message || 'Server error', error: error.message });
    }
};

exports.deleteBook = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM books WHERE id = ?', [id]);
        res.json({ message: 'Book deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.bulkDeleteBooks = async (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: 'No book IDs provided' });
    }

    try {
        // Use parameterized query for safety
        await db.query('DELETE FROM books WHERE id IN (?)', [ids]);
        res.json({ message: `Successfully deleted ${ids.length} books` });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Helper: Parse File Buffer (PDF/Excel)
const parseBookFile = async (buffer, originalName) => {
    const fileExt = originalName.split('.').pop().toLowerCase();
    let data = [];

    if (fileExt === 'pdf') {
        const pdf = require('pdf-parse');
        let pdfData;
        try {
            pdfData = await pdf(buffer);
        } catch (pdfError) {
            throw new Error('Failed to parse PDF: ' + pdfError.message);
        }

        const text = pdfData.text.replace(/\r\n/g, '\n');
        const lines = text.split('\n').filter(l => l.trim().length > 3);

        // Smart Header Detection
        let authorColumnIndex = -1;
        let headerFound = false;

        for (let i = 0; i < Math.min(lines.length, 20); i++) {
            const lineLower = lines[i].toLowerCase();
            if ((lineLower.includes('title') || lineLower.includes('book')) && lineLower.includes('author')) {
                const authorMatch = lines[i].match(/Author/i);
                if (authorMatch) {
                    authorColumnIndex = authorMatch.index;
                    headerFound = true;
                    lines.splice(0, i + 1);
                    break;
                }
            }
        }

        data = lines.map(line => {
            // Strategy 0: Fixed Width
            if (headerFound && authorColumnIndex > 0 && line.length > authorColumnIndex) {
                const rawTitle = line.substring(0, authorColumnIndex).trim();
                let author = line.substring(authorColumnIndex).trim();
                if (rawTitle && author) {
                    const book_name = rawTitle.replace(/^[\d]+\.?\s*/, '');
                    return { book_name, author, qty: 1 };
                }
            }
            // Strategy 1: "by"
            if (line.includes(' by ')) {
                const parts = line.split(' by ');
                return { book_name: parts[0].trim(), author: parts[1].trim(), qty: 1 };
            }
            // Strategy 2: " - " or " | "
            const sep = line.match(/ [-|] /);
            if (sep) {
                const parts = line.split(sep[0]);
                return { book_name: parts[0].trim(), author: parts[1].trim(), qty: 1 };
            }
            // Strategy 3: Tab
            if (line.includes('\t')) {
                const parts = line.split('\t');
                return { book_name: parts[0].trim(), author: parts[1] ? parts[1].trim() : 'Unknown', qty: 1 };
            }
            // Strategy 4: Gap
            let gapMatch = line.match(/\s{2,}/);
            if (gapMatch) {
                const parts = line.split(gapMatch[0]);
                let book_name = parts[0].trim().replace(/^[\d]+\.?\s*/, '');
                return { book_name, author: parts[1] ? parts[1].trim() : 'Unknown', qty: 1 };
            }
            // Fallback
            if (!/Page \d+/.test(line) && line.length < 500) {
                return { book_name: line.trim(), author: 'Unknown Author', qty: 1 };
            }
            return null;
        }).filter(item => item !== null && item.book_name.length > 2);

    } else {
        try {
            const xlsx = require('xlsx');
            const workbook = xlsx.read(buffer, { type: 'buffer' });

            if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                throw new Error('Invalid Excel file: No sheets found');
            }

            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rawData = xlsx.utils.sheet_to_json(sheet);

            console.log('Excel/CSV Headers:', rawData.length > 0 ? Object.keys(rawData[0]) : 'No data');

            const findColumnValue = (row, possibleKeys) => {
                const keys = Object.keys(row);
                for (const key of keys) {
                    const lowerKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
                    for (const target of possibleKeys) {
                        if (lowerKey === target || lowerKey.includes(target)) return row[key];
                    }
                }
                return null;
            };

            data = rawData.map(row => {
                const bookName = findColumnValue(row, ['bookname', 'title', 'book', 'name']) || 'Unknown Book';
                const author = findColumnValue(row, ['author', 'writer', 'auth']) || 'Unknown Author';
                const directQty = row['Quantity'] || row['Qty'] || row['quantity'] || row['qty'];
                return { book_name: bookName, author, qty: directQty || 1 };
            });
        } catch (excelError) {
            console.error('Excel Parsing Error:', excelError);
            throw new Error('Failed to parse Excel file: ' + excelError.message);
        }
    }
    return data;
};

const getFileBufferAndName = (req) => {
    const fs = require('fs');
    const path = require('path');
    if (req.body.serverFilePath) {
        const relativePath = req.body.serverFilePath;
        const uploadDir = process.env.VERCEL
            ? path.join('/tmp', relativePath)
            : path.join(__dirname, '..', relativePath);
        return {
            buffer: fs.readFileSync(uploadDir),
            originalName: path.basename(relativePath)
        };
    } else if (req.file) {
        return {
            buffer: req.file.buffer,
            originalName: req.file.originalname
        };
    } else {
        throw new Error('No file uploaded');
    }
};

exports.uploadChunk = async (req, res) => {
    const fs = require('fs');
    const path = require('path');
    try {
        if (!req.file) return res.status(400).json({ message: 'No chunk uploaded' });

        const { uploadId, chunkIndex, totalChunks, filename, fileType } = req.body;
        if (!uploadId || chunkIndex === undefined || !totalChunks) {
            return res.status(400).json({ message: 'Missing chunk metadata' });
        }

        const idx = parseInt(chunkIndex);
        const total = parseInt(totalChunks);

        const uploadDir = process.env.VERCEL
            ? path.join('/tmp', 'uploads')
            : path.join(__dirname, '../uploads');
        const tempDir = path.join(uploadDir, 'temp');

        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const ext = path.extname(filename || 'file').toLowerCase();
        const tempFilePath = path.join(tempDir, `chunk_${uploadId}${ext}`);

        fs.appendFileSync(tempFilePath, req.file.buffer);

        if (idx + 1 === total) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const prefix = fileType || 'file';
            const finalFilename = `${prefix}-${uniqueSuffix}${ext}`;
            const finalFilePath = path.join(uploadDir, finalFilename);

            fs.renameSync(tempFilePath, finalFilePath);

            const relativePath = `uploads/${finalFilename}`;
            return res.json({ completed: true, filePath: relativePath });
        }

        return res.json({ completed: false, receivedChunk: idx });
    } catch (error) {
        console.error('uploadChunk Error:', error);
        res.status(500).json({ message: 'Chunk upload failed: ' + error.message });
    }
};

exports.previewBulkUpload = async (req, res) => {
    try {
        const { buffer, originalName } = getFileBufferAndName(req);
        const data = await parseBookFile(buffer, originalName);
        res.json({ success: true, count: data.length, data: data.slice(0, 50) }); // Preview first 50
    } catch (error) {
        res.status(500).json({ message: 'Error parsing file: ' + error.message });
    }
};

exports.bulkUploadBooks = async (req, res) => {
    try {
        const { buffer, originalName } = getFileBufferAndName(req);
        const data = await parseBookFile(buffer, originalName);
        let addedCount = 0;
        let mergedCount = 0;

        for (const item of data) {
            try {
                const bookName = item.book_name ? item.book_name.toString().trim() : null;
                const author = item.author ? item.author.toString().trim() : null;
                const qtyStr = item.qty ? item.qty.toString() : '1';
                const qtyMatch = qtyStr.match(/\d+/);
                const qty = qtyMatch ? parseInt(qtyMatch[0]) : 1;

                if (bookName && author) {
                    const [existing] = await db.query('SELECT * FROM books WHERE book_name = ? AND author = ?', [bookName, author]);
                    if (existing.length > 0) {
                        const bookId = existing[0].id;
                        await db.query(
                            'UPDATE books SET total_quantity = total_quantity + ?, available_quantity = available_quantity + ? WHERE id = ?',
                            [qty, qty, bookId]
                        );
                        mergedCount++;
                    } else {
                        await db.query(
                            'INSERT INTO books (book_name, author, total_quantity, available_quantity) VALUES (?, ?, ?, ?)',
                            [bookName, author, qty, qty]
                        );
                        addedCount++;
                    }
                }
            } catch (rowError) {
                console.warn('Skipping invalid row:', item, rowError);
            }
        }
        res.json({ message: `Upload successful. Added ${addedCount} new books. Merged ${mergedCount}.` });
    } catch (error) {
        console.error('BULK UPLOAD ERROR:', error);
        res.status(500).json({ message: 'Error processing file: ' + error.message });
    }
};

exports.saveHighlight = async (req, res) => {
    const { id: book_id } = req.params;
    const { page_number, highlights } = req.body;
    const user_id = req.user.id;

    try {
        await db.query(
            `INSERT INTO book_highlights (user_id, book_id, page_number, highlights)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE highlights = VALUES(highlights)`,
            [user_id, book_id, page_number, JSON.stringify(highlights)]
        );
        res.json({ message: 'Highlight saved' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.getHighlights = async (req, res) => {
    const { id: book_id } = req.params;
    const user_id = req.user.id;

    try {
        const [rows] = await db.query(
            'SELECT page_number, highlights FROM book_highlights WHERE user_id = ? AND book_id = ?',
            [user_id, book_id]
        );
        const data = rows.map(r => ({
            page_number: r.page_number,
            highlights: typeof r.highlights === 'string' ? JSON.parse(r.highlights) : r.highlights
        }));
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
