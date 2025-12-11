/**
 * Input Validation Utilities
 * Centralized validation to prevent injection and misuse.
 */

const { BOT_OWNER_ID, OWNER_IDS } = require('./constants');

// Dangerous SQL patterns (case-insensitive)
const SQL_INJECTION_PATTERNS = [
    /DROP\s+TABLE/i,
    /DELETE\s+FROM/i,
    /INSERT\s+INTO/i,
    /UPDATE\s+.*\s+SET/i,
    /UNION\s+SELECT/i,
    /OR\s+1\s*=\s*1/i,
    /--\s*$/,
    /;\s*DROP/i,
];

// Dangerous XSS patterns
const XSS_PATTERNS = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /eval\s*\(/i,
];

const Validation = {

    /**
     * Checks if a user is an authorized owner
     * @param {string} userId 
     * @returns {boolean}
     */
    isOwner: (userId) => {
        if (userId === BOT_OWNER_ID) return true;
        if (OWNER_IDS && OWNER_IDS.includes(userId)) return true;
        return false;
    },

    /**
     * Validates a string input for safe length and content
     * @param {string} input 
     * @param {number} maxLength 
     * @returns {boolean}
     */
    isValidString: (input, maxLength = 2000) => {
        if (!input || typeof input !== 'string') return false;
        if (input.length > maxLength) return false;

        // Check for SQL injection patterns
        for (const pattern of SQL_INJECTION_PATTERNS) {
            if (pattern.test(input)) return false;
        }

        return true;
    },

    /**
     * Sanitizes a string for safe display (removes XSS)
     * @param {string} input 
     * @returns {string}
     */
    sanitizeForDisplay: (input) => {
        if (!input || typeof input !== 'string') return '';

        // Remove XSS patterns
        let safe = input;
        for (const pattern of XSS_PATTERNS) {
            safe = safe.replace(pattern, '');
        }

        // Escape HTML entities
        return safe
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
    },

    /**
     * Validates if a Guild ID is valid Discord snowflake
     * @param {string} id 
     * @returns {boolean}
     */
    isValidSnowflake: (id) => {
        return /^\d{17,19}$/.test(id);
    },

    /**
     * Rate limit check helper
     * @param {Map} limitMap 
     * @param {string} key 
     * @param {number} maxRequests 
     * @param {number} windowMs 
     * @returns {boolean}
     */
    checkRateLimit: (limitMap, key, maxRequests, windowMs) => {
        const now = Date.now();
        const data = limitMap.get(key);

        if (!data || data.resetAt < now) {
            limitMap.set(key, { count: 1, resetAt: now + windowMs });
            return true;
        }

        if (data.count >= maxRequests) {
            return false;
        }

        data.count++;
        return true;
    },

    /**
     * Sanitizes a string by trimming and limiting length
     * @param {string} input - The string to sanitize
     * @param {number} maxLength - Maximum allowed length
     * @returns {string} Sanitized string
     */
    sanitizeString: (input, maxLength = 2000) => {
        if (!input || typeof input !== 'string') return '';

        // Trim whitespace
        let sanitized = input.trim();

        // Limit length
        if (sanitized.length > maxLength) {
            sanitized = sanitized.substring(0, maxLength);
        }

        // Remove null bytes and control characters (except newlines)
        sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

        return sanitized;
    }
};

// Also export sanitizeString directly for convenience
module.exports = Validation;
module.exports.sanitizeString = Validation.sanitizeString;

