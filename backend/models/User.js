const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

/**
 * User Schema for authentication and profile management
 */
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name'],
        trim: true,
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        lowercase: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please provide a valid email',
        ],
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: 6,
        select: false, // Don't return password in queries by default
    },
    riskProfile: {
        type: String,
        enum: ['Low', 'Medium', 'High'],
        default: 'Medium',
    },
    virtualBalance: {
        type: Number,
        default: 1000000, // ₹10,00,000 default virtual balance
    },
    profilePhoto: {
        type: String,
        default: '',
    },
    twoFactorEnabled: {
        type: Boolean,
        default: false,
    },
    investmentHorizon: {
        type: String,
        enum: ['Short-term', 'Mid-term', 'Long-term'],
        default: 'Mid-term',
    },
    notifications: {
        email: { type: Boolean, default: true },
        priceAlert: { type: Boolean, default: true },
        newsAlert: { type: Boolean, default: true },
        aiRecommendation: { type: Boolean, default: true },
    },
    aiSettings: {
        confidenceThreshold: { type: Number, default: 70, min: 0, max: 100 },
        sentimentWeight: { type: Number, default: 30, min: 0, max: 100 },
        autoRefreshTime: { type: Number, default: 60, enum: [30, 60, 300] },
    },
    simulationMode: {
        type: Boolean,
        default: true,
    },
    theme: {
        type: String,
        enum: ['dark', 'light'],
        default: 'dark',
    },
    currency: {
        type: String,
        enum: ['₹', '$'],
        default: '₹',
    },
    language: {
        type: String,
        default: 'en',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

/**
 * Hash password before saving to database
 */
userSchema.pre('save', async function (next) {
    // Only hash password if it's modified or new
    if (!this.isModified('password')) {
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

/**
 * Method to compare password for login
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
