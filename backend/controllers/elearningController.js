const db = require('../config/db');
const fs = require('fs');
const path = require('path');

// =======================
// NOTES CONTROLS
// =======================

// Get all notes (optionally filter by branch/subject)
exports.getNotes = async (req, res) => {
    try {
        let query = 'SELECT notes.*, users.name as uploader_name FROM notes LEFT JOIN users ON notes.uploaded_by = users.id';
        const params = [];
        const conditions = [];

        // If teacher, show only their own notes
        if (req.user.role === 'teacher') {
            conditions.push('notes.uploaded_by = ?');
            params.push(req.user.id);
        }

        // Simple filter logic (can be expanded)
        if (req.query.subject) {
            conditions.push('subject LIKE ?');
            params.push(`%${req.query.subject}%`);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY created_at DESC';

        const [notes] = await db.query(query, params);
        res.json(notes);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching notes', error: error.message });
    }
};

// Upload a note
exports.createNote = async (req, res) => {
    try {
        const { title, description, subject, branch, resource_type, video_url } = req.body;
        const file = req.file;

        if (!title) {
            return res.status(400).json({ message: 'Title is required' });
        }

        let finalFileUrl = null;
        let finalResourceType = resource_type || 'file'; // Default to file

        if (finalResourceType === 'video') {
            if (!video_url) return res.status(400).json({ message: 'Video URL is required for video type' });
            // Basic URL validation could go here
        } else {
            // Document type
            if (!file) return res.status(400).json({ message: 'File is required for document type' });
            finalFileUrl = `uploads/${file.filename}`;
        }

        await db.query(
            'INSERT INTO notes (title, description, file_url, video_url, resource_type, subject, category, branch, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [title, description, finalFileUrl, video_url, finalResourceType, subject, req.body.category || 'General', branch, req.user.id]
        );

        res.status(201).json({ message: 'Resource shared successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error sharing resource', error: error.message });
    }
};

// Update a note
exports.updateNote = async (req, res) => {
    try {
        const noteId = req.params.id;
        const { title, description, subject, branch, category, resource_type, video_url } = req.body;
        const file = req.file;

        // Check existence and ownership
        const [existing] = await db.query('SELECT uploaded_by, file_url FROM notes WHERE id = ?', [noteId]);
        if (existing.length === 0) return res.status(404).json({ message: 'Note not found' });

        if (req.user.role === 'teacher' && existing[0].uploaded_by !== req.user.id) {
            return res.status(403).json({ message: 'You can only edit your own resources' });
        }

        let finalFileUrl = existing[0].file_url;
        let finalResourceType = resource_type || 'file';

        // Handle file replacement if new file uploaded
        if (file) {
            if (existing[0].file_url) {
                const oldPath = path.join(__dirname, '..', existing[0].file_url);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
            finalFileUrl = `uploads/${file.filename}`;
            finalResourceType = 'file'; // Force type if file uploaded
        }

        await db.query(
            `UPDATE notes SET 
                title = ?, description = ?, subject = ?, branch = ?, category = ?, 
                resource_type = ?, video_url = ?, file_url = ? 
             WHERE id = ?`,
            [title, description, subject, branch, category || 'General', finalResourceType, video_url, finalFileUrl, noteId]
        );

        res.json({ message: 'Note updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating note', error: error.message });
    }
};

// Delete a note
exports.deleteNote = async (req, res) => {
    try {
        const noteId = req.params.id;

        // First get note to delete file
        const [notes] = await db.query('SELECT uploaded_by, file_url, resource_type FROM notes WHERE id = ?', [noteId]);
        if (notes.length === 0) return res.status(404).json({ message: 'Note not found' });

        // Ownership check for teachers
        if (req.user.role === 'teacher' && notes[0].uploaded_by !== req.user.id) {
            return res.status(403).json({ message: 'You can only delete your own resources' });
        }

        // Delete from DB
        await db.query('DELETE FROM notes WHERE id = ?', [noteId]);

        // Delete File if it exists and is a file type
        if (notes[0].resource_type === 'file' && notes[0].file_url) {
            const filePath = path.join(__dirname, '..', notes[0].file_url);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        res.json({ message: 'Resource deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting resource', error: error.message });
    }
};

// =======================
// ASSIGNMENT CONTROLS
// =======================

// Get assignments
exports.getAssignments = async (req, res) => {
    try {
        let query = 'SELECT assignments.*, users.name as creator_name FROM assignments LEFT JOIN users ON assignments.created_by = users.id';
        let params = [];

        // If teacher, show only their own assignments
        if (req.user.role === 'teacher') {
            query += ' WHERE assignments.created_by = ?';
            params.push(req.user.id);
        }

        query += ' ORDER BY due_date ASC';

        const [assignments] = await db.query(query, params);
        res.json(assignments);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching assignments', error: error.message });
    }
};

// Create assignment
exports.createAssignment = async (req, res) => {
    try {
        const { title, description, due_date, subject, branch } = req.body;

        if (!title || !due_date) {
            return res.status(400).json({ message: 'Title and due date are required' });
        }

        await db.query(
            'INSERT INTO assignments (title, description, due_date, subject, branch, created_by) VALUES (?, ?, ?, ?, ?, ?)',
            [title, description, due_date, subject, branch, req.user.id]
        );

        res.status(201).json({ message: 'Assignment created successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error creating assignment', error: error.message });
    }
};

// Submit assignment (Student)
exports.submitAssignment = async (req, res) => {
    try {
        const { assignment_id } = req.params;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: 'File is required' });
        }

        // Check if already submitted
        const [existing] = await db.query('SELECT id FROM assignment_submissions WHERE assignment_id = ? AND student_id = ?', [assignment_id, req.user.id]);

        const file_url = `uploads/${file.filename}`;

        if (existing.length > 0) {
            // Update submission
            await db.query(
                'UPDATE assignment_submissions SET file_url = ?, submitted_at = NOW() WHERE id = ?',
                [file_url, existing[0].id]
            );
            res.json({ message: 'Submission updated' });
        } else {
            // New submission
            await db.query(
                'INSERT INTO assignment_submissions (assignment_id, student_id, file_url) VALUES (?, ?, ?)',
                [assignment_id, req.user.id, file_url]
            );
            res.status(201).json({ message: 'Assignment submitted' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error submitting assignment', error: error.message });
    }
};

// Get submissions for an assignment (Teacher)
exports.getSubmissions = async (req, res) => {
    try {
        const { assignment_id } = req.params;

        // Security Check: If teacher, ensure they own the assignment
        if (req.user.role === 'teacher') {
            const [assignment] = await db.query('SELECT created_by FROM assignments WHERE id = ?', [assignment_id]);
            if (assignment.length === 0) return res.status(404).json({ message: 'Assignment not found' });
            if (assignment[0].created_by !== req.user.id) {
                return res.status(403).json({ message: 'You can only view submissions for your own assignments' });
            }
        }

        const [submissions] = await db.query(`
            SELECT s.*, u.name as student_name, u.email as student_email 
            FROM assignment_submissions s 
            JOIN users u ON s.student_id = u.id 
            WHERE s.assignment_id = ?`,
            [assignment_id]
        );
        res.json(submissions);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching submissions', error: error.message });
    }
};

// Grade a submission
exports.gradeSubmission = async (req, res) => {
    try {
        const { submission_id } = req.params;
        const { grade, feedback } = req.body;

        if (grade === undefined) {
            return res.status(400).json({ message: 'Grade is required' });
        }

        // Security Check: If teacher, ensure they own the parent assignment
        if (req.user.role === 'teacher') {
            const [submission] = await db.query(`
                SELECT a.created_by 
                FROM assignment_submissions s 
                JOIN assignments a ON s.assignment_id = a.id 
                WHERE s.id = ?`, [submission_id]);

            if (submission.length === 0) return res.status(404).json({ message: 'Submission not found' });
            if (submission[0].created_by !== req.user.id) {
                return res.status(403).json({ message: 'You can only grade submissions for your own assignments' });
            }
        }

        await db.query(
            'UPDATE assignment_submissions SET grade = ?, feedback = ? WHERE id = ?',
            [grade, feedback, submission_id]
        );

        res.json({ message: 'Graded successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error grading submission', error: error.message });
    }
};
