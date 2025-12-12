// FILE: src/db/repositories/settings.js
// Repository for guild settings data operations
// Uses pg driver for PostgreSQL queries

const { queryOne } = require('../pgClient');
const logger = require('../../utils/logger');
const { DEFAULTS } = require('../../config/constants');

const log = logger.child('SettingsRepo');

/**
 * Gets settings for a guild
 * @param {string} guildId - Discord guild ID
 * @returns {Promise<Object|null>} Settings record or null if not found
 */
async function getSettings(guildId) {
    const sql = `SELECT * FROM guild_settings WHERE guild_id = $1`;

    try {
        return await queryOne(sql, [guildId], 'getSettings');
    } catch (error) {
        log.error(`Failed to get settings for ${guildId}`, 'Settings', error);
        throw error;
    }
}

/**
 * Creates or updates settings for a guild
 * @param {string} guildId - Discord guild ID
 * @param {Object} settings - Settings to save
 * @param {Array<string>} [settings.monitoredChannels] - Array of channel IDs to monitor
 * @param {string} [settings.language] - Language code (e.g., 'pt-BR')
 * @param {string|null} [settings.staffRoleId] - Staff role ID for alerts
 * @returns {Promise<Object>} The saved settings record
 */
async function upsertSettings(guildId, settings) {
    const monitoredChannels = settings.monitoredChannels !== undefined
        ? JSON.stringify(settings.monitoredChannels)
        : null;

    const language = settings.language || DEFAULTS.LANGUAGE;
    const staffRoleId = settings.staffRoleId || null;

    const sql = `
        INSERT INTO guild_settings (guild_id, language, monitored_channels, staff_role_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT (guild_id)
        DO UPDATE SET
            language = COALESCE($2, guild_settings.language),
            monitored_channels = COALESCE($3, guild_settings.monitored_channels),
            staff_role_id = $4,
            updated_at = NOW()
        RETURNING *
    `;

    try {
        const result = await queryOne(sql, [guildId, language, monitoredChannels, staffRoleId], 'upsertSettings');
        invalidateCache(guildId);
        log.info(`Settings upserted for guild ${guildId}`);
        return result;
    } catch (error) {
        log.error(`Failed to upsert settings for ${guildId}`, 'Settings', error);
        throw error;
    }
}

/**
 * Gets the monitored channels for a guild
 * Returns null if all channels should be monitored
 * @param {string} guildId - Discord guild ID
 * @returns {Promise<Array<string>|null>} Array of channel IDs, or null for "all"
 */
async function getMonitoredChannels(guildId) {
    const settings = await getSettings(guildId);

    if (!settings || settings.monitored_channels === null) {
        return null; // null means monitor all channels
    }

    // Parse JSONB if it's a string, otherwise use as-is
    if (typeof settings.monitored_channels === 'string') {
        try {
            return JSON.parse(settings.monitored_channels);
        } catch {
            return null;
        }
    }

    return settings.monitored_channels;
}

/**
 * Sets which channels to monitor for a guild
 * @param {string} guildId - Discord guild ID
 * @param {Array<string>|null} channelIds - Array of channel IDs, or null for "all"
 * @returns {Promise<Object>} Updated settings record
 */
async function setMonitoredChannels(guildId, channelIds) {
    const sql = `
        UPDATE guild_settings
        SET monitored_channels = $2, updated_at = NOW()
        WHERE guild_id = $1
        RETURNING *
    `;

    const jsonChannels = channelIds === null ? null : JSON.stringify(channelIds);

    try {
        const result = await queryOne(sql, [guildId, jsonChannels], 'setMonitoredChannels');
        invalidateCache(guildId);
        log.info(`Monitored channels updated for guild ${guildId}`);
        return result;
    } catch (error) {
        log.error(`Failed to set monitored channels for ${guildId}`, 'Settings', error);
        throw error;
    }
}

/**
 * Gets the language setting for a guild
 * @param {string} guildId - Discord guild ID
 * @returns {Promise<string>} Language code (defaults to configured default)
 */
async function getLanguage(guildId) {
    const settings = await getSettings(guildId);

    if (!settings || !settings.language) {
        return DEFAULTS.LANGUAGE;
    }

    return settings.language;
}

/**
 * Sets the language for a guild
 * @param {string} guildId - Discord guild ID
 * @param {string} language - Language code
 * @returns {Promise<Object>} Updated settings record
 */
async function setLanguage(guildId, language) {
    const sql = `
        UPDATE guild_settings
        SET language = $2, updated_at = NOW()
        WHERE guild_id = $1
        RETURNING *
    `;

    try {
        const result = await queryOne(sql, [guildId, language], 'setLanguage');
        log.info(`Language updated for guild ${guildId}: ${language}`);
        return result;
    } catch (error) {
        log.error(`Failed to set language for ${guildId}`, 'Settings', error);
        throw error;
    }
}

