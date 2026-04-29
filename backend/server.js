require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const connectDB = require('./config/db');
const validateEnv = require('./config/validateEnv');
const { errorHandler, logger } = require('./middleware/errorHandler');
const { apiLimiter, tradingLimiter, aiLimiter } = require('./middleware/rateLimiter');
const xssSanitizer       = require('./middleware/xssSanitizer');
const securityHeaders     = require('./middleware/securityHeaders');

// ── 1. Validate environment on startup (fail-fast) ────────────
validateEnv();

// ── 2. Initialize Express ─────────────────────────────────────
const app = express();
app.disable('x-powered-by'); // Suppress Express fingerprinting header

// ── 3. Connect to MongoDB ─────────────────────────────────────
connectDB();

// ── 4. Security Headers (Helmet) ──────────────────────────────
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc:     ["'self'"],
            scriptSrc:      ["'self'"],
            styleSrc:       ["'self'", "'unsafe-inline'"],
            imgSrc:         ["'self'", 'data:', 'https:'],
            connectSrc:     ["'self'"],
            fontSrc:        ["'self'"],
            objectSrc:      ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    crossOriginEmbedderPolicy: false, // Allow embedding if needed
    hsts: {
        maxAge: 31536000,       // 1 year
        includeSubDomains: true,
        preload: true,
    },
}));

// ── 5. CORS Configuration ─────────────────────────────────────
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map(o => o.trim());

app.use(cors({
    origin: (origin, callback) => {
        // Allow non-browser requests (health checks, server-to-server)
        if (!origin) {
            return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        callback(new Error(`CORS: Origin '${origin}' not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    maxAge: 86400, // 24 hours preflight cache
}));

// ── 6. Body Parsing (strict limits) ───────────────────────────
app.use(express.json({
    limit: '1mb',          // Tightened from 10mb — prevents large-payload DoS
    strict: true,           // Only accept arrays and objects as JSON root
}));
app.use(express.urlencoded({
    extended: false,        // Use simple querystring (safer)
    limit: '1mb',
}));

// ── 7. Anti-Injection Middleware ──────────────────────────────
app.use(mongoSanitize({     // NoSQL injection prevention
    replaceWith: '_',
    allowDots: false,
}));
app.use(hpp());             // HTTP Parameter Pollution prevention
app.use(xssSanitizer);      // XSS body/query sanitization (strips all HTML/JS)

// ── 7b. Prototype Pollution Prevention ───────────────────────
app.use((req, res, next) => {
    if (req.body) {
        delete req.body.__proto__;
        delete req.body.constructor;
        delete req.body.prototype;
    }
    next();
});

// ── 8. Compression ────────────────────────────────────────────
app.use(compression());

// ── 9. General Rate Limiting ──────────────────────────────────
app.use('/api/', apiLimiter);

// ── 10. Security Response Headers (dedicated middleware) ───────
app.use(securityHeaders);

// ── 11. Request Logging (sanitized — no auth headers) ─────────
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.path} → ${res.statusCode} (${duration}ms)`, {
            ip: req.ip,
            userAgent: req.get('user-agent'),
        });
    });
    next();
});

// ── 12. API Routes ────────────────────────────────────────────
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/stocks',       require('./routes/stocks'));
app.use('/api/ai',           aiLimiter, require('./routes/ai'));
app.use('/api/trading',      tradingLimiter, require('./routes/trading'));
app.use('/api/risk-profile', require('./routes/riskProfile'));
app.use('/api/settings',     require('./routes/settings'));
app.use('/api/risk-analysis',require('./routes/riskAnalysis'));
app.use('/api/broker',       require('./routes/broker'));
app.use('/api/social',       require('./routes/social'));
app.use('/api/education',    require('./routes/education'));
app.use('/api/portfolio',    require('./routes/portfolio'));
app.use('/api/sentiment',    require('./routes/sentiment'));
app.use('/api/stock-decision', require('./routes/stockDecision'));
app.use('/api/stock-assistant', require('./routes/stockAssistant'));

// ── 13. Health Check ──────────────────────────────────────────
app.get('/health', (req, res) => {
    res.status(200).json({
        status:      'ok',
        service:     'CapitalWave AI Backend',
        version:     '2.1.0',
        environment: process.env.NODE_ENV || 'development',
        uptime:      Math.floor(process.uptime()),
        timestamp:   new Date().toISOString(),
    });
});

// ── 14. Root Welcome Route ────────────────────────────────────
app.get('/', (req, res) => {
    res.status(200).json({
        message:     'CapitalWave AI — Stock Trading & Market Advisory API',
        version:     '2.1.0',
        environment: process.env.NODE_ENV || 'development',
        docs:        '/health',
        endpoints: {
            auth:         '/api/auth',
            stocks:       '/api/stocks',
            ai:           '/api/ai',
            trading:      '/api/trading',
            riskProfile:  '/api/risk-profile',
            riskAnalysis: '/api/risk-analysis',
            settings:     '/api/settings',
            portfolio:    '/api/portfolio',
            sentiment:    '/api/sentiment',
        },
    });
});

// ── 15. 404 Handler ───────────────────────────────────────────
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
    });
});

// ── 16. Centralized Error Handler (always last) ───────────────
app.use(errorHandler);

// ── 17. Start Server ──────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '5000', 10);

const server = app.listen(PORT, () => {
    logger.info(`🚀 CapitalWave API running on port ${PORT}`);
    logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`🔒 Security: Helmet, CORS, Rate-limit, Mongo-sanitize, HPP, XSS-headers`);
    logger.info(`🏥 Health: http://localhost:${PORT}/health`);
});

// ── 18. Graceful Shutdown ─────────────────────────────────────
const gracefulShutdown = (signal) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
    });
    // Force kill after 10 seconds
    setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection:', { reason: reason?.message || reason });
    gracefulShutdown('UNHANDLED_REJECTION');
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', { message: error.message, stack: error.stack });
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

module.exports = app; // For testing
