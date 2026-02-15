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
