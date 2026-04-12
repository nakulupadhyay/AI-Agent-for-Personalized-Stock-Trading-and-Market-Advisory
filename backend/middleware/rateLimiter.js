const rateLimit = require('express-rate-limit');

/**
 * Rate limiters for different route types
 * Tuned for fintech security — auth endpoints are aggressive
 */

// ── General API limiter — 300 req / 15 min per IP ────────────
// React SPAs make concurrent calls; allow headroom
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: {
        success: false,
        message: 'Too many requests from this IP. Please try again after 15 minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
});

// ── Auth limiter — 10 attempts / 15 min per IP (1000 in test mode) ──
// Strict: protects register & login from brute-force
// Set NODE_ENV=test to get a higher limit for automated test suites.
const IS_TEST = process.env.NODE_ENV === 'test';
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: IS_TEST ? 1000 : 10,
    message: {
        success: false,
        message: 'Too many login attempts. Account access temporarily locked. Try again in 15 minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false, // Count ALL attempts, including successes
});

// ── AI/ML limiter — 60 req / 15 min (expensive API calls) ───
const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    message: {
        success: false,
        message: 'AI request quota exceeded. Please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// ── Trading limiter — 200 req / 15 min ───────────────────────
// Prevents automated trading bot abuse
const tradingLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: {
        success: false,
        message: 'Trading request limit exceeded. Please slow down.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { apiLimiter, authLimiter, aiLimiter, tradingLimiter };
