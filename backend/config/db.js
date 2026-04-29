const mongoose = require('mongoose');
const { logger } = require('../middleware/errorHandler');

/**
 * Connect to MongoDB database
 * Uses connection string from environment variables
 */
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        logger.error(`❌ MongoDB Connection Error: ${error.message}`);
        throw error; // Let caller handle — don't crash the server
    }
};

module.exports = connectDB;
