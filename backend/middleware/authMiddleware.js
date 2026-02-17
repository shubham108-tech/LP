const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        res.status(403).json({ message: 'Invalid token.' });
    }
};

const protect = authenticateToken;

const isAdmin = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'hod')) {
        next();
    } else {
        console.log('Access Denied: Admin role required. User:', req.user);
        res.status(403).json({ message: 'Access denied. Admin role required.' });
    }
};

const authorize = (roles = []) => {
    // If roles is string, convert to array
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return (req, res, next) => {
        if (!req.user || (roles.length && !roles.includes(req.user.role))) {
            return res.status(403).json({ message: 'Unauthorized role' });
        }
        next();
    };
};

module.exports = { authenticateToken, protect, isAdmin, authorize };

