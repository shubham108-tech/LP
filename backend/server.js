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

// Middleware
app.use(cors());
app.use(express.json());

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
    message: { message: 'Too many login attempts. Try again later.' }
});

const otpLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: { message: 'Too many OTP requests. Try again later.' }
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: { message: 'Too many requests. Try again later.' }
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
// ===================================================

// React build folder (dist) ko static serve karega
app.use(express.static(path.join(__dirname, 'client')));

// React Router support (important)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

// ===================================================
// END OF ADDED CODE
// ===================================================


// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
