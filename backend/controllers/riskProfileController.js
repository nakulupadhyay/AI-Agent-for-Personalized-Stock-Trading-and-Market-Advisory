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

        // Calculate risk score based on all 5 answers
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

        // Financial goal scoring
        if (financialGoal === 'Aggressive Growth') riskScore += 3;
        else if (financialGoal === 'Balanced Growth') riskScore += 2;
        else riskScore += 1;

        // Income allocation scoring
        if (monthlyIncome === 'More than 30%') riskScore += 3;
        else if (monthlyIncome === '10-30%') riskScore += 2;
        else riskScore += 1;

        // Calculate final risk level (score out of 15)
        let calculatedRiskLevel;
        if (riskScore >= 11) calculatedRiskLevel = 'High';
        else if (riskScore >= 7) calculatedRiskLevel = 'Medium';
        else calculatedRiskLevel = 'Low';

        // Update or create risk profile
        let riskProfile = await RiskProfile.findOne({ userId });

        if (riskProfile) {
            riskProfile.investmentHorizon = investmentHorizon;
            riskProfile.riskTolerance = riskTolerance;
            riskProfile.investmentExperience = investmentExperience;
            riskProfile.financialGoal = financialGoal;
            riskProfile.monthlyIncome = monthlyIncome;
            riskProfile.calculatedRiskLevel = calculatedRiskLevel;
            await riskProfile.save();
        } else {
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
            data: {
                ...riskProfile.toObject(),
                riskLevel: calculatedRiskLevel,
                riskScore: riskScore,
            },
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

        // Recalculate score for display
        let riskScore = 0;
        const h = riskProfile.investmentHorizon;
        const t = riskProfile.riskTolerance;
        const e = riskProfile.investmentExperience;
        const g = riskProfile.financialGoal;
        const m = riskProfile.monthlyIncome;

        if (h === 'Long-term (5+ years)') riskScore += 3;
        else if (h === 'Medium-term (1-5 years)') riskScore += 2;
        else riskScore += 1;

        if (t === 'Aggressive') riskScore += 3;
        else if (t === 'Moderate') riskScore += 2;
        else riskScore += 1;

        if (e === 'Expert') riskScore += 3;
        else if (e === 'Intermediate') riskScore += 2;
        else riskScore += 1;

        if (g === 'Aggressive Growth') riskScore += 3;
        else if (g === 'Balanced Growth') riskScore += 2;
        else riskScore += 1;

        if (m === 'More than 30%') riskScore += 3;
        else if (m === '10-30%') riskScore += 2;
        else riskScore += 1;

        res.status(200).json({
            success: true,
            data: {
                ...riskProfile.toObject(),
                riskLevel: riskProfile.calculatedRiskLevel,
                riskScore: riskScore,
            },
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
