const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    getSettings,
    updateProfile,
    changePassword,
    updateRisk,
    updateNotifications,
    updateAI,
    updatePaperTrading,
    updateTheme,
    deleteAccount,
    downloadData,
    clearHistory,
    toggle2FA,
} = require('../controllers/settingsController');

// All routes are protected
router.use(protect);

// Get all settings
router.get('/', getSettings);

// Profile
router.put('/profile', updateProfile);
router.put('/password', changePassword);
router.put('/2fa', toggle2FA);

// Risk preferences
router.put('/risk', updateRisk);

// Notifications
router.put('/notifications', updateNotifications);

// AI customization
router.put('/ai', updateAI);

// Paper trading
router.put('/paper-trading', updatePaperTrading);

// Theme & appearance
router.put('/theme', updateTheme);

// Data & privacy
router.get('/data/download', downloadData);
router.delete('/data/clear-history', clearHistory);
router.delete('/account', deleteAccount);

module.exports = router;
