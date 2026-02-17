const db = require('../config/db');
const PDFDocument = require('pdfkit-table');

exports.generateIssueReport = async (req, res) => {
    try {
        const query = `
      SELECT i.id, i.issue_date, i.return_date, i.returned, i.status, i.fine, u.name as user_name, b.book_name, b.author
      FROM book_issues i
      JOIN users u ON i.user_id = u.id
      JOIN books b ON i.book_id = b.id
      ORDER BY i.issue_date DESC
    `;
        const [issues] = await db.query(query);

        const doc = new PDFDocument({ margin: 30, size: 'A4' });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=issued_books_report.pdf');

        doc.pipe(res);

        // Title
        doc.fontSize(20).text('Issued Books Tracking Report', { align: 'center' });
        doc.moveDown();

        // Table
        const table = {
            title: "Issued Books Details",
            headers: [
                { label: "User", property: 'user_name', width: 90 },
                { label: "Book", property: 'book_name', width: 110 },
                { label: "Issue Date", property: 'issue_date', width: 70 },
                { label: "Return Date", property: 'return_date', width: 70 },
                { label: "Status", property: 'status', width: 60 },
                { label: "Fine", property: 'fine', width: 50 }
            ],
            datas: issues.map(issue => ({
                user_name: issue.user_name,
                book_name: issue.book_name,
                issue_date: new Date(issue.issue_date).toLocaleDateString(),
                return_date: issue.return_date ? new Date(issue.return_date).toLocaleDateString() : '-',
                status: issue.returned ? (issue.status ? issue.status.charAt(0).toUpperCase() + issue.status.slice(1) : 'Returned') : 'Issued',
                fine: issue.fine > 0 ? `Rs. ${issue.fine}` : '-'
            }))
        };

        await doc.table(table, {
            prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10),
            prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
                doc.font("Helvetica").fontSize(10);
                indexColumn === 0 && doc.addBackground(rectRow, (indexRow % 2 ? 'whiteSmoke' : 'white'), 0.15);
            },
        });

        doc.end();

    } catch (error) {
        console.error('Report generation error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};


exports.getAllIssues = async (req, res) => {
    try {
        const query = `
      SELECT i.id, i.issue_date, i.return_date, i.returned, i.status, i.fine, u.name as user_name, b.book_name, b.author
      FROM book_issues i
      JOIN users u ON i.user_id = u.id
      JOIN books b ON i.book_id = b.id
      ORDER BY i.issue_date DESC
    `;
        const [issues] = await db.query(query);
        res.json(issues);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.getMyIssues = async (req, res) => {
    const user_id = req.user.id;
    try {
        const query = `
      SELECT i.id, i.issue_date, i.return_date, i.returned, i.status, i.fine, b.book_name, b.author
      FROM book_issues i
      JOIN books b ON i.book_id = b.id
      WHERE i.user_id = ?
      ORDER BY i.issue_date DESC
    `;
        const [issues] = await db.query(query, [user_id]);
        res.json(issues);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.returnBook = async (req, res) => {
    const { id } = req.params; // Issue ID
    const { status = 'returned', fine = 0, remarks = '' } = req.body;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Check issue
        const [issues] = await connection.query('SELECT * FROM book_issues WHERE id = ?', [id]);
        if (issues.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Issue record not found' });
        }
        const issue = issues[0];

        if (issue.returned) {
            await connection.rollback();
            return res.status(400).json({ message: 'Book already processed' });
        }

        // Mark returned/lost/damaged with current date
        // Note: We use 'returned = TRUE' to signify the transaction is closed, regardless of status (e.g. lost is also a closed transaction)
        await connection.query(
            'UPDATE book_issues SET returned = TRUE, return_date = NOW(), status = ?, fine = ? WHERE id = ?',
            [status, fine, id]
        );

        // Increment available quantity ONLY if the book is actually returned in good condition
        if (status === 'returned') {
            await connection.query('UPDATE books SET available_quantity = available_quantity + 1 WHERE id = ?', [issue.book_id]);
        }
        // If 'lost' or 'damaged', we assume it's not available for re-issue, so we don't increment available_quantity.
        // We might want to decrement 'total_quantity' if it's lost/destroyed, but usually we keep total to show historical stock or write-off.
        // Let's explicitly NOT increment available_quantity.

        await connection.commit();
        res.json({ message: `Book marked as ${status} successfully` });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ message: 'Server error', error: error.message });
    } finally {
        connection.release();
    }
};

exports.getUserHistory = async (req, res) => {
    const { userId } = req.params;
    try {
        const query = `
      SELECT i.id, i.issue_date, i.return_date, i.returned, i.status, i.fine, b.book_name, b.author
      FROM book_issues i
      JOIN books b ON i.book_id = b.id
      WHERE i.user_id = ?
      ORDER BY i.issue_date DESC
    `;
        const [issues] = await db.query(query, [userId]);
        res.json(issues);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
