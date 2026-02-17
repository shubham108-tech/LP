const express = require('express');
const router = express.Router();
const { createSuggestion, getSuggestions } = require('../controllers/suggestionController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

router.post('/', authenticateToken, createSuggestion);
router.get('/', authenticateToken, isAdmin, getSuggestions);

module.exports = router;
