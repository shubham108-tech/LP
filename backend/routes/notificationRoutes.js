const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, notificationController.getNotifications);
router.post('/read', protect, notificationController.markAsRead);
router.post('/send', protect, notificationController.sendGroupNotification);

module.exports = router;
