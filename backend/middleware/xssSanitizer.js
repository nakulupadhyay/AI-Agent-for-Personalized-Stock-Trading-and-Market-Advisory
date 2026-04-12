const xss = require('xss');

/**
 * XSS Body Sanitizer Middleware
 * Recursively sanitizes all string values in req.body using the `xss` library
 * Runs AFTER express-mongo-sanitize but BEFORE controllers
 */

const xssOptions = {
    whiteList: {},          // Allow NO HTML tags (fintech API — no rich text needed)
    stripIgnoreTag: true,   // Strip unknown tags entirely
    stripIgnoreTagBody: ['script', 'style'], // Completely remove script/style content
};

/**
 * Recursively sanitize a value
 * @param {*} value - Any JSON-compatible value
 * @returns {*} - Sanitized value
 */
const sanitizeValue = (value) => {
    if (typeof value === 'string') {
        return xss(value, xssOptions);
    }
    if (Array.isArray(value)) {
        return value.map(sanitizeValue);
    }
    if (value !== null && typeof value === 'object') {
        const cleaned = {};
        for (const [k, v] of Object.entries(value)) {
            // Sanitize key names too (prevent prototype pollution)
            if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
            cleaned[k] = sanitizeValue(v);
        }
        return cleaned;
    }
    return value; // Numbers, booleans, null — pass through
};

/**
 * Express middleware: sanitize req.body and req.query
 */
const xssSanitizer = (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeValue(req.body);
    }
    if (req.query && typeof req.query === 'object') {
        req.query = sanitizeValue(req.query);
    }
    next();
};

module.exports = xssSanitizer;
