const express = require('express');
const { getStockAdvice, advisorChat } = require('../controllers/stockDecisionController');
const { protect } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/stock-decision/advice
 * Body: { symbol, action: "buy"|"sell" }
 * Returns: { decision, confidence, reasoning, steps, alternativeStock, marketData, ... }
 */
router.post('/advice', protect, getStockAdvice);

/**
 * POST /api/stock-decision/chat
 * Body: { message }
 * Natural-language chat — routes to advisory engine for stock queries
 */
router.post('/chat', protect, advisorChat);

module.exports = router;
