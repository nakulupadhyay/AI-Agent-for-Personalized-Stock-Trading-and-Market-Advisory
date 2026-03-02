const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getTrending, getSentimentHistory, getSectorSentiment } = require('../controllers/sentimentController');

router.get('/trending', protect, getTrending);
router.get('/history/:symbol', protect, getSentimentHistory);
router.get('/sector', protect, getSectorSentiment);

module.exports = router;
