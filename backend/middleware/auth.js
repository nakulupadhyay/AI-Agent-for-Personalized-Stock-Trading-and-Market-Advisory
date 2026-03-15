const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { logger } = require('./errorHandler');

/**
 * Authentication middleware to protect routes
 * Validates JWT token and attaches user to request object
 */
const protect = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer')) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized, no token provided',
        });
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'User not found',
            });
        }

        next();
    } catch (error) {
        logger.warn(`Auth middleware error: ${error.message}`);
        return res.status(401).json({
            success: false,
            message: error.name === 'TokenExpiredError'
                ? 'Token expired, please login again'
                : 'Not authorized, token failed',
        });
    }
};

module.exports = { protect };
