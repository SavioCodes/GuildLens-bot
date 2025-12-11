// FILE: src/discord/handlers/ready.js
// Handler for the Discord 'ready' event

const logger = require('../../utils/logger');
const { initPool, testConnection, ensureTables } = require('../../db/pgClient');
const guildsRepo = require('../../db/repositories/guilds');
const settingsRepo = require('../../db/repositories/settings');
const statsAggregator = require('../../services/statsAggregator');
const autoAlerts = require('../../services/autoAlerts');
const officialHandler = require('./officialServer');
const OFFICIAL = require('../../utils/official');
const config = require('../../../config');

const log = logger.child('Ready');

/**
 * Handles the ready event when the bot connects to Discord
 * @param {Client} client - Discord client instance
 */
async function handleReady(client) {
    log.success(`Bot is ready! Logged in as ${client.user.tag}`);
    log.info(`Bot ID: ${client.user.id}`);
    log.info(`Serving ${client.guilds.cache.size} guild(s)`);

    // Initialize database
    try {
        log.info('Initializing database connection...');
        initPool();

        const dbConnected = await testConnection();
        if (!dbConnected) {
            log.error('Database connection failed. The bot will not function correctly.');
            log.error('Please check your SUPABASE_DB_URL environment variable.');
            return;
        }

        // Ensure tables exist
        const tablesReady = await ensureTables();
        if (!tablesReady) {
            log.error('Failed to create database tables.');
            log.error('Please run the schema.sql manually in Supabase SQL Editor.');
        }

    } catch (error) {
        log.error('Failed to initialize database', error);
    }

    // Sync guilds with database
    await syncGuilds(client);

    // Start stats aggregation interval
    startStatsAggregation(client);

    // Start auto-alerts service (for Growth plan users)
    autoAlerts.start(client);

    // [GUARDIAN] Start Official Server Protection
    const officialGuild = client.guilds.cache.get(OFFICIAL.GUILD_ID);
    if (officialGuild) {
        officialHandler.startGuardian(officialGuild).catch(err => {
            log.error('Failed to start Guardian', err);
        });
    }

    // Log ready status
    log.info('='.repeat(50));
    log.info('GuildLens is ready for action!');
    log.info('='.repeat(50));
}

/**
 * Syncs all guilds the bot is in with the database
 * @param {Client} client - Discord client instance
 */
async function syncGuilds(client) {
    log.info('Syncing guilds with database...');

    let synced = 0;
    let failed = 0;

    for (const [guildId, guild] of client.guilds.cache) {
        try {
            await guildsRepo.ensureGuild(guildId, guild.name);
            await settingsRepo.ensureSettings(guildId);
            synced++;
        } catch (error) {
            log.error(`Failed to sync guild ${guild.name} (${guildId})`, error);
            failed++;
        }
    }

    log.info(`Guild sync complete: ${synced} synced, ${failed} failed`);
}

/**
 * Starts the periodic stats aggregation task
 * @param {Client} client - Discord client instance
 */
function startStatsAggregation(client) {
    const intervalMs = config.bot.statsAggregationIntervalMs;
    const intervalMinutes = intervalMs / 60000;

    log.info(`Starting stats aggregation (every ${intervalMinutes} minutes)`);

    // Run immediately on startup (with delay to let things settle)
    setTimeout(() => {
        runStatsAggregation(client).catch(err => {
            log.error('Initial stats aggregation failed', err);
        });
    }, 10000); // 10 second delay after startup

    // Set up interval for periodic aggregation
    setInterval(() => {
        runStatsAggregation(client).catch(err => {
            log.error('Scheduled stats aggregation failed', err);
        });
    }, intervalMs);
}

/**
 * Runs stats aggregation for all guilds
 * @param {Client} client - Discord client instance
 */
async function runStatsAggregation(client) {
    log.info('Running stats aggregation for all guilds...');

    let success = 0;
    let failed = 0;

    for (const [guildId, guild] of client.guilds.cache) {
        try {
            await statsAggregator.aggregateGuildStats(guildId);
            success++;
        } catch (error) {
            log.error(`Stats aggregation failed for ${guild.name}`, error);
            failed++;
        }
    }

    log.info(`Stats aggregation complete: ${success} success, ${failed} failed`);
}

module.exports = {
    handleReady,
};
