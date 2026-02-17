const express = require('express');
const router = express.Router();
const { getDashboardData } = require('../controllers/dashboardController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

router.get('/data', authenticateToken, isAdmin, getDashboardData); // Changed from /stats to /data or keep /stats but point to new function

module.exports = router;
