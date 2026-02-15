const User = require('../models/User');
const RiskProfile = require('../models/RiskProfile');

/**
 * @route   POST /api/risk-profile
 * @desc    Save or update user's risk profile
 * @access  Private
 */
const saveRiskProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            investmentHorizon,
            riskTolerance,
            investmentExperience,
            financialGoal,
            monthlyIncome,
        } = req.body;

        // Calculate risk level based on answers
        let riskScore = 0;

        // Investment horizon scoring
        if (investmentHorizon === 'Long-term (5+ years)') riskScore += 3;
        else if (investmentHorizon === 'Medium-term (1-5 years)') riskScore += 2;
        else riskScore += 1;

        // Risk tolerance scoring
        if (riskTolerance === 'Aggressive') riskScore += 3;
        else if (riskTolerance === 'Moderate') riskScore += 2;
        else riskScore += 1;

        // Experience scoring
        if (investmentExperience === 'Expert') riskScore += 3;
        else if (investmentExperience === 'Intermediate') riskScore += 2;
        else riskScore += 1;

        // Calculate final risk level
        let calculatedRiskLevel;
        if (riskScore >= 7) calculatedRiskLevel = 'High';
        else if (riskScore >= 5) calculatedRiskLevel = 'Medium';
        else calculatedRiskLevel = 'Low';

        // Update or create risk profile
        let riskProfile = await RiskProfile.findOne({ userId });

        if (riskProfile) {
            // Update existing profile
            riskProfile.investmentHorizon = investmentHorizon;
            riskProfile.riskTolerance = riskTolerance;
            riskProfile.investmentExperience = investmentExperience;
            riskProfile.financialGoal = financialGoal;
            riskProfile.monthlyIncome = monthlyIncome;
            riskProfile.calculatedRiskLevel = calculatedRiskLevel;
            await riskProfile.save();
        } else {
            // Create new profile
            riskProfile = await RiskProfile.create({
                userId,
                investmentHorizon,
                riskTolerance,
                investmentExperience,
                financialGoal,
                monthlyIncome,
                calculatedRiskLevel,
            });
        }

        // Update user's risk profile field
        await User.findByIdAndUpdate(userId, { riskProfile: calculatedRiskLevel });

        res.status(200).json({
            success: true,
            message: 'Risk profile saved successfully',
            data: riskProfile,
        });
    } catch (error) {
        console.error('Save risk profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while saving risk profile',
            error: error.message,
        });
    }
};

/**
 * @route   GET /api/risk-profile
 * @desc    Get user's risk profile
 * @access  Private
 */
const getRiskProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const riskProfile = await RiskProfile.findOne({ userId });

        if (!riskProfile) {
            return res.status(404).json({
                success: false,
                message: 'Risk profile not found',
            });
        }

        res.status(200).json({
            success: true,
            data: riskProfile,
        });
    } catch (error) {
        console.error('Get risk profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching risk profile',
            error: error.message,
        });
    }
};

module.exports = { saveRiskProfile, getRiskProfile };
