require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { errorHandler, logger } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

// Initialize app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use('/api/', apiLimiter);

// Request logging middleware
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`);
    next();
});

// ─── Routes ──────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/stocks', require('./routes/stocks'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/trading', require('./routes/trading'));
app.use('/api/risk-profile', require('./routes/riskProfile'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/risk-analysis', require('./routes/riskAnalysis'));

// New routes
app.use('/api/broker', require('./routes/broker'));
app.use('/api/social', require('./routes/social'));
app.use('/api/education', require('./routes/education'));
app.use('/api/portfolio', require('./routes/portfolio'));
app.use('/api/sentiment', require('./routes/sentiment'));

// Welcome route
app.get('/', (req, res) => {
    res.json({
        message: 'AI Stock Trading & Market Advisory API',
        version: '2.0.0',
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

// Centralized error handler
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
    });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`);
    logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});
