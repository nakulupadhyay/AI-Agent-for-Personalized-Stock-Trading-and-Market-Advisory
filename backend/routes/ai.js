const express = require('express');
const { getRecommendation, getSentiment, chatAdvisor, getMLStatus } = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All AI routes are protected
router.post('/recommendation', protect, getRecommendation);
router.post('/sentiment', protect, getSentiment);
router.post('/chat', protect, chatAdvisor);
router.get('/ml-status', protect, getMLStatus);

module.exports = router;
