const express = require('express');
const router = express.Router();
const { getAllIssues, getMyIssues, returnBook, generateIssueReport } = require('../controllers/issueController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

router.get('/report', authenticateToken, isAdmin, generateIssueReport);
router.get('/admin', authenticateToken, isAdmin, getAllIssues);
router.get('/history/:userId', authenticateToken, isAdmin, require('../controllers/issueController').getUserHistory);
router.get('/my', authenticateToken, getMyIssues);
router.put('/return/:id', authenticateToken, isAdmin, returnBook);

module.exports = router;
