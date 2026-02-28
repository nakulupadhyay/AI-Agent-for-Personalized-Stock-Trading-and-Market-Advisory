const express = require('express');
const { getRiskAnalysis } = require('../controllers/riskAnalysisController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// GET /api/risk-analysis — Full quantitative portfolio risk assessment
router.get('/', protect, getRiskAnalysis);

module.exports = router;
