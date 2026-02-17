const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/authRoutes');
const bookRoutes = require('./routes/bookRoutes');
const requestRoutes = require('./routes/requestRoutes');
const issueRoutes = require('./routes/issueRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const suggestionRoutes = require('./routes/suggestionRoutes');
const discussionRoutes = require('./routes/discussionRoutes');
const reviewRoutes = require('./routes/reviewRoutes'); // New Route
const elearningRoutes = require('./routes/elearningRoutes'); // E-Learning Routes
const examRoutes = require('./routes/examRoutes'); // Exam Routes
const scheduleRoutes = require('./routes/scheduleRoutes'); // Schedule Routes
const analyticsRoutes = require('./routes/analyticsRoutes'); // Analytics Routes

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

const rateLimit = require('express-rate-limit');

// Rate Limiting Configuration
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limit each IP to 50 requests per windowMs
    message: { message: 'Too many login attempts from this IP, please try again after 15 minutes' },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000, // Increased limit for general API usage
    message: { message: 'Too many requests from this IP, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply Rate Limits
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

const engagementRoutes = require('./routes/engagementRoutes');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/admin', dashboardRoutes);
app.use('/api/suggestions', suggestionRoutes);
app.use('/api/discussions', discussionRoutes);
app.use('/api', reviewRoutes);
app.use('/api/elearning', elearningRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/engagement', engagementRoutes);
const notificationRoutes = require('./routes/notificationRoutes');
const notificationController = require('./controllers/notificationController'); // For cron or triggers
app.use('/api/notifications', notificationRoutes);
app.use('/api/feedback', require('./routes/feedbackRoutes'));
app.use('/api/gamification', require('./routes/gamificationRoutes'));

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);

    // Log available network interfaces for easy access
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    const results = Object.create(null);

    for (const name of Object.keys(nets)) {
        // Skip virtual adapters to avoid confusing the user
        const lowerName = name.toLowerCase();
        if (lowerName.includes('vmware') ||
            lowerName.includes('virtual') ||
            lowerName.includes('vethernet') ||
            lowerName.includes('pseudo') ||
            lowerName.includes('loopback')) {
            continue;
        }

        for (const net of nets[name]) {
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            if (net.family === 'IPv4' && !net.internal) {
                if (!results[name]) {
                    results[name] = [];
                }
                results[name].push(net.address);
            }
        }
    }

    console.log('\n--- NETWORK ACCESS ---');
    console.log('You can access the backend via these IPs:');
    Object.keys(results).forEach(name => {
        results[name].forEach(ip => {
            console.log(`  http://${ip}:${PORT}`);
        });
    });
    console.log('----------------------\n');
});
