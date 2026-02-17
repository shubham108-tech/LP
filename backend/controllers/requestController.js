const db = require('../config/db');
const { sendWhatsAppMessage } = require('../utils/whatsapp');

exports.placeRequest = async (req, res) => {
    const { book_id, reason, reference_link } = req.body;
    const user_id = req.user.id;
    const user_name = req.user.name;

    try {
        // Check if book exists and is available (optional strict check, availability checked at approval usually but good to check now)
        const [books] = await db.query('SELECT * FROM books WHERE id = ?', [book_id]);
        if (books.length === 0) {
            return res.status(404).json({ message: 'Book not found' });
        }
        const book = books[0];

        // Create request
        await db.query(
            'INSERT INTO book_requests (user_id, book_id, status, reason, reference_link) VALUES (?, ?, ?, ?, ?)',
            [user_id, book_id, 'pending', reason || null, reference_link || null]
        );

        // Send WhatsApp Notification
        const requestDate = new Date().toLocaleString();
        const message = `📚 New Book Request
Teacher: ${user_name}
Book: ${book.book_name}
Reason: ${reason || 'N/A'}
Date: ${requestDate}`;

        await sendWhatsAppMessage(message);

        res.status(201).json({ message: 'Request placed successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.getAllRequests = async (req, res) => {
    try {
        const query = `
      SELECT r.id, r.status, r.request_date, r.reason, r.reference_link, u.name as user_name, b.book_name, b.author
      FROM book_requests r
      JOIN users u ON r.user_id = u.id
      JOIN books b ON r.book_id = b.id
      ORDER BY r.request_date DESC
    `;
        const [requests] = await db.query(query);
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.getUserRequests = async (req, res) => {
    const user_id = req.user.id;
    try {
        const query = `
      SELECT r.id, r.status, r.request_date, r.reason, r.reference_link, b.book_name, b.author
      FROM book_requests r
      JOIN books b ON r.book_id = b.id
      WHERE r.user_id = ?
      ORDER BY r.request_date DESC
    `;
        const [requests] = await db.query(query, [user_id]);
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Admin approves/rejects
exports.updateRequestStatus = async (req, res) => {
    const { id } = req.params; // Request ID
    const { status } = req.body; // 'approved' or 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Get request details
        const [reqs] = await connection.query('SELECT * FROM book_requests WHERE id = ?', [id]);
        if (reqs.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Request not found' });
        }
        const request = reqs[0];

        // Update status
        await connection.query('UPDATE book_requests SET status = ? WHERE id = ?', [status, id]);

        if (status === 'approved') {
            // Check availability
            const [books] = await connection.query('SELECT * FROM books WHERE id = ?', [request.book_id]);
            const book = books[0];

            if (book.available_quantity <= 0) {
                await connection.rollback();
                return res.status(400).json({ message: 'Book not available' });
            }

            // Decrement quantity
            await connection.query('UPDATE books SET available_quantity = available_quantity - 1 WHERE id = ?', [request.book_id]);

            // Create Issue Record
            // Return date defaults to 14 days later? Or null until returned? 
            // User didn't specify return policy, but asked for "Return Date" in table.
            // I'll set a default 7 days due date or just leave it null if it means "Date returned".
            // Required: "View issue date & return date". "Status (Issued / Returned)".
            // Usually "Return Date" in tracking table means "Due Date" or "Date it was returned"?
            // "Status (Issued / Returned)" implies tracking if it IS returned.
            // So return_date might be the ACTUAL return date.
            // I'll leave return_date NULL for now (meaning not returned yet) or use it as Due Date?
            // "View issue date & return date" -> Probably Due date.
            // But "Status (Issued / Returned)" suggests a flag.
            // Let's assume return_date is the DUE DATE for now, and we have a 'returned' boolean.
            // Or return_date is the actual date returned.
            // I'll assume return_date is the ACTUAL date returned. If it's null, it's not returned.
            // But table requirement: "Issue Date, Return Date, Status".
            // If Status is Issued, Return Date is ??? (maybe due date).
            // If Status is Returned, Return Date is the date returned.
            // To keep it simple: I will use `return_date` as the actual date returned.

            await connection.query(
                'INSERT INTO book_issues (user_id, book_id, issue_date) VALUES (?, ?, NOW())',
                [request.user_id, request.book_id]
            );
        }

        await connection.commit();
        res.json({ message: `Request ${status}` });
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    } finally {
        connection.release();
    }
};
