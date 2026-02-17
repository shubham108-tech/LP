const db = require('../config/db');

// Get all messages for a specific book
exports.getDiscussions = async (req, res) => {
    const { bookId } = req.params;
    try {
        const [messages] = await db.query(`
            SELECT d.id, d.message, d.created_at, u.name as user_name, u.role, u.id as user_id
            FROM book_discussions d
            JOIN users u ON d.user_id = u.id
            WHERE d.book_id = ?
            ORDER BY d.created_at ASC
        `, [bookId]);
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Post a new message
exports.postMessage = async (req, res) => {
    const { bookId } = req.params;
    const { message } = req.body;
    const userId = req.user.id; // From authMiddleware

    if (!message) return res.status(400).json({ message: 'Message cannot be empty' });

    try {
        await db.query(
            'INSERT INTO book_discussions (book_id, user_id, message) VALUES (?, ?, ?)',
            [bookId, userId, message]
        );
        res.status(201).json({ message: 'Message posted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
