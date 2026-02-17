const db = require('../config/db');
const { sendWhatsAppMessage } = require('../utils/whatsapp');

exports.createSuggestion = async (req, res) => {
    const { book_name, author, reference_link } = req.body;
    const user_id = req.user.id;
    const user_name = req.user.name;

    try {
        await db.query(
            'INSERT INTO suggestions (user_id, book_name, author, reference_link) VALUES (?, ?, ?, ?)',
            [user_id, book_name, author, reference_link || null]
        );

        // Send WhatsApp Notification
        const message = `💡 New Book Suggestion
Teacher: ${user_name}
Book: ${book_name}
Author: ${author}
Link: ${reference_link || 'N/A'}`;

        await sendWhatsAppMessage(message);

        res.status(201).json({ message: 'Suggestion sent successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.getSuggestions = async (req, res) => {
    try {
        const [suggestions] = await db.query(`
            SELECT s.*, u.name as user_name 
            FROM suggestions s 
            JOIN users u ON s.user_id = u.id 
            ORDER BY s.created_at DESC
        `);
        res.json(suggestions);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
