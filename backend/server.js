const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path'); // ✅ ADDED: React dist serve karne ke liye
const fs = require('fs');

dotenv.config();

const authRoutes = require('./routes/authRoutes');
const bookRoutes = require('./routes/bookRoutes');
const requestRoutes = require('./routes/requestRoutes');
const issueRoutes = require('./routes/issueRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const suggestionRoutes = require('./routes/suggestionRoutes');
const discussionRoutes = require('./routes/discussionRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const elearningRoutes = require('./routes/elearningRoutes');
const examRoutes = require('./routes/examRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

const app = express();
app.set('trust proxy', 1);
app.disable('etag');

// Disable browser caching for dynamic API responses to prevent 304 Not Modified
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

// Middleware
const allowedOrigins = [
  'https://shubham108-tech.github.io',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, true); // Allow all during development/production transition
  },
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get(['/seed', '/api/seed'], async (req, res) => {
    try {
        const db = require('./config/db');
        const [books] = await db.query('SELECT COUNT(*) FROM books');
        const [users] = await db.query('SELECT COUNT(*) FROM users');
        const [stat] = await db.query('SELECT COUNT(*) FROM stationary_items');
        res.json({
            status: "success",
            message: "Database check & seed completed!",
            counts: {
                users: users[0]?.count || users[0]?.['count'] || users[0]?.['COUNT(*)'] || users.length,
                books: books[0]?.count || books[0]?.['count'] || books[0]?.['COUNT(*)'] || books.length,
                stationary: stat[0]?.count || stat[0]?.['count'] || stat[0]?.['COUNT(*)'] || stat.length
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get(['/reset', '/api/reset', '/api/clean-reset'], async (req, res) => {
    try {
        const db = require('./config/db');
        await db.resetData();
        res.json({
            status: "success",
            message: "Database 100% reset completed! All books, students, teachers wiped clean.",
            counts: { users: 1, books: 0, stationary: 0 }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const { authenticateToken } = require('./middleware/authMiddleware');

const uploadsPath = process.env.VERCEL ? '/tmp/uploads' : path.join(__dirname, 'uploads');
app.use('/uploads', (req, res, next) => {
    const ext = path.extname(req.path).toLowerCase();
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

    if (imageExts.includes(ext)) {
        return next();
    }

    authenticateToken(req, res, next);
}, express.static(uploadsPath), express.static(path.join(__dirname, 'uploads')));

const rateLimit = require('express-rate-limit');

// Rate Limits
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: { message: 'Too many login attempts. Try again later.' },
    validate: { xForwardedForHeader: false }
});

const otpLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: { message: 'Too many OTP requests. Try again later.' },
    validate: { xForwardedForHeader: false }
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: { message: 'Too many requests. Try again later.' },
    validate: { xForwardedForHeader: false }
});

// Apply Rate Limits
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', otpLimiter); // Protect public register OTP
app.use('/api/auth/resend-otp', otpLimiter); // Protect public resend OTP
// The rest (like bulk upload, user list) will fall under apiLimiter
app.use('/api', apiLimiter);

const engagementRoutes = require('./routes/engagementRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/admin', dashboardRoutes);
app.use('/api/suggestions', suggestionRoutes);
app.use('/api/discussions', discussionRoutes);
app.use('/api', reviewRoutes);
app.use('/api/engineering', require('./routes/engineeringRoutes'));
app.use('/api/elearning', elearningRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/engagement', engagementRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/feedback', require('./routes/feedbackRoutes'));
app.use('/api/gamification', require('./routes/gamificationRoutes'));
app.use('/api/stationary', require('./routes/stationaryRoutes'));
app.use('/api/modules', require('./routes/moduleRoutes'));

// WhatsApp Web Integration Routes
const { getStatus: getWhatsAppStatus, sendWhatsAppMessage } = require('./utils/whatsapp');

// Get WhatsApp Status JSON
app.get(['/api/whatsapp/status', '/whatsapp/status'], (req, res) => {
    res.json(getWhatsAppStatus());
});

// Serve WhatsApp QR Code in Browser
app.get(['/qr', '/api/whatsapp/qr'], (req, res) => {
    const status = getWhatsAppStatus();
    if (status.isReady) {
        return res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>WhatsApp Status - Connected</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; text-align: center; }
                    .card { background: #1e293b; padding: 2.5rem; border-radius: 1rem; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); max-width: 400px; border: 1px solid #334155; }
                    .icon { font-size: 4rem; margin-bottom: 1rem; }
                    h2 { color: #22c55e; margin-top: 0; }
                    p { color: #94a3b8; line-height: 1.5; }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="icon">✅</div>
                    <h2>WhatsApp Connected!</h2>
                    <p>Aapka WhatsApp successfully authenticated aur backend server se linked hai.</p>
                </div>
            </body>
            </html>
        `);
    }

    if (!status.qrDataUrl) {
        return res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>WhatsApp QR - Generating...</title>
                <meta http-equiv="refresh" content="3">
                <style>
                    body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; text-align: center; }
                    .card { background: #1e293b; padding: 2rem; border-radius: 1rem; max-width: 400px; border: 1px solid #334155; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h2>⌛ Generating WhatsApp QR Code...</h2>
                    <p>Please wait 3 seconds, page will auto-refresh.</p>
                </div>
            </body>
            </html>
        `);
    }

    return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Scan WhatsApp QR Code</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="refresh" content="10">
            <style>
                body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; text-align: center; }
                .card { background: #1e293b; padding: 2rem; border-radius: 1.5rem; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); max-width: 420px; border: 1px solid #334155; }
                h2 { color: #38bdf8; margin-top: 0; margin-bottom: 0.5rem; }
                p { color: #94a3b8; font-size: 0.95rem; margin-bottom: 1.5rem; }
                .qr-container { background: white; padding: 1rem; border-radius: 1rem; display: inline-block; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3); }
                img { width: 260px; height: 260px; display: block; }
                .instructions { text-align: left; background: #0f172a; padding: 1rem; border-radius: 0.75rem; margin-top: 1.5rem; font-size: 0.85rem; color: #cbd5e1; border: 1px solid #334155; }
                .instructions ol { margin: 0; padding-left: 1.2rem; }
                .instructions li { margin-bottom: 0.4rem; }
            </style>
        </head>
        <body>
            <div class="card">
                <h2>📱 Scan WhatsApp QR Code</h2>
                <p>Scan this QR code to connect WhatsApp Notifications to the Library System.</p>
                <div class="qr-container">
                    <img src="${status.qrDataUrl}" alt="WhatsApp QR Code" />
                </div>
                <div class="instructions">
                    <ol>
                        <li>Apne mobile me <b>WhatsApp</b> open karein.</li>
                        <li><b>Settings</b> ya 3-Dots Menu par tap karein.</li>
                        <li><b>Linked Devices (लिंक किए गए डिवाइस)</b> par click karein.</li>
                        <li><b>Link a Device</b> button daba kar is QR code ko scan karein.</li>
                    </ol>
                </div>
            </div>
        </body>
        </html>
    `);
});

// Endpoint to trigger test WhatsApp message to Admin
app.post(['/api/whatsapp/test', '/api/admin/test-whatsapp', '/whatsapp/test', '/admin/test-whatsapp', '/api/api/whatsapp/test'], async (req, res) => {
    try {
        const { phone, message } = req.body;
        const msgText = message || `🔔 Library System Test WhatsApp Notification!\nTime: ${new Date().toLocaleString()}\nSystem status: Active & Connected!`;
        const target = phone || process.env.ADMIN_PHONE_NUMBER;

        const result = await sendWhatsAppMessage(msgText, target);
        if (result) {
            res.json({ status: 'success', message: 'Test WhatsApp message sent successfully!', target });
        } else {
            const status = getWhatsAppStatus();
            res.status(400).json({
                status: 'error',
                message: status.isReady ? 'Failed to send WhatsApp message' : 'WhatsApp Client is not ready or QR Code is not scanned yet.',
                whatsappStatus: status
            });
        }
    } catch (err) {
        res.status(500).json({ status: 'error', error: err.message });
    }
});



// ===================================================
// ✅ ADDED: React Frontend Serve Karne Ka Code
app.get('/', async (req, res) => {
    try {
        const db = require('./config/db');
        const [books] = await db.query('SELECT COUNT(*) FROM books');
        const [users] = await db.query('SELECT COUNT(*) FROM users');
        const [stat] = await db.query('SELECT COUNT(*) FROM stationary_items');
        res.json({
            message: "LibraryPro Backend API is running successfully on Vercel!",
            database: "PostgreSQL (Neon)",
            counts: {
                users: parseInt(users[0]?.count || users[0]?.['count'] || users[0]?.['COUNT(*)'] || 0, 10),
                books: parseInt(books[0]?.count || books[0]?.['count'] || books[0]?.['COUNT(*)'] || 0, 10),
                stationary: parseInt(stat[0]?.count || stat[0]?.['count'] || stat[0]?.['COUNT(*)'] || 0, 10)
            }
        });
    } catch (err) {
        res.json({
            message: "LibraryPro Backend API is running successfully on Vercel!",
            database_error: err.message
        });
    }
});

app.get('/api/seed', async (req, res) => {
    try {
        const db = require('./config/db');
        const [books] = await db.query('SELECT COUNT(*) FROM books');
        const [users] = await db.query('SELECT COUNT(*) FROM users');
        const [stat] = await db.query('SELECT COUNT(*) FROM stationary_items');
        res.json({
            message: "Database check & seed completed!",
            counts: {
                users: users[0]?.count || users[0]?.['COUNT(*)'] || users.length,
                books: books[0]?.count || books[0]?.['COUNT(*)'] || books.length,
                stationary: stat[0]?.count || stat[0]?.['COUNT(*)'] || stat.length
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Serve frontend only in local environment if dist exists
const indexHtmlPath = path.join(__dirname, '../frontend/dist/index.html');
if (fs.existsSync(indexHtmlPath) && !process.env.VERCEL) {
    const frontendDistPath = path.join(__dirname, '../frontend/dist');
    app.use(express.static(frontendDistPath));
    app.get('*', (req, res) => {
        res.sendFile(indexHtmlPath);
    });
} else {
    app.get('*', (req, res) => {
        res.status(404).json({ error: "API route not found" });
    });
}


const multer = require('multer');

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    if (err instanceof multer.MulterError || err.name === 'MulterError') {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File size limit exceeded. Maximum allowed size is 50MB.' });
        }
        return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
