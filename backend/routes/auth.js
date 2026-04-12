const express = require('express');
const { register, login, logout, getMe, refreshToken } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { validate, rules } = require('../middleware/validator');

const router = express.Router();

// ── Public Routes (rate-limited + validated) ──────────────────
router.post('/register',
    authLimiter,
    rules.signup,
    validate,
    register
);

router.post('/login',
    authLimiter,
    rules.login,
    validate,
    login
);

router.post('/refresh', authLimiter, refreshToken);

// ── Protected Routes ──────────────────────────────────────────
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;
