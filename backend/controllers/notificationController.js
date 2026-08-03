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

// Send Group Notification (Teacher/Admin)
exports.sendGroupNotification = async (req, res) => {
    try {
        const { message, branch, year, division } = req.body;

        if (!message) return res.status(400).json({ message: 'Message is required' });

        let query = 'SELECT id FROM users WHERE role = "student"';
        let params = [];

        // If sender is a teacher/HOD, enforce their branch (unless they are admin)
        if (req.user.role === 'teacher' || req.user.role === 'hod') {
            if (req.user.branch) {
                // Override/Set branch to sender's branch
                query += ' AND branch = ?';
                params.push(req.user.branch);
            } else if (branch) {
                // If teacher has no branch set (unlikely for HOD but possible), use requested branch
                query += ' AND branch = ?';
                params.push(branch);
            }
        } else {
            // Admin can send to any branch
            if (branch) {
                query += ' AND branch = ?';
                params.push(branch);
            }
        }

        if (year) {
            query += ' AND year = ?';
            params.push(year);
        }

        if (division) {
            query += ' AND division = ?';
            params.push(division);
        }

        const [students] = await db.query(query, params);

        if (students.length === 0) {
            return res.status(404).json({ message: 'No students found for the selected criteria' });
        }

        // Bulk insert notifications
        const values = students.map(s => [s.id, message, 'notice', false]);
        await db.query('INSERT INTO notifications (user_id, message, type, is_read) VALUES ?', [values]);

        // Log the sent notice for the sender (optional, maybe in a separate 'sent_notices' table later, but for now just acknowledge)
        res.status(201).json({ message: `Notice sent to ${students.length} students` });

    } catch (error) {
        res.status(500).json({ message: 'Error sending notice', error: error.message });
    }
};
