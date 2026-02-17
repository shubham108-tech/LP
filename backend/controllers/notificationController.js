const db = require('../config/db');

// Create a new notification
exports.createNotification = async (userId, message, type = 'info') => {
    try {
        await db.query('INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)', [userId, message, type]);
    } catch (error) {
        console.error('Error creating notification:', error);
    }
};

// Get unread notifications for a user
exports.getNotifications = async (req, res) => {
    try {
        const [notifications] = await db.query('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 10', [req.user.id]);

        // Count unread
        const [unread] = await db.query('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE', [req.user.id]);

        res.json({ notifications, unreadCount: unread[0].count });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching notifications', error: error.message });
    }
};

// Mark as read
exports.markAsRead = async (req, res) => {
    try {
        await db.query('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [req.user.id]);
        res.json({ message: 'Marked all as read' });
    } catch (error) {
        res.status(500).json({ message: 'Error marking notifications', error: error.message });
    }
};
