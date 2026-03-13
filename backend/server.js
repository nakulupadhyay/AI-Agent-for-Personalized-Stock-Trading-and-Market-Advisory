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
const { apiLimiter } = require('./middleware/rateLimiter');

// Validate environment variables
validateEnv();

// Initialize app
const app = express();

// Connect to MongoDB
connectDB();

// ─── Security Middleware ─────────────────────────────────
app.use(helmet());                    // Security headers
app.use(mongoSanitize());            // Prevent NoSQL injection
app.use(hpp());                       // Prevent HTTP parameter pollution

// CORS
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Rate limiting
app.use('/api/', apiLimiter);

// Request logging middleware
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`);
    next();
});

// ─── API Routes (v1) ─────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/stocks', require('./routes/stocks'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/trading', require('./routes/trading'));
app.use('/api/risk-profile', require('./routes/riskProfile'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/risk-analysis', require('./routes/riskAnalysis'));
app.use('/api/broker', require('./routes/broker'));
app.use('/api/social', require('./routes/social'));
app.use('/api/education', require('./routes/education'));
app.use('/api/portfolio', require('./routes/portfolio'));
app.use('/api/sentiment', require('./routes/sentiment'));

// Welcome route
app.get('/', (req, res) => {
    res.json({
        message: 'CapitalWave AI — Stock Trading & Market Advisory API',
        version: '2.0.0',
        environment: process.env.NODE_ENV || 'development',
        endpoints: {
            auth: '/api/auth',
            stocks: '/api/stocks',
            ai: '/api/ai',
            trading: '/api/trading',
            riskProfile: '/api/risk-profile',
            riskAnalysis: '/api/risk-analysis',
            settings: '/api/settings',
            broker: '/api/broker',
            social: '/api/social',
            education: '/api/education',
            portfolio: '/api/portfolio',
            sentiment: '/api/sentiment',
        },
    });
});

// 404 handler (must be BEFORE errorHandler)
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
    });
});

// Centralized error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`);
    logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`🔒 Security: Helmet, CORS, Rate-limit, Mongo-sanitize enabled`);
});
