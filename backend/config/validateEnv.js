/**
 * Environment variable validation
 * Fails fast on startup if required or insecure variables are detected
 */
const validateEnv = () => {
    const required = [
        'MONGODB_URI',
        'JWT_SECRET',
    ];

    const recommended = [
        'NODE_ENV',
        'PORT',
        'JWT_EXPIRE',
        'JWT_REFRESH_EXPIRE',
        'CLIENT_URL',
    ];

    // ── 1. Check required variables are present ───────────────
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
        console.error(`\n❌ FATAL: Missing required environment variables: ${missing.join(', ')}`);
        console.error('   Copy .env.example → .env and fill in all values.\n');
        process.exit(1);
    }

    // ── 2. JWT_SECRET strength enforcement ───────────────────
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret.length < 32) {
        console.error('\n❌ FATAL: JWT_SECRET must be at least 32 characters long.');
        console.error('   Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64\'))"');
        process.exit(1);
    }

    // Detect placeholder / default values
    const dangerousSecrets = [
        'change_this',
        'REPLACE_WITH',
        'your_super_secret',
        'secret',
        'password',
        '12345',
    ];
    const isUnsafeSecret = dangerousSecrets.some(s =>
        jwtSecret.toLowerCase().includes(s.toLowerCase())
    );
    if (isUnsafeSecret && process.env.NODE_ENV === 'production') {
        console.error('\n❌ FATAL: JWT_SECRET looks like a placeholder. Do NOT deploy to production with a weak secret.');
        process.exit(1);
    }
    if (isUnsafeSecret) {
        console.warn('⚠️  WARNING: JWT_SECRET looks like a placeholder. Change before production!');
    }

    // ── 3. Warn about placeholder API keys ───────────────────
    const apiKeyFields = ['HF_API_KEY', 'ALPHA_VANTAGE_KEY'];
    apiKeyFields.forEach(key => {
        if (process.env[key] && process.env[key].startsWith('REPLACE_')) {
            console.warn(`⚠️  WARNING: ${key} is not set. Some AI features will be disabled.`);
        }
    });

    // ── 4. Warn about missing recommended vars ────────────────
    const missingRecommended = recommended.filter(key => !process.env[key]);
    if (missingRecommended.length > 0) {
        console.warn(`⚠️  Missing recommended env vars: ${missingRecommended.join(', ')} (using defaults)`);
    }

    // ── 5. Production-mode stricter checks ───────────────────
    if (process.env.NODE_ENV === 'production') {
        if (!process.env.CLIENT_URL || process.env.CLIENT_URL.includes('localhost')) {
            console.error('❌ FATAL: CLIENT_URL must not be localhost in production.');
            process.exit(1);
        }
    }
};

module.exports = validateEnv;
