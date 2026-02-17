const express = require('express');
const router = express.Router();
const gamificationController = require('../controllers/gamificationController');
const { protect } = require('../middleware/authMiddleware');

router.get('/leaderboard', protect, gamificationController.getLeaderboard);

module.exports = router;
