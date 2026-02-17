const db = require('../config/db');

// Get all schedules
exports.getSchedules = async (req, res) => {
    try {
        const [schedules] = await db.query('SELECT * FROM schedules ORDER BY start_time ASC');
        res.json(schedules);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching schedules', error: error.message });
    }
};

// Create schedule
exports.createSchedule = async (req, res) => {
    try {
        const { title, type, start_time, end_time, description, branch } = req.body;

        if (!title || !start_time || !end_time) {
            return res.status(400).json({ message: 'Title, Start and End time required' });
        }

        await db.query(
            `INSERT INTO schedules (title, type, start_time, end_time, description, branch, created_by) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [title, type, start_time, end_time, description, branch, req.user.id]
        );

        res.status(201).json({ message: 'Schedule created' });
    } catch (error) {
        res.status(500).json({ message: 'Error creating schedule', error: error.message });
    }
};

// Delete schedule
exports.deleteSchedule = async (req, res) => {
    try {
        await db.query('DELETE FROM schedules WHERE id = ?', [req.params.id]);
        res.json({ message: 'Schedule deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting schedule', error: error.message });
    }
};
