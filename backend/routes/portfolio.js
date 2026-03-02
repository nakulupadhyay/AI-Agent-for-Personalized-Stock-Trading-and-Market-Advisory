const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getSnapshots, getRebalanceSuggestion, takeSnapshot } = require('../controllers/portfolioController');

router.get('/snapshots', protect, getSnapshots);
router.post('/rebalance', protect, getRebalanceSuggestion);
router.post('/snapshot', protect, takeSnapshot);

module.exports = router;
