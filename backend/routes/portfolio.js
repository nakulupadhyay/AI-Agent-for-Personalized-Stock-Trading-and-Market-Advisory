const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

// ── Portfolio snapshot / rebalance controller ──────────────
const {
    getSnapshots,
    getRebalanceSuggestion,
    takeSnapshot,
    addHolding,
    removeHolding,
    getHoldings,
} = require('../controllers/portfolioController');

// ── Portfolio data controller (lives in tradingController) ─
const {
    getPortfolio,
    getPortfolioAnalysis,
} = require('../controllers/tradingController');

// ── Routes ─────────────────────────────────────────────────

/**
 * @route   GET /api/portfolio
 * @desc    Get user's current portfolio (holdings, balance, P&L)
 * @access  Private
 */
router.get('/', protect, getPortfolio);

/**
 * @route   GET /api/portfolio/analysis
 * @desc    Full portfolio analysis (risk, AI insights, sector breakdown)
 * @access  Private
 */
router.get('/analysis', protect, getPortfolioAnalysis);

/**
 * @route   GET /api/portfolio/holdings
 * @desc    Get all holdings (lightweight)
 * @access  Private
 */
router.get('/holdings', protect, getHoldings);

/**
 * @route   GET /api/portfolio/snapshots
 * @desc    Historical portfolio value snapshots
 * @access  Private
 */
router.get('/snapshots', protect, getSnapshots);

/**
 * @route   POST /api/portfolio/add-holding
 * @desc    Manually add a stock holding
 * @access  Private
 */
router.post('/add-holding', protect, addHolding);

/**
 * @route   POST /api/portfolio/rebalance
 * @desc    AI rebalance suggestions
 * @access  Private
 */
router.post('/rebalance', protect, getRebalanceSuggestion);

/**
 * @route   POST /api/portfolio/snapshot
 * @desc    Take a manual snapshot of current portfolio value
 * @access  Private
 */
router.post('/snapshot', protect, takeSnapshot);

/**
 * @route   DELETE /api/portfolio/holding/:symbol
 * @desc    Remove a stock holding
 * @access  Private
 */
router.delete('/holding/:symbol', protect, removeHolding);

module.exports = router;

