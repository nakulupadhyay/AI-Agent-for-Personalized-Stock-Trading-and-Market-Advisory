const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getAvailableBrokers, connectBroker, getConnectionStatus, syncPortfolio, disconnectBroker } = require('../controllers/brokerController');

router.get('/available', protect, getAvailableBrokers);
router.post('/connect', protect, connectBroker);
router.get('/status', protect, getConnectionStatus);
router.post('/sync', protect, syncPortfolio);
router.delete('/disconnect', protect, disconnectBroker);

module.exports = router;
