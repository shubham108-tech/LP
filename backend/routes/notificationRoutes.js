const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

// SSE stream — authenticated via ?token= query param (EventSource limitation)
router.get('/stream', notificationController.streamNotifications);

router.get('/', protect, notificationController.getNotifications);
router.post('/read', protect, notificationController.markAsRead);
router.post('/send', protect, notificationController.sendGroupNotification);

module.exports = router;
