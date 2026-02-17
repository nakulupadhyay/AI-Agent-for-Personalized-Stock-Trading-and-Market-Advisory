const express = require('express');
const { getStocks, getStockDetails, searchStocks } = require('../controllers/stockController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All stock routes are protected
router.get('/', protect, getStocks);
router.get('/search/:query', protect, searchStocks);
router.get('/:symbol', protect, getStockDetails);

module.exports = router;
