const User = require('../models/User');
const Portfolio = require('../models/Portfolio');
const Transaction = require('../models/Transaction');
const bcrypt = require('bcrypt');

/**
 * @route   GET /api/settings
 * @desc    Get all user settings
 * @access  Private
 */
const getSettings = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({
            success: true,
            settings: {
                name: user.name,
                email: user.email,
                profilePhoto: user.profilePhoto,
                twoFactorEnabled: user.twoFactorEnabled,
                riskProfile: user.riskProfile,
                investmentHorizon: user.investmentHorizon,
                notifications: user.notifications,
                aiSettings: user.aiSettings,
                virtualBalance: user.virtualBalance,
                simulationMode: user.simulationMode,
                theme: user.theme,
                currency: user.currency,
                language: user.language,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

/**
 * @route   PUT /api/settings/profile
 * @desc    Update user profile (name, email, photo)
 * @access  Private
 */
const updateProfile = async (req, res) => {
    try {
        const { name, email, profilePhoto } = req.body;
        const updates = {};

        if (name) updates.name = name;
        if (email) {
            // Check if email is already taken by another user
            const existing = await User.findOne({ email, _id: { $ne: req.user.id } });
            if (existing) {
                return res.status(400).json({ success: false, message: 'Email already in use' });
            }
            updates.email = email;
        }
        if (profilePhoto !== undefined) updates.profilePhoto = profilePhoto;

        const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true });

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                profilePhoto: user.profilePhoto,
                riskProfile: user.riskProfile,
                virtualBalance: user.virtualBalance,
            },
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

/**
 * @route   PUT /api/settings/password
 * @desc    Change password
 * @access  Private
 */
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Please provide current and new password' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
        }

        const user = await User.findById(req.user.id).select('+password');
        const isMatch = await user.comparePassword(currentPassword);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect' });
        }

        user.password = newPassword;
        await user.save();

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

/**
 * @route   PUT /api/settings/risk
 * @desc    Update risk profile & investment horizon
 * @access  Private
 */
