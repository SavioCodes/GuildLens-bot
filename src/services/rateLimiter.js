/**
 * Anti-Spam Rate Limiter Service
 * Manages message quotas and temporary blacklists
 */

const logger = require('../utils/logger');
const { BOT_OWNER_ID } = require('../utils/constants');

const log = logger.child('RateLimiter');

class RateLimiter {
    constructor() {
        this.config = {
            maxPerGuild: 100,      // Max messages per guild per window
            maxPerUser: 20,        // Max messages per user per window
            windowMs: 60 * 1000,   // 1 Minute window
            cleanupMs: 5 * 60 * 1000, // 5 Minute cleanup interval
            violationThreshold: 3, // 3 strikes = blacklist
            blacklistDuration: 60 * 60 * 1000 // 1 Hour ban
        };

        // In-memory stores
        this.guildLimits = new Map();
        this.userLimits = new Map();
        this.blacklist = new Map();

        // Start cleanup job
        setInterval(() => this.cleanup(), this.config.cleanupMs);
    }

    /**
     * Checks if a request is allowed
     * @param {string} guildId 
     * @param {string} userId 
     * @returns {boolean} True if allowed
     */
    check(guildId, userId) {
        // 1. Owner Bypass
        if (userId === BOT_OWNER_ID) return true;

        // 2. Blacklist Check
        if (this.blacklist.has(userId)) return false;

        const now = Date.now();
        const resetAt = now + this.config.windowMs;

        // 3. Guild Limit Check
        if (!this.checkGuild(guildId, now, resetAt)) {
            return false;
        }

        // 4. User Limit Check
        return this.checkUser(guildId, userId, now, resetAt);
    }

    /**
     * Checks and updates guild limits
     */
    checkGuild(guildId, now, resetAt) {
        const guildData = this.guildLimits.get(guildId);

        if (!guildData) {
            this.guildLimits.set(guildId, { count: 1, resetAt });
            return true;
        }

        if (guildData.resetAt < now) {
            // Window expired, reset
            guildData.count = 1;
            guildData.resetAt = resetAt;
            return true;
        }

        if (guildData.count >= this.config.maxPerGuild) {
            return false; // Rate limited
        }

        guildData.count++;
        return true;
    }

    /**
     * Checks and updates user limits (with blacklist logic)
     */
    checkUser(guildId, userId, now, resetAt) {
        const key = `${guildId}:${userId}`;
        const userData = this.userLimits.get(key);

        if (!userData) {
            this.userLimits.set(key, { count: 1, resetAt, violations: 0 });
            return true;
        }

        if (userData.resetAt < now) {
            // Window expired
            userData.count = 1;
            userData.resetAt = resetAt;
            return true;
        }

        if (userData.count >= this.config.maxPerUser) {
            // Limit Exceeded - Check for Strike
            userData.violations = (userData.violations || 0) + 1;

            if (userData.violations >= this.config.violationThreshold) {
                this.clampUser(userId);
            }

            return false;
        }

        userData.count++;
        return true;
    }

    /**
     * Adds user to temporary blacklist
     */
    clampUser(userId) {
        const expiresAt = Date.now() + this.config.blacklistDuration;
        this.blacklist.set(userId, expiresAt);
        log.warn(`🚫 SPAMMER BLOCKED: ${userId} for 1 hour.`);
    }

    /**
     * Cleans up expired entries
     */
    cleanup() {
        const now = Date.now();

        let cleaned = 0;

        for (const [key, data] of this.guildLimits) {
            if (data.resetAt < now) { this.guildLimits.delete(key); cleaned++; }
        }

        for (const [key, data] of this.userLimits) {
            if (data.resetAt < now) { this.userLimits.delete(key); cleaned++; }
        }

        for (const [key, expiresAt] of this.blacklist) {
            if (expiresAt < now) { this.blacklist.delete(key); cleaned++; }
        }

        if (cleaned > 0) {
            log.debug(`Cleanup: Removed ${cleaned} expired entries.`);
        }
    }
}

module.exports = new RateLimiter();
