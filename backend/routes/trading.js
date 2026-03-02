const express = require('express');
const { buyStock, sellStock, getPortfolio, getTransactions, getPortfolioAnalysis, placeLimitOrder, placeStopLoss, getPendingOrders, cancelOrder, getTradeAnalytics } = require('../controllers/tradingController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All trading routes are protected
router.post('/buy', protect, buyStock);
router.post('/sell', protect, sellStock);
router.post('/limit-order', protect, placeLimitOrder);
router.post('/stop-loss', protect, placeStopLoss);
router.get('/pending-orders', protect, getPendingOrders);
router.delete('/order/:id', protect, cancelOrder);
router.get('/analytics', protect, getTradeAnalytics);
router.get('/portfolio', protect, getPortfolio);
router.get('/portfolio/analysis', protect, getPortfolioAnalysis);
router.get('/transactions', protect, getTransactions);

module.exports = router;