const updateRisk = async (req, res) => {
    try {
        const { riskProfile, investmentHorizon } = req.body;
        const updates = {};

        if (riskProfile) updates.riskProfile = riskProfile;
        if (investmentHorizon) updates.investmentHorizon = investmentHorizon;

        const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true });

        res.json({
            success: true,
            message: 'Risk preferences updated',
            riskProfile: user.riskProfile,
            investmentHorizon: user.investmentHorizon,
        });
    } catch (error) {
        console.error('Update risk error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

/**
 * @route   PUT /api/settings/notifications
 * @desc    Update notification preferences
 * @access  Private
 */
const updateNotifications = async (req, res) => {
    try {
        const { email, priceAlert, newsAlert, aiRecommendation } = req.body;
        const notifications = {};

        if (email !== undefined) notifications['notifications.email'] = email;
        if (priceAlert !== undefined) notifications['notifications.priceAlert'] = priceAlert;
        if (newsAlert !== undefined) notifications['notifications.newsAlert'] = newsAlert;
        if (aiRecommendation !== undefined) notifications['notifications.aiRecommendation'] = aiRecommendation;

        const user = await User.findByIdAndUpdate(req.user.id, { $set: notifications }, { new: true });

        res.json({
            success: true,
            message: 'Notification settings updated',
            notifications: user.notifications,
        });
    } catch (error) {
        console.error('Update notifications error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

/**
 * @route   PUT /api/settings/ai
 * @desc    Update AI customization settings
 * @access  Private
 */
const updateAI = async (req, res) => {
    try {
        const { confidenceThreshold, sentimentWeight, autoRefreshTime } = req.body;
        const aiUpdates = {};

        if (confidenceThreshold !== undefined) aiUpdates['aiSettings.confidenceThreshold'] = confidenceThreshold;
        if (sentimentWeight !== undefined) aiUpdates['aiSettings.sentimentWeight'] = sentimentWeight;
        if (autoRefreshTime !== undefined) aiUpdates['aiSettings.autoRefreshTime'] = autoRefreshTime;

        const user = await User.findByIdAndUpdate(req.user.id, { $set: aiUpdates }, { new: true });

        res.json({
            success: true,
            message: 'AI settings updated',
            aiSettings: user.aiSettings,
        });
    } catch (error) {
        console.error('Update AI settings error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

/**
 * @route   PUT /api/settings/paper-trading
 * @desc    Update paper trading settings (reset portfolio, set capital, toggle simulation)
 * @access  Private
 */
const updatePaperTrading = async (req, res) => {
    try {
        const { resetPortfolio, initialCapital, simulationMode } = req.body;
        const updates = {};

        if (simulationMode !== undefined) updates.simulationMode = simulationMode;

        if (initialCapital !== undefined && initialCapital > 0) {
            updates.virtualBalance = initialCapital;
        }

        if (resetPortfolio) {
            // Reset portfolio holdings
            await Portfolio.findOneAndUpdate(
                { userId: req.user.id },
                { holdings: [] }
            );
            updates.virtualBalance = initialCapital || 1000000;
        }

        const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true });

        res.json({
            success: true,
            message: resetPortfolio ? 'Portfolio reset successfully' : 'Paper trading settings updated',
            virtualBalance: user.virtualBalance,
            simulationMode: user.simulationMode,
        });
    } catch (error) {
        console.error('Update paper trading error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

/**
 * @route   PUT /api/settings/theme
 * @desc    Update theme, currency, language
 * @access  Private
 */
const updateTheme = async (req, res) => {
    try {
        const { theme, currency, language } = req.body;
        const updates = {};

        if (theme) updates.theme = theme;
        if (currency) updates.currency = currency;
        if (language) updates.language = language;

        const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true });

        res.json({
            success: true,
            message: 'Theme settings updated',
            theme: user.theme,
            currency: user.currency,
            language: user.language,
        });
    } catch (error) {
        console.error('Update theme error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

/**
 * @route   DELETE /api/settings/account
 * @desc    Delete user account and all related data
 * @access  Private
 */
const deleteAccount = async (req, res) => {
    try {
        // Delete related data
        await Portfolio.deleteMany({ userId: req.user.id });
        await Transaction.deleteMany({ userId: req.user.id });
        await User.findByIdAndDelete(req.user.id);

        res.json({ success: true, message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

/**
 * @route   GET /api/settings/data/download
 * @desc    Download all user data as JSON
 * @access  Private
 */
const downloadData = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const portfolio = await Portfolio.findOne({ userId: req.user.id });
        const transactions = await Transaction.find({ userId: req.user.id });

        const userData = {
            profile: {
                name: user.name,
                email: user.email,
                riskProfile: user.riskProfile,
                investmentHorizon: user.investmentHorizon,
                virtualBalance: user.virtualBalance,
                createdAt: user.createdAt,
            },
            settings: {
                notifications: user.notifications,
                aiSettings: user.aiSettings,
                theme: user.theme,
                currency: user.currency,
                language: user.language,
            },
            portfolio: portfolio || {},
            transactions: transactions || [],
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=capitalwave_data.json');
        res.json({ success: true, data: userData });
    } catch (error) {
        console.error('Download data error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

/**
 * @route   DELETE /api/settings/data/clear-history
 * @desc    Clear trading history
 * @access  Private
 */
const clearHistory = async (req, res) => {
    try {
        await Transaction.deleteMany({ userId: req.user.id });

        res.json({ success: true, message: 'Trading history cleared' });
    } catch (error) {
        console.error('Clear history error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

/**
 * @route   PUT /api/settings/2fa
 * @desc    Toggle two-factor authentication
 * @access  Private
 */
const toggle2FA = async (req, res) => {
    try {
        const { enabled } = req.body;
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { twoFactorEnabled: enabled },
            { new: true }
        );

        res.json({
            success: true,
            message: `Two-factor authentication ${enabled ? 'enabled' : 'disabled'}`,
            twoFactorEnabled: user.twoFactorEnabled,
        });
    } catch (error) {
        console.error('Toggle 2FA error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

module.exports = {
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
};
