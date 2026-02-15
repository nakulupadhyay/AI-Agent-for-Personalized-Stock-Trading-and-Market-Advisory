const express = require('express');
const { saveRiskProfile, getRiskProfile } = require('../controllers/riskProfileController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All risk profile routes are protected
router.post('/', protect, saveRiskProfile);
router.get('/', protect, getRiskProfile);

module.exports = router;
