const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        const secret = process.env.JWT_SECRET || 'development_secret_key_123';
        const verified = jwt.verify(token, secret);
        req.user = verified;
        next();
    } catch (err) {
        res.status(403).json({ message: 'Invalid token.' });
    }
};

const protect = authenticateToken;

const isAdmin = (req, res, next) => {
    const userRole = req.user?.role ? req.user.role.toLowerCase() : '';
    if (req.user && (userRole === 'admin' || userRole === 'hod')) {
        next();
    } else {
        console.log('Access Denied: Admin role required. User:', req.user);
        res.status(403).json({ message: 'Access denied. Admin role required.' });
    }
};

const isStrictAdmin = (req, res, next) => {
    const userRole = req.user?.role ? req.user.role.toLowerCase() : '';
    if (req.user && userRole === 'admin') {
        next();
    } else {
        console.log('Access Denied: Only Admin can edit or delete. User:', req.user);
        res.status(403).json({ message: 'Access denied. Only Admin can edit or delete stationary records.' });
    }
};

const authorize = (roles = []) => {
    // If roles is string, convert to array
    if (typeof roles === 'string') {
        roles = [roles];
    }
    const lowerRoles = roles.map(r => String(r).toLowerCase());

    return (req, res, next) => {
        const userRole = req.user?.role ? req.user.role.toLowerCase() : '';
        if (!req.user || (roles.length && !lowerRoles.includes(userRole))) {
            return res.status(403).json({ message: 'Unauthorized role' });
        }
        next();
    };
};

const authorizeRoles = authorize;

module.exports = { authenticateToken, protect, isAdmin, isStrictAdmin, authorize, authorizeRoles };

