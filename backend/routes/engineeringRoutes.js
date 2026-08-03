const express = require('express');
const router = express.Router();
const controller = require('../controllers/engineeringController');
const { protect, authorize } = require('../middleware/authMiddleware');
const multer = require('multer');

// Multer config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, `eng-${Date.now()}-${file.originalname.replace(/\s/g, '_')}`)
});
const fileFilter = (req, file, cb) => {
    const ext = require('path').extname(file.originalname).toLowerCase();
    const allowedExts = ['.zip', '.rar', '.pdf', '.docx', '.pptx', '.jpg', '.png'];

    if (allowedExts.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type! Allowed types: zip/rar/pdf/docx/pptx/jpg/png'), false);
    }
};

const upload = multer({ storage, fileFilter });

// Projects
router.get('/projects', protect, controller.getProjects); // Public search
router.post('/projects', protect, upload.single('file'), controller.createProject); // Student upload

// Placements
router.get('/placements', protect, controller.getPlacements);
router.post('/placements', protect, authorize(['admin', 'teacher', 'hod']), upload.single('file'), controller.createPlacement);

// Resources
router.get('/resources', protect, controller.getResources);
router.get('/bookings', protect, controller.getBookings);
router.post('/bookings', protect, controller.createBooking);

module.exports = router;
