const express = require('express');
const router = express.Router();
const { placeRequest, getAllRequests, getUserRequests, updateRequestStatus } = require('../controllers/requestController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

router.post('/', authenticateToken, placeRequest);
router.get('/', authenticateToken, isAdmin, getAllRequests);
router.get('/my', authenticateToken, getUserRequests);
router.put('/:id', authenticateToken, isAdmin, updateRequestStatus);

module.exports = router;
