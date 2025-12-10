// FILE: src/discord/handlers/guildCreate.js
// Handler for the Discord 'guildCreate' event (bot joins a new server)

const logger = require('../../utils/logger');
const guildsRepo = require('../../db/repositories/guilds');
const settingsRepo = require('../../db/repositories/settings');

const log = logger.child('GuildCreate');

/**
 * Handles the guildCreate event when the bot joins a new server
 * @param {Guild} guild - Discord.js Guild object
 */
async function handleGuildCreate(guild) {
    log.info(`Joined new guild: ${guild.name} (${guild.id})`);
    log.info(`Members: ${guild.memberCount}`);

    try {
        // Register the guild in the database
        await guildsRepo.upsertGuild(guild.id, guild.name);

        // Initialize default settings
        await settingsRepo.ensureSettings(guild.id);

        log.success(`Guild registered successfully: ${guild.name}`);

        // Log some stats about the guild
        const textChannels = guild.channels.cache.filter(c => c.isTextBased()).size;
        log.info(`Text channels: ${textChannels}`);

    } catch (error) {
        log.error(`Failed to register guild ${guild.name}`, 'GuildCreate', error);
    }
}

/**
 * Handles the guildDelete event when the bot is removed from a server
 * @param {Guild} guild - Discord.js Guild object
 */
async function handleGuildDelete(guild) {
    log.info(`Left guild: ${guild.name} (${guild.id})`);

    try {
        // Keep the data in the database for now (in case the bot is re-added)
        // If you want to delete all data, uncomment the following:
        // await guildsRepo.deleteGuild(guild.id);

        log.info(`Guild data retained for: ${guild.name}`);

    } catch (error) {
        log.error(`Error handling guild leave for ${guild.name}`, 'GuildDelete', error);
    }
}

/**
 * Handles the guildUpdate event when a guild's info changes
 * @param {Guild} oldGuild - Old guild state
 * @param {Guild} newGuild - New guild state
 */
async function handleGuildUpdate(oldGuild, newGuild) {
    // Only react to name changes
    if (oldGuild.name !== newGuild.name) {
        log.info(`Guild renamed: ${oldGuild.name} -> ${newGuild.name}`);

        try {
            await guildsRepo.updateGuildName(newGuild.id, newGuild.name);
            log.success(`Guild name updated in database`);
        } catch (error) {
            log.error(`Failed to update guild name`, 'GuildUpdate', error);
        }
    }
}

module.exports = {
    handleGuildCreate,
    handleGuildDelete,
    handleGuildUpdate,
};
