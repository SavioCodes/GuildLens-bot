/**
 * Security utilities for the API Server
 */

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 60; // 60 requests per minute
const ipLimits = new Map();

// Cleanup intervals
setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of ipLimits) {
        if (data.resetAt < now) {
            ipLimits.delete(ip);
        }
    }
}, 5 * 60 * 1000); // 5 minutes

/**
 * Applies security headers to the response
 * @param {http.ServerResponse} res - Response object
 */
function applySecurityHeaders(res) {
    // Prevent XSS
    res.setHeader('X-XSS-Protection', '1; mode=block');
    // Prevent MIME sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Frame protection
    res.setHeader('X-Frame-Options', 'DENY');
    // HSTS (Strict HTTPS) - Optional but good practice
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    // Referrer Policy
    res.setHeader('Referrer-Policy', 'no-referrer');
    // Content Security Policy (very strict)
    res.setHeader('Content-Security-Policy', "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none';");
    res.setHeader('X-Powered-By', 'GuildLens-Shield'); // Obfuscate real stack
}

/**
 * Checks if an IP is rate limited
 * @param {string} ip - IP address
 * @returns {boolean} True if allowed, False if blocked
 */
function checkIpRateLimit(ip) {
    const now = Date.now();
    const data = ipLimits.get(ip);

    if (data) {
        if (data.resetAt < now) {
            // Expired, reset
            ipLimits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
            return true;
        }

        if (data.count >= MAX_REQUESTS) {
            return false; // Blocked
        }

        data.count++;
        return true;
    }

    // New IP
    ipLimits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
}

module.exports = {
    applySecurityHeaders,
    checkIpRateLimit
};
