const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware: Check validation results and return structured errors
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(e => ({
                field:   e.path,
                message: e.msg,
                value:   e.value,   // helps client debug
            })),
        });
    }
    next();
};

/**
 * Shared sanitizer: trim and escape HTML characters (XSS prevention)
 */
const sanitizeString = (field) =>
    body(field).trim().escape();

/**
 * Validation rule sets for each route
 */
const rules = {

    // ── Auth ─────────────────────────────────────────────────
    signup: [
        body('name')
            .trim()
            .notEmpty().withMessage('Name is required')
            .isLength({ min: 2, max: 50 }).withMessage('Name must be 2–50 characters')
            .matches(/^[a-zA-Z\s'-]+$/).withMessage('Name can only contain letters, spaces, hyphens, and apostrophes'),

        body('email')
            .isEmail().withMessage('A valid email address is required')
            .normalizeEmail()
            .isLength({ max: 254 }).withMessage('Email is too long'),

        body('password')
            .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
            .isLength({ max: 128 }).withMessage('Password cannot exceed 128 characters')
            .not().isIn(['password', '12345678', 'password123', 'qwerty123'])
                .withMessage('Password is too common — choose a stronger password'),
    ],

    login: [
        body('email')
            .isEmail().withMessage('A valid email address is required')
            .normalizeEmail(),

        body('password')
            .notEmpty().withMessage('Password is required')
            .isLength({ max: 128 }).withMessage('Password too long'),
    ],

    // ── Trading ───────────────────────────────────────────────
    buy: [
        body('symbol')
            .trim()
            .notEmpty().withMessage('Stock symbol is required')
            .isLength({ min: 1, max: 10 }).withMessage('Symbol must be 1–10 characters')
            .matches(/^[A-Z0-9.-]+$/i).withMessage('Invalid stock symbol format'),

        body('quantity')
            .isInt({ min: 1, max: 100000 }).withMessage('Quantity must be between 1 and 100,000')
            .toInt(),

        body('price')
            .isFloat({ min: 0.01, max: 1000000 }).withMessage('Price must be between 0.01 and 1,000,000')
            .toFloat(),
    ],

    sell: [
        body('symbol')
            .trim()
            .notEmpty().withMessage('Stock symbol is required')
            .isLength({ min: 1, max: 10 }).withMessage('Symbol must be 1–10 characters')
            .matches(/^[A-Z0-9.-]+$/i).withMessage('Invalid stock symbol format'),

        body('quantity')
            .isInt({ min: 1, max: 100000 }).withMessage('Quantity must be between 1 and 100,000')
            .toInt(),

        body('price')
            .isFloat({ min: 0.01, max: 1000000 }).withMessage('Price must be between 0.01 and 1,000,000')
            .toFloat(),
    ],

    limitOrder: [
        body('symbol')
            .trim()
            .notEmpty().withMessage('Stock symbol is required')
            .matches(/^[A-Z0-9.-]+$/i).withMessage('Invalid stock symbol format'),

        body('quantity')
            .isInt({ min: 1, max: 100000 }).withMessage('Quantity must be between 1 and 100,000')
            .toInt(),

        body('limitPrice')
            .isFloat({ min: 0.01 }).withMessage('Limit price must be positive')
            .toFloat(),

        body('type')
            .isIn(['BUY', 'SELL']).withMessage('Order type must be BUY or SELL'),
    ],

    stopLoss: [
        body('symbol')
            .trim()
            .notEmpty().withMessage('Stock symbol is required')
            .matches(/^[A-Z0-9.-]+$/i).withMessage('Invalid stock symbol format'),

        body('quantity')
            .isInt({ min: 1, max: 100000 }).withMessage('Quantity must be between 1 and 100,000')
            .toInt(),

        body('stopLossPrice')
            .isFloat({ min: 0.01 }).withMessage('Stop-loss price must be positive')
            .toFloat(),
    ],

    // ── AI / Recommendation ───────────────────────────────────
    recommendation: [
        body('symbol')
            .trim()
            .notEmpty().withMessage('Stock symbol is required')
            .isLength({ min: 1, max: 10 }).withMessage('Symbol must be 1–10 characters')
            .matches(/^[A-Z0-9.-]+$/i).withMessage('Invalid stock symbol format'),
    ],

    sentiment: [
        body('symbol')
            .trim()
            .notEmpty().withMessage('Stock symbol is required')
            .matches(/^[A-Z0-9.-]+$/i).withMessage('Invalid stock symbol format'),
    ],

    // ── URL Params ────────────────────────────────────────────
    symbolParam: [
        param('symbol')
            .trim()
            .notEmpty().withMessage('Stock symbol is required')
            .isLength({ min: 1, max: 20 }).withMessage('Symbol must be 1–20 characters')
            .matches(/^[A-Z0-9.:-]+$/i).withMessage('Invalid stock symbol format'),
    ],

    queryParam: [
        param('query')
            .trim()
            .notEmpty().withMessage('Search query is required')
            .isLength({ min: 1, max: 50 }).withMessage('Query must be 1–50 characters')
            .matches(/^[a-zA-Z0-9\s.-]+$/).withMessage('Invalid characters in search query'),
    ],

    // ── Settings ──────────────────────────────────────────────
    changePassword: [
        body('currentPassword')
            .notEmpty().withMessage('Current password is required'),

        body('newPassword')
            .isLength({ min: 8, max: 128 }).withMessage('New password must be 8–128 characters')
            .not().isIn(['password', '12345678', 'password123'])
                .withMessage('Password is too common'),
    ],
};

module.exports = { validate, rules };
