const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getModules, getModule, updateProgress, getQuiz, submitQuiz } = require('../controllers/educationController');

router.get('/modules', protect, getModules);
router.get('/module/:id', protect, getModule);
router.post('/progress', protect, updateProgress);
router.get('/quiz/:moduleId', protect, getQuiz);
router.post('/quiz/:moduleId/submit', protect, submitQuiz);

module.exports = router;
