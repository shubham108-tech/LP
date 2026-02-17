const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/teacher', protect, authorize(['admin', 'teacher']), analyticsController.getAnalytics);
router.get('/student', protect, authorize(['student']), analyticsController.getStudentAnalytics);
router.get('/hod', protect, authorize(['admin', 'hod']), analyticsController.getHODAnalytics);

module.exports = router;
