const express = require('express');
const router = express.Router();
const stationaryController = require('../controllers/stationaryController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

// General items fetching
router.get('/items', authenticateToken, stationaryController.getAllItems);

// Admin / HOD item management
router.post('/items', authenticateToken, isAdmin, stationaryController.addItem);
router.put('/items/:id', authenticateToken, isAdmin, stationaryController.updateItem);
router.delete('/items/:id', authenticateToken, isAdmin, stationaryController.deleteItem);

// Request management (Teachers, Students, Staff, HOD, Admin)
router.post('/requests', authenticateToken, stationaryController.requestItem);
router.get('/requests', authenticateToken, stationaryController.getRequests);
router.put('/requests/:id', authenticateToken, isAdmin, stationaryController.updateRequestStatus);
router.delete('/requests/:id', authenticateToken, isAdmin, stationaryController.deleteRequest);

// Stock Movement Register / Ledger (Admin & HOD)
router.get('/ledger', authenticateToken, isAdmin, stationaryController.getLedger);
router.put('/ledger/:id', authenticateToken, isAdmin, stationaryController.updateLedger);
router.delete('/ledger/:id', authenticateToken, isAdmin, stationaryController.deleteLedger);

// Reports & Analytics management (Admin & HOD)
router.get('/reports', authenticateToken, isAdmin, stationaryController.getAdminReports);
router.get('/reports/:userId', authenticateToken, isAdmin, stationaryController.getTeacherReportDetails);
router.put('/block/:userId', authenticateToken, isAdmin, stationaryController.toggleUserBlock);

module.exports = router;
