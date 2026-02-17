const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/', protect, feedbackController.createFeedback);
router.get('/', protect, authorize(['admin', 'hod']), feedbackController.getAllFeedback);
router.get('/my', protect, feedbackController.getMyFeedback);
router.put('/:id', protect, authorize(['admin', 'hod']), feedbackController.updateFeedbackStatus);

module.exports = router;
