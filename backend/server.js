const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path'); // ✅ ADDED: React dist serve karne ke liye

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

// Trust proxy for Vercel / reverse proxy deployment
app.set('trust proxy', 1);

// Middleware
app.use(cors());
app.use(express.json());

const { authenticateToken } = require('./middleware/authMiddleware');

app.use('/uploads', (req, res, next) => {
    const ext = path.extname(req.path).toLowerCase(); // ⚡ changed require('path') to path
    if (ext === '.pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline');
    }
    next();
}, express.static(path.join(__dirname, 'uploads')));

const rateLimit = require('express-rate-limit');

// Rate Limiters
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { message: 'Too many attempts from this IP, please try again after 15 minutes' },
    validate: false
});

const otpLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: { message: 'Too many OTP requests. Try again later.' },
    validate: false
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: { message: 'Too many requests. Try again later.' },
    validate: false
});

// Apply Rate Limits (skip on Vercel serverless functions)
if (!process.env.VERCEL) {
    app.use('/api/auth/login', authLimiter);
    app.use('/api/auth/register', otpLimiter);
    app.use('/api/auth/resend-otp', otpLimiter);
    app.use('/api', apiLimiter);
}

const engagementRoutes = require('./routes/engagementRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// API Routes (Supporting both /api/* and direct /* for Vercel rewrites)
app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/books', '/books'], bookRoutes);
app.use(['/api/requests', '/requests'], requestRoutes);
app.use(['/api/issues', '/issues'], issueRoutes);
app.use(['/api/admin', '/admin'], dashboardRoutes);
app.use(['/api/suggestions', '/suggestions'], suggestionRoutes);
app.use(['/api/discussions', '/discussions'], discussionRoutes);
app.use(['/api', '/'], reviewRoutes);
app.use(['/api/engineering', '/engineering'], require('./routes/engineeringRoutes'));
app.use(['/api/elearning', '/elearning'], elearningRoutes);
app.use(['/api/exams', '/exams'], examRoutes);
app.use(['/api/schedules', '/schedules'], scheduleRoutes);
app.use(['/api/analytics', '/analytics'], analyticsRoutes);
app.use(['/api/engagement', '/engagement'], engagementRoutes);
app.use(['/api/notifications', '/notifications'], notificationRoutes);
app.use(['/api/feedback', '/feedback'], require('./routes/feedbackRoutes'));
app.use(['/api/gamification', '/gamification'], require('./routes/gamificationRoutes'));
app.use(['/api/stationary', '/stationary'], require('./routes/stationaryRoutes'));

// React Frontend Serve (Only for local standalone Node server, skip on Vercel CDN)
if (!process.env.VERCEL) {
    const frontendDistPath = fs.existsSync(path.join(__dirname, '../frontend/dist'))
        ? path.join(__dirname, '../frontend/dist')
        : (fs.existsSync(path.join(__dirname, 'dist')) ? path.join(__dirname, 'dist') : path.join(__dirname, 'client'));

    app.use(express.static(frontendDistPath));

    app.get('*', (req, res) => {
        res.sendFile(path.join(frontendDistPath, 'index.html'));
    });
}

// ===================================================
// END OF ADDED CODE
// ===================================================


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
