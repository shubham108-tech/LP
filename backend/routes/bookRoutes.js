const express = require('express');
const router = express.Router();
const { getAllBooks, addBook, updateBook, deleteBook } = require('../controllers/bookController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

const multer = require('multer');
const diskUpload = require('../middleware/uploadMiddleware'); // For images
const memoryUpload = multer({ storage: multer.memoryStorage() }); // For bulk files (PDF/Excel)

// 10. router.get('/', authenticateToken, getAllBooks);
// 11. router.post('/', authenticateToken, isAdmin, diskUpload.fields([{ name: 'image', maxCount: 1 }, { name: 'pdf', maxCount: 1 }]), addBook);
// 12. router.post('/bulk-upload', authenticateToken, isAdmin, memoryUpload.single('file'), require('../controllers/bookController').bulkUploadBooks);
// 13. router.post('/bulk-preview', authenticateToken, isAdmin, memoryUpload.single('file'), require('../controllers/bookController').previewBulkUpload);
// 14. router.put('/:id', authenticateToken, isAdmin, diskUpload.fields([{ name: 'image', maxCount: 1 }, { name: 'pdf', maxCount: 1 }]), updateBook);

router.get('/', authenticateToken, getAllBooks);
router.post('/', authenticateToken, isAdmin, diskUpload.fields([{ name: 'image', maxCount: 1 }, { name: 'pdf', maxCount: 1 }]), addBook);
router.post('/bulk-upload', authenticateToken, isAdmin, memoryUpload.single('file'), require('../controllers/bookController').bulkUploadBooks);
router.post('/bulk-preview', authenticateToken, isAdmin, memoryUpload.single('file'), require('../controllers/bookController').previewBulkUpload);
router.put('/:id', authenticateToken, isAdmin, diskUpload.fields([{ name: 'image', maxCount: 1 }, { name: 'pdf', maxCount: 1 }]), updateBook);
router.delete('/:id', authenticateToken, isAdmin, deleteBook);
router.post('/bulk-delete', authenticateToken, isAdmin, require('../controllers/bookController').bulkDeleteBooks);

router.post('/:id/highlights', authenticateToken, require('../controllers/bookController').saveHighlight);
router.get('/:id/highlights', authenticateToken, require('../controllers/bookController').getHighlights);

module.exports = router;
