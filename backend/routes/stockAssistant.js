const express = require('express');
const { getTopPicks, analyzeStock, smartChat } = require('../controllers/stockAssistantController');
const { protect } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/stock-assistant/top-picks
 * Returns top 2-3 BUY-signal stocks from NIFTY 50
 */
router.post('/top-picks', protect, getTopPicks);

/**
 * POST /api/stock-assistant/analyze
 * Body: { symbol } or { query }
 * Returns BUY / SELL / HOLD with reasoning
 */
router.post('/analyze', protect, analyzeStock);

/**
 * POST /api/stock-assistant/chat
 * Body: { message }
 * Smart NLP router — detects intent and routes accordingly
 */
router.post('/chat', protect, smartChat);

module.exports = router;
