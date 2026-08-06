const express = require('express');
const router = express.Router();
const stationaryController = require('../controllers/stationaryController');
const { authenticateToken, isAdmin, isStrictAdmin } = require('../middleware/authMiddleware');

// General items fetching
router.get('/items', authenticateToken, stationaryController.getAllItems);

// Admin item management (Only Admin can add, edit, or delete items)
router.post('/items', authenticateToken, isStrictAdmin, stationaryController.addItem);
router.put('/items/:id', authenticateToken, isStrictAdmin, stationaryController.updateItem);
router.delete('/items/:id', authenticateToken, isStrictAdmin, stationaryController.deleteItem);

// Request management (Teachers, Staff, HOD, Admin)
router.post('/requests', authenticateToken, stationaryController.requestItem);
router.get('/requests', authenticateToken, stationaryController.getRequests);
router.put('/requests/:id', authenticateToken, isAdmin, stationaryController.updateRequestStatus);
router.delete('/requests/:id', authenticateToken, isStrictAdmin, stationaryController.deleteRequest);

// Stock Movement Register / Ledger (Admin & HOD can view, Only Admin can edit/delete)
router.get('/ledger', authenticateToken, isAdmin, stationaryController.getLedger);
router.put('/ledger/:id', authenticateToken, isStrictAdmin, stationaryController.updateLedger);
router.delete('/ledger/:id', authenticateToken, isStrictAdmin, stationaryController.deleteLedger);

// Reports & Analytics management (Admin & HOD)
router.get('/reports', authenticateToken, isAdmin, stationaryController.getAdminReports);
router.get('/reports/:userId', authenticateToken, isAdmin, stationaryController.getTeacherReportDetails);
router.put('/block/:userId', authenticateToken, isAdmin, stationaryController.toggleUserBlock);

module.exports = router;
