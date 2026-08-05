const express = require('express');
const router = express.Router();
const moduleController = require('../controllers/moduleController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

// Public/Authenticated GET route so Sidebar and components can check module status
router.get('/', moduleController.getModules);

// Admin-only PUT route to toggle modules
router.put('/', authenticateToken, isAdmin, moduleController.updateModules);

module.exports = router;
