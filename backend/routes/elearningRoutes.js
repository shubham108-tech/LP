const express = require('express');
const router = express.Router();
const multer = require('multer');
const elearningController = require('../controllers/elearningController');
const { protect, authorize } = require('../middleware/authMiddleware');

const fs = require('fs');
const path = require('path');
const uploadDir = path.join(__dirname, '../uploads');

// Multer config for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `elearning-${Date.now()}-${file.originalname.replace(/\s/g, '_')}`);
    }
});

const fileFilter = (req, file, cb) => {
    const ext = require('path').extname(file.originalname).toLowerCase();
    const allowedExts = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.zip', '.rar'];

    if (allowedExts.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type! Only PDF, DOC, PPT, TXT, and Archive files are allowed.'), false);
    }
};

const upload = multer({ storage, fileFilter });

// ========================
// NOTES ROUTES
// ========================

// Get all notes (Public or Protected?)
router.get('/notes', protect, elearningController.getNotes);

// Create Note (Teacher/Admin only)
router.post('/notes', protect, authorize(['admin', 'teacher']), upload.single('file'), elearningController.createNote);

// Update Note (Teacher/Admin only)
router.put('/notes/:id', protect, authorize(['admin', 'teacher']), upload.single('file'), elearningController.updateNote);

// Delete Note (Teacher/Admin only)
router.delete('/notes/:id', protect, authorize(['admin', 'teacher']), elearningController.deleteNote);


// ========================
// ASSIGNMENT ROUTES
// ========================

// Get assignments
router.get('/assignments', protect, elearningController.getAssignments);

// Create Assignment (Teacher/Admin)
router.post('/assignments', protect, authorize(['admin', 'teacher']), elearningController.createAssignment);

// Submit Assignment (Student)
router.post('/assignments/:id/submit', protect, authorize(['student']), upload.single('file'), elearningController.submitAssignment);

// Get Submissions (Teacher/Admin)
router.get('/assignments/:id/submissions', protect, authorize(['admin', 'teacher']), elearningController.getSubmissions);

// Grade Submission (Teacher/Admin)
router.post('/assignments/submissions/:submission_id/grade', protect, authorize(['admin', 'teacher']), elearningController.gradeSubmission);


module.exports = router;
