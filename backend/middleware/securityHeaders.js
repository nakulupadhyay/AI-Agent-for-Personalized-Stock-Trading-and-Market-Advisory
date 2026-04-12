/**
 * Security Headers Middleware — Phase 2 Hardening
 * ================================================
 * Applies production-grade HTTP security headers on every response.
 * This runs AFTER Helmet as a defence-in-depth extra layer.
 *
 * Headers applied:
 *  X-Content-Type-Options    → Prevents MIME-type sniffing
 *  X-Frame-Options           → Prevents clickjacking (CSP frame-ancestors is better, but belt+suspenders)
 *  X-XSS-Protection          → Legacy browsers XSS filter
 *  Referrer-Policy           → Limits info leakage via Referer header
 *  Permissions-Policy        → Restricts browser feature access
 *  X-DNS-Prefetch-Control    → Prevents DNS prefetch (reduces info leak)
 *  Cache-Control             → Prevent caching of sensitive API responses
 *  Pragma / Expires          → Legacy cache control for older proxies
 */

const securityHeaders = (req, res, next) => {
    // Prevent MIME-type sniffing (mandatory)
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Legacy XSS filter (still useful for IE/old browsers)
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Limit information exposed via Referer header
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Restrict browser API access
    res.setHeader(
        'Permissions-Policy',
        'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=()'
    );

    // Prevent DNS prefetch information leakage
    res.setHeader('X-DNS-Prefetch-Control', 'off');

    // HSTS — force HTTPS for 1 year (also set on HTTP for test/proxy compatibility)
    res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
    );

    // Remove server identity header (belt-and-suspenders after app.disable)
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');

    // ── API Response Caching ──────────────────────────────────────
    // For authenticated API routes: prevent caching of sensitive data
    if (req.path.startsWith('/api/')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
    }

    // ── API Version Header ────────────────────────────────────────
    res.setHeader('X-API-Version', '2.1.0');

    next();
};

module.exports = securityHeaders;
