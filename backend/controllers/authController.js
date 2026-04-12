const User = require('../models/User');
const Portfolio = require('../models/Portfolio');
const jwt = require('jsonwebtoken');
const { logger } = require('../middleware/errorHandler');
const tokenBlacklist = require('../utils/tokenBlacklist');

// ─── Token Helpers ────────────────────────────────────────────

/**
 * Generate short-lived JWT access token (15 min default)
 */
const generateAccessToken = (id, role) => {
    return jwt.sign(
        { id, role, type: 'access' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '15m' }
    );
};

/**
 * Generate long-lived JWT refresh token (7d default)
 */
const generateRefreshToken = (id) => {
    return jwt.sign(
        { id, type: 'refresh' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
    );
};

/**
 * Decode token expiry without verification (for blacklist TTL)
 * Returns seconds until expiry, or 3600 as fallback
 */
const getTokenTTL = (token) => {
    try {
        const decoded = jwt.decode(token);
        if (decoded && decoded.exp) {
            return Math.max(0, decoded.exp - Math.floor(Date.now() / 1000));
        }
    } catch (_) { /* ignore */ }
    return 3600;
};

// ─── Controllers ──────────────────────────────────────────────

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user account
 * @access  Public
 * @security Rate-limited (authLimiter) + Pydantic-style validation (express-validator)
 */
const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Manual final validation layer (defence in depth after express-validator)
        if (!name?.trim() || !email?.trim() || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide name, email, and password',
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters',
            });
        }

        // Sanitize name — strip potential XSS
        const cleanName = name.trim().replace(/<[^>]*>/g, '');

        // Check duplicate BEFORE creating (atomic duplicate prevention)
        const existingUser = await User.findOne({ email: email.toLowerCase().trim() })
            .lean()
            .select('_id');

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'An account with this email already exists',
            });
        }

        const user = await User.create({
            name: cleanName,
            email: email.toLowerCase().trim(),
            password,
            role: 'user',
        });

        // Create empty portfolio for new user
        try {
            await Portfolio.create({ userId: user._id, holdings: [] });
        } catch (portfolioErr) {
            logger.warn(`Portfolio creation failed for user ${user._id}: ${portfolioErr.message}`);
            // Non-fatal — user can still proceed
        }

        const accessToken = generateAccessToken(user._id, user.role);
        const refreshToken = generateRefreshToken(user._id);

        logger.info(`New user registered: ${user.email} (${user._id})`);

        return res.status(201).json({
            success: true,
            message: 'Account created successfully',
            token: accessToken,
            refreshToken,
            user: user.toSafeObject(),
        });
    } catch (error) {
        logger.error('Register error:', { message: error.message, stack: error.stack });

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'An account with this email already exists',
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Registration failed. Please try again later.',
        });
    }
};

/**
 * @route   POST /api/auth/login
 * @desc    Login user and issue JWT tokens
 * @access  Public
 * @security Rate-limited + Account lockout after N failed attempts
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email?.trim() || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide both email and password',
            });
        }

        // Fetch with sensitive fields needed for auth
        const user = await User.findOne({ email: email.toLowerCase().trim() })
            .select('+password +loginAttempts +lockUntil');

        // Check if account exists — use constant-time response to prevent user enumeration
        if (!user) {
            // Simulate bcrypt delay to prevent timing attacks
            await new Promise(r => setTimeout(r, 200));
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
            });
        }

        // Check account lockout
        if (user.isLocked) {
            const lockExpiry = new Date(user.lockUntil).toLocaleTimeString();
            return res.status(423).json({
                success: false,
                message: `Account locked due to too many failed attempts. Try again after ${lockExpiry}`,
                code: 'ACCOUNT_LOCKED',
            });
        }

        // Verify password
        const isPasswordMatch = await user.comparePassword(password);

        if (!isPasswordMatch) {
            // Increment failure counter — may trigger account lock
            await user.incrementLoginAttempts();

            const remainingAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5') -
                (user.loginAttempts + 1);

            logger.warn(`Failed login for ${email} — IP: ${req.ip}`);

            return res.status(401).json({
                success: false,
                message: remainingAttempts > 0
                    ? `Invalid email or password. ${remainingAttempts} attempt(s) remaining.`
                    : 'Account locked due to too many failed login attempts.',
            });
        }

        // Successful login — reset failure counter
        await user.resetLoginAttempts();

        const accessToken = generateAccessToken(user._id, user.role);
        const refreshToken = generateRefreshToken(user._id);

        logger.info(`User login: ${user.email} — IP: ${req.ip}`);

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            token: accessToken,
            refreshToken,
            user: user.toSafeObject(),
        });
    } catch (error) {
        logger.error('Login error:', { message: error.message });
        return res.status(500).json({
            success: false,
            message: 'Login failed. Please try again later.',
        });
    }
};

/**
 * @route   POST /api/auth/logout
 * @desc    Logout — invalidate current access token
 * @access  Private
 */
const logout = async (req, res) => {
    try {
        const token = req.token; // Attached by protect middleware

        if (token) {
            const ttl = getTokenTTL(token);
            tokenBlacklist.add(token, ttl);
        }

        logger.info(`User logout: ${req.user?.email}`);

        return res.status(200).json({
            success: true,
            message: 'Logged out successfully',
        });
    } catch (error) {
        logger.error('Logout error:', { message: error.message });
        return res.status(500).json({
            success: false,
            message: 'Logout failed',
        });
    }
};

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user profile
 * @access  Private
 */
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        return res.status(200).json({
            success: true,
            user: user.toSafeObject(),
        });
    } catch (error) {
        logger.error('Get user error:', { message: error.message });
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve user profile',
        });
    }
};

/**
 * @route   POST /api/auth/refresh
 * @desc    Issue new access token using a valid refresh token
 * @access  Public
 */
const refreshToken = async (req, res) => {
    try {
        const { refreshToken: token } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token is required',
            });
        }

        // Check if refresh token was blacklisted (logout scenario)
        if (tokenBlacklist.has(token)) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token has been invalidated',
            });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (jwtError) {
            return res.status(401).json({
                success: false,
                message: jwtError.name === 'TokenExpiredError'
                    ? 'Refresh token expired — please login again'
                    : 'Invalid refresh token',
            });
        }

        if (decoded.type !== 'refresh') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token type — refresh token required',
            });
        }

        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User account not found',
            });
        }

        if (user.isLocked) {
            return res.status(423).json({
                success: false,
                message: 'Account is locked',
            });
        }

        // Rotate tokens — blacklist old refresh token, issue new pair
        const oldTTL = getTokenTTL(token);
        tokenBlacklist.add(token, oldTTL);

        const newAccessToken = generateAccessToken(user._id, user.role);
        const newRefreshToken = generateRefreshToken(user._id);

        return res.status(200).json({
            success: true,
            token: newAccessToken,
            refreshToken: newRefreshToken,
        });
    } catch (error) {
        logger.error('Refresh token error:', { message: error.message });
        return res.status(401).json({
            success: false,
            message: 'Token refresh failed',
        });
    }
};

module.exports = { register, login, logout, getMe, refreshToken };
