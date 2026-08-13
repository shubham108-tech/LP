const db = require('../config/db');
const jwt = require('jsonwebtoken');

// ============================================================
// SSE Connection Store — maps userId -> Set of response objects
// ============================================================
const sseClients = new Map(); // userId (string) -> Set<res>

/**
 * Register an SSE client for a userId.
 * Automatically removes itself on disconnect.
 */
const registerSSEClient = (userId, res) => {
    const key = String(userId);
    if (!sseClients.has(key)) sseClients.set(key, new Set());
    sseClients.get(key).add(res);
};

const unregisterSSEClient = (userId, res) => {
    const key = String(userId);
    if (sseClients.has(key)) {
        sseClients.get(key).delete(res);
        if (sseClients.get(key).size === 0) sseClients.delete(key);
    }
};

/**
 * Broadcast a JSON payload to all open SSE connections for userId.
 */
const broadcastToUser = (userId, data) => {
    const key = String(userId);
    const clients = sseClients.get(key);
    if (!clients || clients.size === 0) return;
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    for (const res of clients) {
        try {
            res.write(payload);
        } catch (e) {
            // Client disconnected mid-send
        }
    }
};

// Create a new notification + broadcast via SSE
exports.createNotification = async (userId, message, type = 'info') => {
    try {
        const [result] = await db.query(
            'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
            [userId, message, type]
        );
        // Broadcast to SSE client immediately
        broadcastToUser(userId, {
            event: 'notification',
            notification: {
                id: result.insertId,
                user_id: userId,
                message,
                type,
                is_read: false,
                created_at: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error creating notification:', error);
    }
};

// Notify all Admins and HODs + SSE push
exports.notifyAdmins = async (message, type = 'info') => {
    try {
        const [admins] = await db.query("SELECT id FROM users WHERE LOWER(role) = 'admin' OR LOWER(role) = 'hod'");
        if (admins && admins.length > 0) {
            for (const admin of admins) {
                const [result] = await db.query(
                    'INSERT INTO notifications (user_id, message, type, is_read) VALUES (?, ?, ?, ?)',
                    [admin.id, message, type, false]
                );
                broadcastToUser(admin.id, {
                    event: 'notification',
                    notification: {
                        id: result.insertId,
                        user_id: admin.id,
                        message,
                        type,
                        is_read: false,
                        created_at: new Date().toISOString()
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error sending admin notification:', error);
    }
};

// SSE Stream endpoint — GET /api/notifications/stream
exports.streamNotifications = (req, res) => {
    // Authenticate via query token (EventSource doesn't support custom headers)
    const token = req.query.token;
    if (!token) {
        res.status(401).end();
        return;
    }

    let userId;
    try {
        const secret = process.env.JWT_SECRET || 'development_secret_key_123';
        const decoded = jwt.verify(token, secret);
        userId = decoded.id || decoded.userId;
    } catch (e) {
        res.status(403).end();
        return;
    }

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();

    // Send initial connected event
    res.write(`data: ${JSON.stringify({ event: 'connected', userId })}\n\n`);

    // Register
    registerSSEClient(userId, res);

    // Heartbeat every 25s to keep connection alive
    const heartbeat = setInterval(() => {
        try {
            res.write(': heartbeat\n\n');
        } catch (e) {
            clearInterval(heartbeat);
        }
    }, 25000);

    // Cleanup on client disconnect
    req.on('close', () => {
        clearInterval(heartbeat);
        unregisterSSEClient(userId, res);
    });
};

// Get unread notifications for a user
exports.getNotifications = async (req, res) => {
    try {
        const [notifications] = await db.query('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', [req.user.id]);

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
        const { message, targetRole, userId, branch, year, division } = req.body;

        if (!message) return res.status(400).json({ message: 'Message is required' });

        let query = "SELECT id FROM users WHERE 1=1";
        let params = [];

        if (userId) {
            query += ' AND id = ?';
            params.push(userId);
        } else {
            if (targetRole && targetRole !== 'all') {
                query += ' AND role = ?';
                params.push(targetRole);
            } else if (!targetRole) {
                // Default backward compatibility
                query += " AND role = 'student'";
            }

            // If sender is a teacher/HOD, enforce their branch (unless they are admin)
            if (req.user.role === 'teacher' || req.user.role === 'hod') {
                if (req.user.branch) {
                    query += ' AND branch = ?';
                    params.push(req.user.branch);
                } else if (branch) {
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
        }

        const [targets] = await db.query(query, params);

        if (targets.length === 0) {
            return res.status(404).json({ message: 'No users found for the selected criteria' });
        }

        // Bulk insert notifications
        const values = targets.map(t => [t.id, message, 'notice', false]);
        await db.query('INSERT INTO notifications (user_id, message, type, is_read) VALUES ?', [values]);

        // SSE push to each target
        for (const t of targets) {
            broadcastToUser(t.id, {
                event: 'notification',
                notification: { user_id: t.id, message, type: 'notice', is_read: false, created_at: new Date().toISOString() }
            });
        }

        res.status(201).json({ message: `Notice sent to ${targets.length} users` });

    } catch (error) {
        res.status(500).json({ message: 'Error sending notice', error: error.message });
    }
};

// Export broadcast helper for use in other controllers
module.exports.broadcastToUser = broadcastToUser;
