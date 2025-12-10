// FILE: src/services/statsAggregator.js
// Background service for aggregating message data into daily statistics

const logger = require('../utils/logger');
const statsRepo = require('../db/repositories/stats');
const messagesRepo = require('../db/repositories/messages');
const guildsRepo = require('../db/repositories/guilds');

const log = logger.child('StatsAggregator');

/**
 * Aggregates statistics for a single guild
 * Consolidates message data into daily_stats for the last 7 days
 * 
 * @param {string} guildId - Discord guild ID
 * @returns {Promise<Object>} Aggregation result
 */
async function aggregateGuildStats(guildId) {
    log.debug(`Aggregating stats for guild ${guildId}`);

    try {
        // Aggregate last 7 days
        const results = await statsRepo.aggregateDays(guildId, 7);

        log.debug(`Aggregated ${results.length} days of stats for ${guildId}`);

        return {
            guildId,
            daysAggregated: results.length,
            success: true,
        };
    } catch (error) {
        log.error(`Stats aggregation failed for ${guildId}`, 'StatsAggregator', error);
        return {
            guildId,
            daysAggregated: 0,
            success: false,
            error: error.message,
        };
    }
}

/**
 * Aggregates statistics for all known guilds
 * Called periodically by the ready handler
 * 
 * @returns {Promise<Object>} Summary of aggregation results
 */
async function aggregateAllGuilds() {
    log.info('Starting aggregation for all guilds');

    try {
        const guilds = await guildsRepo.getAllGuilds();

        if (guilds.length === 0) {
            log.info('No guilds to aggregate');
            return { total: 0, success: 0, failed: 0 };
        }

        let success = 0;
        let failed = 0;

        for (const guild of guilds) {
            const result = await aggregateGuildStats(guild.guild_id);
            if (result.success) {
                success++;
            } else {
                failed++;
            }
        }

        log.info(`Aggregation complete: ${success} success, ${failed} failed out of ${guilds.length} guilds`);

        return {
            total: guilds.length,
            success,
            failed,
        };
    } catch (error) {
        log.error('Failed to aggregate all guilds', 'StatsAggregator', error);
        throw error;
    }
}

/**
 * Prunes old data for a guild to manage database size
 * Removes messages older than 90 days and stats older than 180 days
 * 
 * @param {string} guildId - Discord guild ID
 * @returns {Promise<Object>} Pruning result
 */
async function pruneGuildData(guildId) {
    log.debug(`Pruning old data for guild ${guildId}`);

    try {
        const [messagesPruned, statsPruned] = await Promise.all([
            messagesRepo.pruneOldMessages(guildId, 90),
            statsRepo.pruneOldStats(guildId, 180),
        ]);

        if (messagesPruned > 0 || statsPruned > 0) {
            log.info(
                `Pruned data for ${guildId}: ${messagesPruned} messages, ${statsPruned} stats records`,
                'StatsAggregator'
            );
        }

        return {
            guildId,
            messagesPruned,
            statsPruned,
            success: true,
        };
    } catch (error) {
        log.error(`Data pruning failed for ${guildId}`, 'StatsAggregator', error);
        return {
            guildId,
            messagesPruned: 0,
            statsPruned: 0,
            success: false,
            error: error.message,
        };
    }
}

/**
 * Prunes old data for all known guilds
 * Should be called periodically (e.g., daily) to manage database size
 * 
 * @returns {Promise<Object>} Summary of pruning results
 */
async function pruneAllGuilds() {
    log.info('Starting data pruning for all guilds');

    try {
        const guilds = await guildsRepo.getAllGuilds();

        if (guilds.length === 0) {
            log.info('No guilds to prune');
            return { total: 0, messagesPruned: 0, statsPruned: 0 };
        }

        let totalMessages = 0;
        let totalStats = 0;

        for (const guild of guilds) {
            const result = await pruneGuildData(guild.guild_id);
            if (result.success) {
                totalMessages += result.messagesPruned;
                totalStats += result.statsPruned;
            }
        }

        log.info(`Pruning complete: ${totalMessages} messages, ${totalStats} stats records removed`);

        return {
            total: guilds.length,
            messagesPruned: totalMessages,
            statsPruned: totalStats,
        };
    } catch (error) {
        log.error('Failed to prune all guilds', 'StatsAggregator', error);
        throw error;
    }
}

/**
 * Performs a full maintenance run:
 * 1. Aggregates stats for all guilds
 * 2. Prunes old data
 * 
 * Should be called daily via a scheduled task
 * 
 * @returns {Promise<Object>} Maintenance summary
 */
async function runMaintenance() {
    log.info('='.repeat(40));
    log.info('Starting maintenance run');
    log.info('='.repeat(40));

    const startTime = Date.now();

    try {
        // Step 1: Aggregate stats
        const aggregationResult = await aggregateAllGuilds();

        // Step 2: Prune old data
        const pruningResult = await pruneAllGuilds();

        const duration = Date.now() - startTime;

        log.info('='.repeat(40));
        log.info(`Maintenance complete in ${duration}ms`);
        log.info('='.repeat(40));

        return {
            duration,
            aggregation: aggregationResult,
            pruning: pruningResult,
            success: true,
        };
    } catch (error) {
        log.error('Maintenance run failed', 'StatsAggregator', error);
        return {
            duration: Date.now() - startTime,
            success: false,
            error: error.message,
        };
    }
}

module.exports = {
    aggregateGuildStats,
    aggregateAllGuilds,
    pruneGuildData,
    pruneAllGuilds,
    runMaintenance,
};
