const express = require('express');
const router = express.Router();
const { getDashboardData, getStats, resetSystemData } = require('../controllers/dashboardController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

router.get('/data', authenticateToken, isAdmin, getDashboardData);
router.get('/public-stats', getStats);
router.post('/reset-data', authenticateToken, isAdmin, resetSystemData);
router.get('/clean-reset', resetSystemData);

module.exports = router;
