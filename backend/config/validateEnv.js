/**
 * Environment variable validation
 * Fails fast on startup if required variables are missing
 */
const validateEnv = () => {
    const required = [
        'MONGODB_URI',
        'JWT_SECRET',
    ];

    const recommended = [
        'NODE_ENV',
        'PORT',
        'ML_SERVICE_URL',
        'JWT_EXPIRE',
    ];

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
        console.error('   Please check your .env file.');
        process.exit(1);
    }

    // Warn about JWT_SECRET being default
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.includes('change_this')) {
        console.warn('⚠️  WARNING: Using default JWT_SECRET. Change this in production!');
    }

    // Warn about missing recommended vars
    const missingRecommended = recommended.filter(key => !process.env[key]);
    if (missingRecommended.length > 0) {
        console.warn(`⚠️  Missing recommended env vars: ${missingRecommended.join(', ')} (using defaults)`);
    }
};

module.exports = validateEnv;