/**
 * Gets the staff role ID for a guild
 * @param {string} guildId - Discord guild ID
 * @returns {Promise<string|null>} Staff role ID or null if not set
 */
async function getStaffRoleId(guildId) {
    const settings = await getSettings(guildId);

    if (!settings) {
        return null;
    }

    return settings.staff_role_id;
}

/**
 * Sets the staff role for alerts
 * @param {string} guildId - Discord guild ID
 * @param {string|null} roleId - Role ID or null to clear
 * @returns {Promise<Object>} Updated settings record
 */
async function setStaffRoleId(guildId, roleId) {
    const sql = `
        UPDATE guild_settings
        SET staff_role_id = $2, updated_at = NOW()
        WHERE guild_id = $1
        RETURNING *
    `;

    try {
        const result = await queryOne(sql, [guildId, roleId], 'setStaffRoleId');
        log.info(`Staff role updated for guild ${guildId}: ${roleId || 'cleared'}`);
        return result;
    } catch (error) {
        log.error(`Failed to set staff role for ${guildId}`, 'Settings', error);
        throw error;
    }
}

/**
 * Settings cache configuration
 */
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const settingsCache = new Map();

/**
 * Invalidate cache for a guild
 * @param {string} guildId 
 */
function invalidateCache(guildId) {
    settingsCache.delete(guildId);
}

/**
 * Checks if a channel should be monitored
 * Uses in-memory caching to reduce database load
 * @param {string} guildId - Discord guild ID
 * @param {string} channelId - Channel ID to check
 * @returns {Promise<boolean>} True if channel should be monitored
 */
async function shouldMonitorChannel(guildId, channelId) {
    const now = Date.now();
    const cached = settingsCache.get(guildId);

    let monitoredChannels;

    if (cached && cached.expiresAt > now) {
        monitoredChannels = cached.channels;
    } else {
        monitoredChannels = await getMonitoredChannels(guildId);
        settingsCache.set(guildId, {
            channels: monitoredChannels,
            expiresAt: now + CACHE_TTL
        });
    }

    // null means monitor all channels
    if (monitoredChannels === null) {
        return true;
    }

    // Empty array also means monitor all (legacy behavior)
    if (Array.isArray(monitoredChannels) && monitoredChannels.length === 0) {
        return true;
    }

    return monitoredChannels.includes(channelId);
}

/**
 * Ensures settings exist for a guild with defaults
 * @param {string} guildId - Discord guild ID
 * @returns {Promise<Object>} Settings record
 */
async function ensureSettings(guildId) {
    const existing = await getSettings(guildId);

    if (existing) {
        return existing;
    }

    return await upsertSettings(guildId, {
        monitoredChannels: null, // null = monitor all
        language: DEFAULTS.LANGUAGE,
        staffRoleId: null,
    });
}

/**
 * Sets the alerts channel for auto-alerts (Growth plan)
 * @param {string} guildId - Discord guild ID
 * @param {string|null} channelId - Channel ID or null to disable
 * @returns {Promise<Object>} Updated settings record
 */
async function setAlertsChannelId(guildId, channelId) {
    const sql = `
        UPDATE guild_settings
        SET alerts_channel_id = $2, updated_at = NOW()
        WHERE guild_id = $1
        RETURNING *
    `;

    try {
        const result = await queryOne(sql, [guildId, channelId], 'setAlertsChannelId');
        log.info(`Alerts channel updated for guild ${guildId}: ${channelId || 'disabled'}`);
        return result;
    } catch (error) {
        log.error(`Failed to set alerts channel for ${guildId}`, 'Settings', error);
        throw error;
    }
}

/**
 * Deletes settings for a guild
 * @param {string} guildId - Discord guild ID
 * @returns {Promise<boolean>} True if deleted, false otherwise
 */
async function deleteSettings(guildId) {
    const sql = `DELETE FROM guild_settings WHERE guild_id = $1 RETURNING guild_id`;

    try {
        const result = await queryOne(sql, [guildId], 'deleteSettings');
        if (result) {
            invalidateCache(guildId);
            log.info(`Settings deleted for guild ${guildId}`);
            return true;
        }
        return false;
    } catch (error) {
        log.error(`Failed to delete settings for ${guildId}`, 'Settings', error);
        throw error;
    }
}

module.exports = {
    getSettings,
    upsertSettings,
    getMonitoredChannels,
    setMonitoredChannels,
    getLanguage,
    setLanguage,
    getStaffRoleId,
    setStaffRoleId,
    setAlertsChannelId,
    shouldMonitorChannel,
    ensureSettings,
    deleteSettings,
};
