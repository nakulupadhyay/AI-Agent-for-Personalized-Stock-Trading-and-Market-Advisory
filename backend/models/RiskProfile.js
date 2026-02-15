const mongoose = require('mongoose');

/**
 * Risk Profile Schema - Stores user's risk assessment questionnaire results
 */
const riskProfileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
    },
    investmentHorizon: {
        type: String,
        enum: ['Short-term (<1 year)', 'Medium-term (1-5 years)', 'Long-term (5+ years)'],
    },
    riskTolerance: {
        type: String,
        enum: ['Conservative', 'Moderate', 'Aggressive'],
    },
    investmentExperience: {
        type: String,
        enum: ['Beginner', 'Intermediate', 'Expert'],
    },
    financialGoal: {
        type: String,
    },
    monthlyIncome: {
        type: String,
    },
    calculatedRiskLevel: {
        type: String,
        enum: ['Low', 'Medium', 'High'],
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('RiskProfile', riskProfileSchema);
