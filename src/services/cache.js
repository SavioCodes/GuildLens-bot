/**
 * Cache Service for GuildLens
 * In-memory caching layer to reduce database queries
 */

const logger = require('../utils/logger');
const log = logger.child('Cache');

class CacheService {
    constructor() {
        this.cache = new Map();
        this.ttlMap = new Map();

        // Default TTLs (in milliseconds)
        this.TTL = {
            PLAN: 5 * 60 * 1000,      // 5 minutes
            SETTINGS: 2 * 60 * 1000,   // 2 minutes
            STATS: 1 * 60 * 1000,      // 1 minute
            HEALTH: 30 * 1000,         // 30 seconds
        };

        // Stats
        this.hits = 0;
        this.misses = 0;

        // Cleanup interval
        setInterval(() => this.cleanup(), 60 * 1000);
    }

    /**
     * Get a cached value
     * @param {string} key - Cache key
     * @returns {*} Cached value or undefined
     */
    get(key) {
        const ttl = this.ttlMap.get(key);

        if (!ttl || Date.now() > ttl) {
            // Expired or doesn't exist
            this.cache.delete(key);
            this.ttlMap.delete(key);
            this.misses++;
            return undefined;
        }

        this.hits++;
        return this.cache.get(key);
    }

    /**
     * Set a cached value
     * @param {string} key - Cache key
     * @param {*} value - Value to cache
     * @param {number} [ttl] - TTL in milliseconds (default: 60s)
     */
    set(key, value, ttl = 60000) {
        this.cache.set(key, value);
        this.ttlMap.set(key, Date.now() + ttl);
    }

    /**
     * Delete a cached value
     * @param {string} key - Cache key
     */
    delete(key) {
        this.cache.delete(key);
        this.ttlMap.delete(key);
    }

    /**
     * Clear cache for a specific pattern
     * @param {string} pattern - Pattern to match (e.g., 'guild:123')
     */
    clearPattern(pattern) {
        let cleared = 0;
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                this.cache.delete(key);
                this.ttlMap.delete(key);
                cleared++;
            }
        }
        if (cleared > 0) {
            log.debug(`Cleared ${cleared} cache entries matching: ${pattern}`);
        }
    }

    /**
     * Cleanup expired entries
     */
    cleanup() {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, expires] of this.ttlMap) {
            if (now > expires) {
                this.cache.delete(key);
                this.ttlMap.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            log.debug(`Cache cleanup: removed ${cleaned} expired entries`);
        }
    }

    /**
     * Get cache statistics
     */
    getStats() {
        const total = this.hits + this.misses;
        const hitRate = total > 0 ? ((this.hits / total) * 100).toFixed(1) : 0;

        return {
            entries: this.cache.size,
            hits: this.hits,
            misses: this.misses,
            hitRate: `${hitRate}%`
        };
    }

    // ========== CONVENIENCE METHODS ==========

    /**
     * Get or set pattern - fetches from cache or runs getter function
     */
    async getOrSet(key, getter, ttl = 60000) {
        const cached = this.get(key);
        if (cached !== undefined) {
            return cached;
        }

        const value = await getter();
        this.set(key, value, ttl);
        return value;
    }

    // Plan cache helpers
    planKey(guildId) { return `plan:${guildId}`; }
    settingsKey(guildId) { return `settings:${guildId}`; }
    healthKey(guildId) { return `health:${guildId}`; }
}

// Singleton
const cache = new CacheService();

module.exports = cache;
