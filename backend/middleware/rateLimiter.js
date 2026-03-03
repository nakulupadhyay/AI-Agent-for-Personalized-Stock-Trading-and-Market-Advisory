const rateLimit = require('express-rate-limit');

/**
 * Rate limiters for different route types
 */

// General API rate limiter — 500 requests per 15 minutes
// React SPAs make multiple concurrent calls per page, so be generous
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: {
        success: false,
        message: 'Too many requests. Please try again after 15 minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Auth rate limiter — 20 login attempts per 15 minutes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: {
        success: false,
        message: 'Too many login attempts. Please try again after 15 minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// AI/ML endpoint limiter — expensive operations, 100 per 15 min
const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        success: false,
        message: 'Too many AI requests. Please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { apiLimiter, authLimiter, aiLimiter };
