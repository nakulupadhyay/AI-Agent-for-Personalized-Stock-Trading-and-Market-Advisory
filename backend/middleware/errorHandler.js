const winston = require('winston');
const path = require('path');

/**
 * Centralized logger using Winston
 * Console + File transports for production-grade logging
 */
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'capitalwave-api' },
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ timestamp, level, message, ...meta }) => {
                    return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length > 1 ? JSON.stringify(meta) : ''}`;
                })
            ),
        }),
        // File transport for persistent logging
        new winston.transports.File({
            filename: path.join(__dirname, '..', 'logs', 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        new winston.transports.File({
            filename: path.join(__dirname, '..', 'logs', 'combined.log'),
            maxsize: 5242880,
            maxFiles: 5,
        }),
    ],
});

/**
 * Centralized error handling middleware
 */
const errorHandler = (err, req, res, next) => {
    logger.error(err.message, {
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip,
    });

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({
            success: false,
            message: 'Validation Error',
            errors: messages,
        });
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        return res.status(400).json({
            success: false,
            message: 'Duplicate field value entered',
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Invalid token',
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Token expired',
        });
    }

    // Default server error — don't leak error details in production
    const isProduction = process.env.NODE_ENV === 'production';
    res.status(err.status || 500).json({
        success: false,
        message: isProduction ? 'Internal Server Error' : (err.message || 'Internal Server Error'),
    });
};

module.exports = { errorHandler, logger };
