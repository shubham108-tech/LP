const express = require('express');
const router = express.Router();
const { register, login, getAllUsers } = require('../controllers/authController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

const multer = require('multer');
const path = require('path');
const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedImageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const allowedDocExts = ['.pdf', '.xlsx', '.xls', '.csv'];

    if (file.mimetype.startsWith('image/') && allowedImageExts.includes(ext)) {
        cb(null, true);
    } else if ((file.mimetype === 'application/pdf' && ext === '.pdf') ||
        (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' && ext === '.xlsx') ||
        (file.mimetype === 'application/vnd.ms-excel' && ext === '.xls') ||
        (file.mimetype === 'text/csv' && ext === '.csv')) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type! Only JPG, PNG, GIF, WEBP, PDF, XLSX, XLS, and CSV are allowed.'), false);
    }
};

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: fileFilter
});


router.post('/register', register);
router.post('/users', authenticateToken, isAdmin, upload.single('profile_image'), require('../controllers/authController').createUser);
router.post('/register/bulk', authenticateToken, isAdmin, upload.single('file'), require('../controllers/authController').bulkRegister);
router.post('/login', login);
router.post('/verify-otp', require('../controllers/authController').verifyOTP);
router.post('/resend-otp', require('../controllers/authController').resendOTP);
router.get('/users', authenticateToken, isAdmin, getAllUsers);
router.put('/users/:id', authenticateToken, isAdmin, require('../controllers/authController').updateUser);
router.delete('/users/:id', authenticateToken, isAdmin, require('../controllers/authController').deleteUser);
router.put('/profile', authenticateToken, upload.single('profile_image'), require('../controllers/authController').updateProfile);

module.exports = router;
