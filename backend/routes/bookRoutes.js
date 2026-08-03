const express = require('express');
const router = express.Router();
const { getAllBooks, addBook, updateBook, deleteBook } = require('../controllers/bookController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

const multer = require('multer');
const diskUpload = require('../middleware/uploadMiddleware'); // For images
const memoryUpload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        const ext = require('path').extname(file.originalname).toLowerCase();
        if ((file.mimetype === 'application/pdf' && ext === '.pdf') ||
            (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' && ext === '.xlsx') ||
            (file.mimetype === 'application/vnd.ms-excel' && ext === '.xls') ||
            (file.mimetype === 'text/csv' && ext === '.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type! Only PDF, XLSX, XLS, and CSV are allowed.'), false);
        }
    }
}); // For bulk files (PDF/Excel)

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
