// FILE: src/db/repositories/guilds.js
// Repository for guild (server) data operations
// Uses pg driver for PostgreSQL queries

const { query, queryOne, queryAll, transaction } = require('../pgClient');
const logger = require('../../utils/logger');

const log = logger.child('GuildsRepo');

/**
 * Creates or updates a guild record (upsert)
 * Called when the bot joins a server or on ready event
 * @param {string} guildId - Discord guild ID
 * @param {string} name - Guild name
 * @returns {Promise<Object>} The upserted guild record
 */
async function upsertGuild(guildId, name) {
    const sql = `
        INSERT INTO guilds (guild_id, name, created_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (guild_id)
        DO UPDATE SET name = EXCLUDED.name
        RETURNING *
    `;

    try {
        const result = await queryOne(sql, [guildId, name], 'upsertGuild');
        log.info(`Guild upserted: ${name} (${guildId})`);
        return result;
    } catch (error) {
        log.error(`Failed to upsert guild ${guildId}`, 'Guilds', error);
        throw error;
    }
}

/**
 * Gets a guild record by ID
 * @param {string} guildId - Discord guild ID
 * @returns {Promise<Object|null>} Guild record or null if not found
 */
async function getGuild(guildId) {
    const sql = `SELECT * FROM guilds WHERE guild_id = $1`;

    try {
        return await queryOne(sql, [guildId], 'getGuild');
    } catch (error) {
        log.error(`Failed to get guild ${guildId}`, 'Guilds', error);
        throw error;
    }
}

/**
 * Updates a guild's name
 * @param {string} guildId - Discord guild ID
 * @param {string} name - New guild name
 * @returns {Promise<Object>} Updated guild record
 */
async function updateGuildName(guildId, name) {
    const sql = `
        UPDATE guilds
        SET name = $2
        WHERE guild_id = $1
        RETURNING *
    `;

    try {
        const result = await queryOne(sql, [guildId, name], 'updateGuildName');
        log.info(`Guild name updated: ${name} (${guildId})`);
        return result;
    } catch (error) {
        log.error(`Failed to update guild name ${guildId}`, 'Guilds', error);
        throw error;
    }
}

/**
 * Deletes a guild record and all associated data
 * Called when the bot is removed from a server
 * @param {string} guildId - Discord guild ID
 * @returns {Promise<void>}
 */
async function deleteGuild(guildId) {
    const sql = `DELETE FROM guilds WHERE guild_id = $1`;

    try {
        await query(sql, [guildId], 'deleteGuild');
        log.info(`Guild deleted: ${guildId}`);
    } catch (error) {
        log.error(`Failed to delete guild ${guildId}`, 'Guilds', error);
        throw error;
    }
}

/**
 * Gets all guilds the bot is tracking
 * @returns {Promise<Array>} Array of guild records
 */
async function getAllGuilds() {
    const sql = `SELECT * FROM guilds ORDER BY created_at DESC`;

    try {
        return await queryAll(sql, [], 'getAllGuilds');
    } catch (error) {
        log.error('Failed to get all guilds', 'Guilds', error);
        throw error;
    }
}

/**
 * Ensures a guild exists in the database with settings
 * Creates guild, settings, and subscription if they don't exist
 * @param {string} guildId - Discord guild ID
 * @param {string} name - Guild name
 * @param {number} [memberCount] - Optional member count (not used currently)
 * @returns {Promise<Object>} Guild record
 */
async function ensureGuild(guildId, name, memberCount = 0) {
    try {
        // Use a transaction to ensure all records are created
        return await transaction(async (client) => {
            // Upsert guild (simple version without member_count to avoid schema issues)
            const guildSql = `
                INSERT INTO guilds (guild_id, name, created_at)
                VALUES ($1, $2, NOW())
                ON CONFLICT (guild_id)
                DO UPDATE SET name = EXCLUDED.name
                RETURNING *
            `;
            const guildResult = await client.query(guildSql, [guildId, name]);
            const guild = guildResult.rows[0];

            // Ensure settings exist
            const settingsSql = `
                INSERT INTO guild_settings (guild_id, language, created_at, updated_at)
                VALUES ($1, 'pt-BR', NOW(), NOW())
                ON CONFLICT (guild_id) DO NOTHING
            `;
            await client.query(settingsSql, [guildId]);

            // Ensure subscription exists (defaults to free)
            const subSql = `
                INSERT INTO subscriptions (guild_id, plan, started_at, created_at, updated_at)
                VALUES ($1, 'free', NOW(), NOW(), NOW())
                ON CONFLICT (guild_id) DO NOTHING
            `;
            await client.query(subSql, [guildId]);

            log.info(`Guild ensured: ${name} (${guildId})`);
            return guild;
        });
    } catch (error) {
        log.error(`Failed to ensure guild ${guildId}`, 'Guilds', error);
        throw error;
    }
}

/**
 * Gets the count of tracked guilds
 * @returns {Promise<number>} Number of guilds
 */
async function getGuildCount() {
    const sql = `SELECT COUNT(*) as count FROM guilds`;

    try {
        const result = await queryOne(sql, [], 'getGuildCount');
        return parseInt(result.count, 10);
    } catch (error) {
        log.error('Failed to get guild count', 'Guilds', error);
        throw error;
    }
}

/**
 * Checks if a guild exists
 * @param {string} guildId - Discord guild ID
 * @returns {Promise<boolean>} True if guild exists
 */
async function guildExists(guildId) {
    const sql = `SELECT EXISTS(SELECT 1 FROM guilds WHERE guild_id = $1) as exists`;

    try {
        const result = await queryOne(sql, [guildId], 'guildExists');
        return result.exists;
    } catch (error) {
        log.error(`Failed to check if guild exists ${guildId}`, 'Guilds', error);
        throw error;
    }
}

module.exports = {
    upsertGuild,
    getGuild,
    updateGuildName,
    deleteGuild,
    getAllGuilds,
    ensureGuild,
    getGuildCount,
    guildExists,
};
