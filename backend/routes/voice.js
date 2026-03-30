const express = require('express');
const { processVoiceCommand } = require('../controllers/voiceController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Voice command processing
router.post('/voice-command', protect, processVoiceCommand);

module.exports = router;
