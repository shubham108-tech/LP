const express = require('express');
const router = express.Router();
const { register, login, getAllUsers } = require('../controllers/authController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

const multer = require('multer');
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
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
