const multer = require('multer');
const fs = require('fs');
const path = require('path');

const uploadDir = process.env.VERCEL
    ? path.join('/tmp', 'uploads')
    : path.join(__dirname, '../uploads');

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
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
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

module.exports = upload;
