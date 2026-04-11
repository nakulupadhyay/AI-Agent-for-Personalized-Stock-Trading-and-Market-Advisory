const express = require('express');
const { getRecommendation, getSentiment, chatAdvisor, getMLStatus } = require('../controllers/aiController');
const { processVoiceCommand, analyzeStockDecision, executeConfirmedVoiceTrade } = require('../controllers/voiceController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All AI routes are protected
router.post('/recommendation', protect, getRecommendation);
router.post('/sentiment', protect, getSentiment);
router.post('/chat', protect, chatAdvisor);
router.get('/ml-status', protect, getMLStatus);
router.post('/voice-command', protect, processVoiceCommand);
router.post('/voice-execute-trade', protect, executeConfirmedVoiceTrade);

// Intelligent BUY / HOLD / DO_NOT_BUY stock decision engine
router.post('/stock-decision', protect, analyzeStockDecision);

module.exports = router;

