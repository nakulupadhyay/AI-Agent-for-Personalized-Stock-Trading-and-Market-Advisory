const express = require('express');
const { buyStock, sellStock, getPortfolio, getTransactions, getPortfolioAnalysis } = require('../controllers/tradingController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All trading routes are protected
router.post('/buy', protect, buyStock);
router.post('/sell', protect, sellStock);
router.get('/portfolio', protect, getPortfolio);
router.get('/portfolio/analysis', protect, getPortfolioAnalysis);
router.get('/transactions', protect, getTransactions);

module.exports = router;
