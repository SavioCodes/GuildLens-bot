// FILE: src/discord/handlers/messageCreate.js
// Handler for the Discord 'messageCreate' event
// Use RateLimiter service for spam protection

const logger = require('../../utils/logger');
const messagesRepo = require('../../db/repositories/messages');
const settingsRepo = require('../../db/repositories/settings');
const { BOT_OWNER_ID } = require('../../utils/constants');
const guardian = require('../services/guardian');
const OFFICIAL = require('../../utils/official');
const rateLimiter = require('../../services/rateLimiter');
const ticketHandler = require('../services/ticketHandler');

const log = logger.child('MessageCreate');

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

    // [GUARDIAN] Auto-Mod for Official Server
    if (guildId === OFFICIAL.GUILD_ID) {
        const isSafe = await guardian.checkContentSafety(message);
        if (!isSafe) return; // Guardian acted (deleted/warned), stop processing

        // [TICKET] Smart responses in ticket channels
        await ticketHandler.handleTicketMessage(message);
    }

    const channelId = message.channel.id;
    const authorId = message.author.id;

    // [RATE LIMIT] Check via Service
    if (!rateLimiter.check(guildId, authorId)) {
        log.debug(`Rate limited: guild=${guildId}, user=${authorId}`, 'MessageCreate');
        return;
    }

    // [MONITOR] Check if channel is monitored
    try {
        const shouldMonitor = await settingsRepo.shouldMonitorChannel(guildId, channelId);
        if (!shouldMonitor) {
            return;
        }

        // Calculate metrics
        const length = calculateMessageLength(message);
        const hasAttachments = message.attachments.size > 0;
        const hasEmbeds = message.embeds.length > 0;

        // Save to database
        await messagesRepo.recordMessage(guildId, channelId, authorId, length, hasAttachments, hasEmbeds);

    } catch (error) {
        // Log but don't crash
        log.error(`Failed to process message in ${guildId}`, error);
    }
}

module.exports = {
    handleMessageCreate,
};
