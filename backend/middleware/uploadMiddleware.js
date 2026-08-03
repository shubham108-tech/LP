const multer = require('multer');
const path = require('path');

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedImageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const allowedDocExts = ['.pdf', '.xlsx', '.xls', '.csv'];

    if (file.mimetype.startsWith('image/') && allowedImageExts.includes(ext)) {
        cb(null, true);
    } else if ((file.mimetype === 'application/pdf' && ext === '.pdf') ||
        (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' && ext === '.xlsx') ||
        (file.mimetype === 'application/vnd.ms-excel' && ext === '.xls') ||
        (file.mimetype === 'text/csv' && ext === '.csv')) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type! Only JPG, PNG, GIF, WEBP, PDF, XLSX, XLS, and CSV are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

module.exports = upload;
