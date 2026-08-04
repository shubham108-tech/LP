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
app.use(express.json());

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

app.use('/uploads', (req, res, next) => {
    const ext = path.extname(req.path).toLowerCase(); // ⚡ changed require('path') to path
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

    if (imageExts.includes(ext)) {
        return next();
    }

    authenticateToken(req, res, next);
}, express.static('uploads'));

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


// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
