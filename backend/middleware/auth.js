const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { logger } = require('./errorHandler');
const tokenBlacklist = require('../utils/tokenBlacklist');

/**
 * Authentication middleware — protects private routes
 * Validates JWT, checks token blacklist, attaches user to request
 */
const protect = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized — no token provided',
        });
    }

    const token = authHeader.split(' ')[1];

    // ── Check token blacklist (logout tokens) ─────────────────
    if (tokenBlacklist.has(token)) {
        return res.status(401).json({
            success: false,
            message: 'Token has been invalidated. Please login again.',
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Reject refresh tokens used as access tokens
        if (decoded.type === 'refresh') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token type — use access token',
            });
        }

        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User account not found or deleted',
            });
        }

        // Check if account is locked
        if (user.isLocked) {
            return res.status(423).json({
                success: false,
                message: 'Account is temporarily locked due to too many failed login attempts',
            });
        }

        req.user = user;
        req.token = token; // Attach token for potential logout use
        next();
    } catch (error) {
        logger.warn(`Auth middleware error: ${error.message}`, {
            ip: req.ip,
            path: req.path,
        });

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Access token expired — please refresh your session',
                code: 'TOKEN_EXPIRED',
            });
        }

        return res.status(401).json({
            success: false,
            message: 'Not authorized — invalid token',
            code: 'TOKEN_INVALID',
        });
    }
};

module.exports = { protect };
