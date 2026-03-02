const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware to check validation results
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
        });
    }
    next();
};

/**
 * Validation rules for different routes
 */
const rules = {
    signup: [
        body('name').trim().notEmpty().withMessage('Name is required'),
        body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    ],
    login: [
        body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
        body('password').notEmpty().withMessage('Password is required'),
    ],
    buy: [
        body('symbol').trim().notEmpty().withMessage('Stock symbol is required'),
        body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
        body('price').isFloat({ min: 0.01 }).withMessage('Price must be positive'),
    ],
    sell: [
        body('symbol').trim().notEmpty().withMessage('Stock symbol is required'),
        body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
        body('price').isFloat({ min: 0.01 }).withMessage('Price must be positive'),
    ],
    limitOrder: [
        body('symbol').trim().notEmpty().withMessage('Stock symbol is required'),
        body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
        body('limitPrice').isFloat({ min: 0.01 }).withMessage('Limit price must be positive'),
        body('type').isIn(['BUY', 'SELL']).withMessage('Order type must be BUY or SELL'),
    ],
    stopLoss: [
        body('symbol').trim().notEmpty().withMessage('Stock symbol is required'),
        body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
        body('stopLossPrice').isFloat({ min: 0.01 }).withMessage('Stop-loss price must be positive'),
    ],
    recommendation: [
        body('symbol').trim().notEmpty().withMessage('Stock symbol is required'),
    ],
    sentiment: [
        body('symbol').trim().notEmpty().withMessage('Stock symbol is required'),
    ],
    symbolParam: [
        param('symbol').trim().notEmpty().withMessage('Stock symbol is required'),
    ],
};

module.exports = { validate, rules };
