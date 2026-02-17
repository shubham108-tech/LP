const express = require('express');
const router = express.Router();
const { getDiscussions, postMessage } = require('../controllers/discussionController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Get all QA for a book (Public for logged in users)
router.get('/:bookId', authenticateToken, getDiscussions);

// Post a new question/answer
router.post('/:bookId', authenticateToken, postMessage);

module.exports = router;
