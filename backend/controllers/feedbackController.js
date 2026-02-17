const db = require('../config/db');

// 1. Submit Feedback (Anyone)
exports.createFeedback = async (req, res) => {
    const { message, type } = req.body;
    const userId = req.user.id;

    if (!message) {
        return res.status(400).json({ message: 'Feedback message is required' });
    }

    try {
        await db.query(`
            INSERT INTO feedback (user_id, message, type) VALUES (?, ?, ?)
        `, [userId, message, type]);

        res.status(201).json({ message: 'Feedback submitted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error submitting feedback', error: error.message });
    }
};

// 2. Get All Feedback (Admin Only)
exports.getAllFeedback = async (req, res) => {
    try {
        const [feedback] = await db.query(`
            SELECT f.*, u.name as user_name, u.email as user_email, u.role as user_role 
            FROM feedback f
            JOIN users u ON f.user_id = u.id
            ORDER BY f.created_at DESC
        `);
        res.json(feedback);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching feedback', error: error.message });
    }
};

// 3. Get My Feedback (User)
exports.getMyFeedback = async (req, res) => {
    try {
        const [feedback] = await db.query(`
            SELECT * FROM feedback WHERE user_id = ? ORDER BY created_at DESC
        `, [req.user.id]);
        res.json(feedback);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching feedback', error: error.message });
    }
};

// 4. Update Status (Admin Only)
exports.updateFeedbackStatus = async (req, res) => {
    const { status } = req.body;
    const feedbackId = req.params.id;

    if (!['pending', 'acknowledged', 'resolved'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
    }

    try {
        await db.query(`
            UPDATE feedback SET status = ? WHERE id = ?
        `, [status, feedbackId]);

        res.json({ message: 'Feedback status updated' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating status', error: error.message });
    }
};
