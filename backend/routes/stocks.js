const express = require('express');
const { getStocks, getStockDetails } = require('../controllers/stockController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All stock routes are protected
router.get('/', protect, getStocks);
router.get('/:symbol', protect, getStockDetails);

module.exports = router;
