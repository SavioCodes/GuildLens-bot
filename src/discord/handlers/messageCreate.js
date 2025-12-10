// FILE: src/discord/handlers/messageCreate.js
// Handler for the Discord 'messageCreate' event
// Includes rate limiting to prevent database overload

const logger = require('../../utils/logger');
const messagesRepo = require('../../db/repositories/messages');
const settingsRepo = require('../../db/repositories/settings');
const { BOT_OWNER_ID } = require('../../utils/constants');

const log = logger.child('MessageCreate');

/**
 * Rate limiting configuration
 * Prevents excessive database writes from spam
 */
const RATE_LIMIT = {
    /** Maximum messages to process per guild per window */
    maxPerGuild: 100,
    /** Maximum messages to process per user per window */
    maxPerUser: 20,
    /** Window duration in milliseconds (1 minute) */
    windowMs: 60 * 1000,
    /** Cleanup interval in milliseconds (5 minutes) */
    cleanupMs: 5 * 60 * 1000,
};

/**
 * Rate limit tracking maps
 * @type {Map<string, {count: number, resetAt: number}>}
 */
/**
 * Rate limit tracking maps
 * @type {Map<string, {count: number, resetAt: number, violations: number}>}
 */
const guildLimits = new Map();
const userLimits = new Map();
const blacklistedUsers = new Map(); // [STRICT] Blacklist for spammers

/**
 * Cleanup old rate limit entries periodically
 */
setInterval(() => {
    const now = Date.now();
    for (const [_key, data] of guildLimits) { if (data.resetAt < now) guildLimits.delete(_key); }
    for (const [_key, data] of userLimits) { if (data.resetAt < now) userLimits.delete(_key); }
    for (const [userId, expiresAt] of blacklistedUsers) { if (expiresAt < now) blacklistedUsers.delete(userId); }
}, RATE_LIMIT.cleanupMs);

/**
 * Checks if a request is within rate limits
 * @param {string} guildId - Guild ID
 * @param {string} userId - User ID
 * @returns {boolean} True if allowed, false if rate limited
 */
function checkRateLimit(guildId, userId) {
    // START: Owner Bypass
    if (userId === BOT_OWNER_ID) return true;

    const now = Date.now();

    // [STRICT] Check Blacklist
    if (blacklistedUsers.has(userId)) {
        return false; // Silently block
    }

    const resetAt = now + RATE_LIMIT.windowMs;

    // Check guild limit
    const guildKey = guildId;
    const guildData = guildLimits.get(guildKey);

    if (guildData) {
        if (guildData.resetAt < now) {
            guildLimits.set(guildKey, { count: 1, resetAt });
        } else if (guildData.count >= RATE_LIMIT.maxPerGuild) {
            return false; // Rate limited
        } else {
            guildData.count++;
        }
    } else {
        guildLimits.set(guildKey, { count: 1, resetAt });
    }

    // Check user limit (per guild)
    const userKey = `${guildId}:${userId}`;
    let userData = userLimits.get(userKey);

    if (userData) {
        if (userData.resetAt < now) {
            // Window expired, reset count but keep violations? No, reset violations on clean behavior could be nice, 
            // but for strictness we keep violations until restart or make them decay. For now simple reset.
            userData.count = 1;
            userData.resetAt = resetAt;
        } else if (userData.count >= RATE_LIMIT.maxPerUser) {
            // [STRICT] Violation Detected
            userData.violations = (userData.violations || 0) + 1;

            if (userData.violations >= 3) {
                // PENALTY: 1 Hour Blacklist
                const cooldown = 60 * 60 * 1000;
                blacklistedUsers.set(userId, now + cooldown);

                log.error(`🚫 SPAMMER DETECTED: Clamped ${userId} for 1 hour.`, 'AntiSpam');
                return false;
            }

            return false; // Rate limited
        } else {
            userData.count++;
        }
    } else {
        userLimits.set(userKey, { count: 1, resetAt, violations: 0 });
    }

    return true;
}

/**
 * Calculates total message length including embeds
 * @param {Message} message - Discord message
 * @returns {number} Total character length
 */
function calculateMessageLength(message) {
    const contentLength = message.content?.length || 0;

    const embedsLength = message.embeds.reduce((sum, embed) => {
        let len = 0;
        if (embed.title) len += embed.title.length;
        if (embed.description) len += embed.description.length;
        if (embed.fields) {
            embed.fields.forEach(f => {
                len += (f.name?.length || 0) + (f.value?.length || 0);
            });
        }
        return sum + len;
    }, 0);

    return contentLength + embedsLength;
}

/**
 * Validates message for processing
 * @param {Message} message - Discord message
 * @returns {{valid: boolean, reason?: string}}
 */
function validateMessage(message) {
    // Must be in a guild
    if (!message.guild) {
        return { valid: false, reason: 'DM' };
    }

    // Must not be from a bot
    if (message.author.bot) {
        return { valid: false, reason: 'bot' };
    }

    // Must not be a system message
    if (message.system) {
        return { valid: false, reason: 'system' };
    }

    // Must have valid IDs
    if (!message.guild.id || !message.channel.id || !message.author.id) {
        return { valid: false, reason: 'missing_ids' };
    }

    return { valid: true };
}

/**
 * Handles the messageCreate event
 * Records message activity to the database for analytics
 * 
 * @param {Message} message - Discord.js Message object
 * @returns {Promise<void>}
 */
async function handleMessageCreate(message) {
    // Validate message
    const validation = validateMessage(message);
    if (!validation.valid) {
        return;
    }

    const guildId = message.guild.id;
    const channelId = message.channel.id;
    const authorId = message.author.id;

    // Check rate limits
    if (!checkRateLimit(guildId, authorId)) {
        log.debug(`Rate limited: guild=${guildId}, user=${authorId}`, 'MessageCreate');
        return;
    }

    try {
        // Check if this channel should be monitored
        const shouldMonitor = await settingsRepo.shouldMonitorChannel(guildId, channelId);

        if (!shouldMonitor) {
            return;
        }

        // Calculate message length
        const totalLength = calculateMessageLength(message);

        // Record the message
        await messagesRepo.recordMessage({
            guildId,
            channelId,
            authorId,
            createdAt: message.createdAt,
            length: totalLength,
        });

        log.debug(`Message recorded: guild=${guildId}, channel=${channelId}, length=${totalLength}`, 'MessageCreate');

    } catch (error) {
        // Don't throw - we don't want to crash the bot on message recording failures
        log.error(`Failed to record message in ${channelId}`, 'MessageCreate', error);
    }
}

/**
 * Gets current rate limit stats (for debugging/monitoring)
 * @returns {{guilds: number, users: number}}
 */
function getRateLimitStats() {
    return {
        guilds: guildLimits.size,
        users: userLimits.size,
    };
}

module.exports = {
    handleMessageCreate,
    getRateLimitStats,
    // Exported for testing
    checkRateLimit,
    validateMessage,
    calculateMessageLength,
};
