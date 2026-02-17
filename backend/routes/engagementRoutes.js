const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middleware/authMiddleware');
const engagementController = require('../controllers/engagementController');

// Review Routes
router.post('/review', protect, engagementController.addReview);
router.get('/reviews/:id', engagementController.getBookReviews);

// Wishlist Routes
router.post('/wishlist', protect, engagementController.toggleWishlist);
router.get('/wishlist', protect, engagementController.getMyWishlist);

// Leaderboard Routes
router.get('/leaderboard', protect, engagementController.getLeaderboard);
router.get('/badges/:userId', protect, engagementController.getUserBadges);

// Lost/Damaged Routes - Handled via IssueController now

module.exports = router;
