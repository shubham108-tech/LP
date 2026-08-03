const db = require('../config/db');

// ========================
// PROJECTS
// ========================
exports.getProjects = async (req, res) => {
    try {
        const { type, branch, year } = req.query;
        let query = 'SELECT * FROM projects WHERE 1=1';
        let params = [];

        if (type) {
            query += ' AND type = ?';
            params.push(type);
        }

        // Branch Enforcement
        if ((req.user.role === 'hod' || req.user.role === 'student' || req.user.role === 'teacher') && req.user.branch) {
            query += ' AND branch = ?';
            params.push(req.user.branch);
            if (req.user.division) {
                query += ' AND division = ?';
                params.push(req.user.division);
            }
        } else if (branch) {
            query += ' AND branch = ?';
            params.push(branch);
        }

        if (year) {
            query += ' AND year = ?';
            params.push(year);
        }
        query += ' ORDER BY created_at DESC';

        const [results] = await db.query(query, params);
        res.json(results);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.createProject = async (req, res) => {
    try {
        const { title, description, student_names, branch, year, division, type } = req.body;
        let file_url = null;
        if (req.file) {
            file_url = req.file.path; // Assuming multer saves path
        }

        await db.query(
            'INSERT INTO projects (title, description, student_names, branch, year, division, type, file_url, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [title, description, student_names, branch, year, division || null, type, file_url, req.user.id]
        );
        res.status(201).json({ message: 'Project uploaded successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ========================
// PLACEMENTS
// ========================
exports.getPlacements = async (req, res) => {
    try {
        const { type } = req.query;
        let query = 'SELECT * FROM placements';
        let params = [];
        if (type) {
            query += ' WHERE type = ?';
            params.push(type);
        }
        query += ' ORDER BY created_at DESC';
        const [results] = await db.query(query, params);
        res.json(results);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.createPlacement = async (req, res) => {
    try {
        const { title, company_name, type, content } = req.body;
        let file_url = null;
        if (req.file) {
            file_url = req.file.path;
        }

        await db.query(
            'INSERT INTO placements (title, company_name, type, content, file_url) VALUES (?, ?, ?, ?, ?)',
            [title, company_name, type, content, file_url]
        );
        res.status(201).json({ message: 'Placement resource added' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ========================
// RESOURCES & BOOKING
// ========================
exports.getResources = async (req, res) => {
    try {
        const [results] = await db.query('SELECT * FROM resources');
        res.json(results);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.createBooking = async (req, res) => {
    try {
        const { resource_id, start_time, end_time, purpose } = req.body;

        // Check for conflicts
        const [conflicts] = await db.query(
            'SELECT * FROM bookings WHERE resource_id = ? AND status = "approved" AND ((start_time <= ? AND end_time >= ?) OR (start_time <= ? AND end_time >= ?))',
            [resource_id, end_time, start_time, end_time, start_time] // Overlap check logic simplified
        );

        if (conflicts.length > 0) {
            return res.status(400).json({ message: 'Resource already booked for this time slot.' });
        }

        await db.query(
            'INSERT INTO bookings (resource_id, user_id, start_time, end_time, purpose) VALUES (?, ?, ?, ?, ?)',
            [resource_id, req.user.id, start_time, end_time, purpose]
        );
        res.status(201).json({ message: 'Booking request submitted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getBookings = async (req, res) => {
    try {
        let query = `
            SELECT b.*, r.name as resource_name, u.name as user_name 
            FROM bookings b 
            JOIN resources r ON b.resource_id = r.id 
            JOIN users u ON b.user_id = u.id 
            ORDER BY b.start_time DESC
        `;
        // If student, filter by their ID? Or maybe let them see their ownbookings?
        // Let's assume this is for Admin/Teacher view or general view.
        if (req.user.role === 'student') {
            query = `
                SELECT b.*, r.name as resource_name 
                FROM bookings b 
                JOIN resources r ON b.resource_id = r.id 
                WHERE b.user_id = ? 
                ORDER BY b.start_time DESC
            `;
            const [results] = await db.query(query, [req.user.id]);
            return res.json(results);
        }

        const [results] = await db.query(query);
        res.json(results);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
