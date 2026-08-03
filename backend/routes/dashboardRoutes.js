const express = require('express');
const router = express.Router();
const { getDashboardData, getStats } = require('../controllers/dashboardController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

router.get('/data', authenticateToken, isAdmin, getDashboardData);
router.get('/public-stats', getStats);

module.exports = router;
