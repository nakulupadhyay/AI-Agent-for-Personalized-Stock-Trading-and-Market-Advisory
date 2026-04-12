/**
 * In-memory JWT token blacklist
 * Used to invalidate tokens on logout WITHOUT requiring Redis
 * Note: Clears on server restart (acceptable for dev; use Redis in production)
 *
 * Stores: token → expiry timestamp
 * Automatic cleanup runs every 10 minutes to prevent memory growth
 */

const blacklist = new Map();

/**
 * Add a token to the blacklist
 * @param {string} token - JWT string
 * @param {number} expirySeconds - Token TTL in seconds (from JWT exp claim)
 */
const add = (token, expirySeconds) => {
    const expiry = Date.now() + expirySeconds * 1000;
    blacklist.set(token, expiry);
};

/**
 * Check if a token is blacklisted
 * Also evicts expired entries on check (lazy cleanup)
 * @param {string} token
 * @returns {boolean}
 */
const has = (token) => {
    if (!blacklist.has(token)) return false;

    const expiry = blacklist.get(token);
    if (Date.now() > expiry) {
        blacklist.delete(token); // Token expired — evict from blacklist
        return false;
    }

    return true;
};

/**
 * Remove a token from the blacklist (e.g., on re-login)
 * @param {string} token
 */
const remove = (token) => {
    blacklist.delete(token);
};

/**
 * Periodic cleanup — runs every 10 minutes
 * Removes tokens that have already expired naturally
 */
const cleanup = () => {
    const now = Date.now();
    let removed = 0;
    for (const [token, expiry] of blacklist.entries()) {
        if (now > expiry) {
            blacklist.delete(token);
            removed++;
        }
    }
    if (removed > 0) {
        console.log(`[TokenBlacklist] Evicted ${removed} expired token(s). Size: ${blacklist.size}`);
    }
};

// Auto-cleanup every 10 minutes
setInterval(cleanup, 10 * 60 * 1000);

module.exports = { add, has, remove };
