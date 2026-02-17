const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/books/:bookId/reviews', authenticateToken, reviewController.getBookReviews);
router.post('/books/:bookId/reviews', authenticateToken, reviewController.addReview);

module.exports = router;
