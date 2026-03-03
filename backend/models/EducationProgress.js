const mongoose = require('mongoose');

/**
 * Education Progress Schema - Tracks user learning progress
 */
const educationProgressSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    moduleId: {
        type: String,
        required: true,
    },
    moduleName: {
        type: String,
        required: true,
    },
    completed: {
        type: Boolean,
        default: false,
    },
    quizScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
    },
    quizAttempts: {
        type: Number,
        default: 0,
    },
    timeSpent: {
        type: Number,
        default: 0,  // in minutes
    },
    bookmarked: {
        type: Boolean,
        default: false,
    },
    completedAt: {
        type: Date,
    },
    startedAt: {
        type: Date,
        default: Date.now,
    },
});

educationProgressSchema.index({ userId: 1, moduleId: 1 }, { unique: true });

module.exports = mongoose.model('EducationProgress', educationProgressSchema);
