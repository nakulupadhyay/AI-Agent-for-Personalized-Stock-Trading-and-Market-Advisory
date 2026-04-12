const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

/**
 * User Schema — production-grade with security fields
 * Features: bcrypt hashing, account lockout, role-based access
 */
const userSchema = new mongoose.Schema({
    // ── Identity ─────────────────────────────────────────────
    name: {
        type: String,
        required: [true, 'Please provide a name'],
        trim: true,
        maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        lowercase: true,
        index: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,63})+$/,
            'Please provide a valid email address',
        ],
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: [8, 'Password must be at least 8 characters'],
        select: false, // Never returned in queries by default
    },

    // ── Authorization ─────────────────────────────────────────
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
    },

    // ── Account Lockout (brute-force protection) ──────────────
    loginAttempts: {
        type: Number,
        default: 0,
        select: false,
    },
    lockUntil: {
        type: Date,
        default: null,
        select: false,
    },

    // ── Trading Profile ───────────────────────────────────────
    riskProfile: {
        type: String,
        enum: ['Low', 'Medium', 'High'],
        default: 'Medium',
    },
    virtualBalance: {
        type: Number,
        default: 1000000, // ₹10,00,000 default virtual balance
        min: 0,
    },
    investmentHorizon: {
        type: String,
        enum: ['Short-term', 'Mid-term', 'Long-term'],
        default: 'Mid-term',
    },

    // ── Preferences ───────────────────────────────────────────
    profilePhoto: {
        type: String,
        default: '',
    },
    twoFactorEnabled: {
        type: Boolean,
        default: false,
    },
    notifications: {
        email:              { type: Boolean, default: true },
        priceAlert:         { type: Boolean, default: true },
        newsAlert:          { type: Boolean, default: true },
        aiRecommendation:   { type: Boolean, default: true },
    },
    aiSettings: {
        confidenceThreshold: { type: Number, default: 70, min: 0, max: 100 },
        sentimentWeight:     { type: Number, default: 30, min: 0, max: 100 },
        autoRefreshTime:     { type: Number, default: 60, enum: [30, 60, 300] },
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

    // ── Timestamps ────────────────────────────────────────────
    createdAt: {
        type: Date,
        default: Date.now,
    },
    lastLoginAt: {
        type: Date,
        default: null,
    },
}, {
    timestamps: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

// ── Indexes ───────────────────────────────────────────────────
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });

// ── Virtuals ──────────────────────────────────────────────────
/**
 * isLocked — true if account lockout is currently active
 */
userSchema.virtual('isLocked').get(function () {
    return this.lockUntil && this.lockUntil > Date.now();
});

// ── Pre-save Hook: Hash password ──────────────────────────────
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        const saltRounds = process.env.NODE_ENV === 'production' ? 12 : 10;
        const salt = await bcrypt.genSalt(saltRounds);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// ── Instance Methods ──────────────────────────────────────────

/**
 * Compare candidate password with stored hash
 * @param {string} candidatePassword
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * Increment login failure counter and lock account if threshold exceeded
 * Uses exponential-style lock: always locks for LOCK_TIME_MINUTES
 */
userSchema.methods.incrementLoginAttempts = async function () {
    const MAX_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5');
    const LOCK_MINUTES = parseInt(process.env.LOCK_TIME_MINUTES || '15');

    // If lock has expired, reset counter
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $set:   { loginAttempts: 1 },
            $unset: { lockUntil: 1 },
        });
    }

    const updates = { $inc: { loginAttempts: 1 } };

    // Lock account on exceeding threshold
    if (this.loginAttempts + 1 >= MAX_ATTEMPTS) {
        updates.$set = { lockUntil: new Date(Date.now() + LOCK_MINUTES * 60 * 1000) };
    }

    return this.updateOne(updates);
};

/**
 * Reset login attempts on successful login
 */
userSchema.methods.resetLoginAttempts = async function () {
    return this.updateOne({
        $set:   { loginAttempts: 0, lastLoginAt: new Date() },
        $unset: { lockUntil: 1 },
    });
};

/**
 * Build a safe, serializable user response (no sensitive fields)
 */
userSchema.methods.toSafeObject = function () {
    return {
        id:               this._id,
        name:             this.name,
        email:            this.email,
        role:             this.role,
        riskProfile:      this.riskProfile,
        virtualBalance:   this.virtualBalance,
        theme:            this.theme,
        simulationMode:   this.simulationMode,
        investmentHorizon: this.investmentHorizon,
        twoFactorEnabled: this.twoFactorEnabled,
        lastLoginAt:      this.lastLoginAt,
        createdAt:        this.createdAt,
    };
};

module.exports = mongoose.model('User', userSchema);
