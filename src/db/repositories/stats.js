// FILE: src/db/repositories/stats.js
// Repository for aggregated daily statistics operations
// Uses pg driver for PostgreSQL queries

const { query, queryOne, queryAll, transaction } = require('../pgClient');
const logger = require('../../utils/logger');
const { toISOString, startOfDay, daysAgo, formatDate } = require('../../utils/time');

const log = logger.child('StatsRepo');

/**
 * Upserts a daily stats record
 * @param {string} guildId - Discord guild ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {Object} stats - Stats data
 * @param {number} stats.messagesCount - Total messages for the day
 * @param {number} stats.activeMembersCount - Unique active members
 * @returns {Promise<Object>} The upserted stats record
 */
async function upsertDailyStats(guildId, date, stats) {
    const sql = `
        INSERT INTO daily_stats (guild_id, date, messages_count, active_members_count, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (guild_id, date)
        DO UPDATE SET
            messages_count = EXCLUDED.messages_count,
            active_members_count = EXCLUDED.active_members_count
        RETURNING *
    `;

    try {
        const result = await queryOne(sql, [guildId, date, stats.messagesCount, stats.activeMembersCount], 'upsertDailyStats');
        log.debug(`Daily stats upserted for ${guildId} on ${date}`);
        return result;
    } catch (error) {
        log.error(`Failed to upsert daily stats for ${guildId}`, 'Stats', error);
        throw error;
    }
}

/**
 * Gets daily stats for a date range
 * @param {string} guildId - Discord guild ID
 * @param {Date} startDate - Start of date range
 * @param {Date} endDate - End of date range
 * @returns {Promise<Array>} Array of daily stats records
 */
async function getDailyStats(guildId, startDate, endDate) {
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const sql = `
        SELECT *
        FROM daily_stats
        WHERE guild_id = $1
          AND date >= $2
          AND date <= $3
        ORDER BY date ASC
    `;

    try {
        return await queryAll(sql, [guildId, startStr, endStr], 'getDailyStats');
    } catch (error) {
        log.error(`Failed to get daily stats for ${guildId}`, 'Stats', error);
        throw error;
    }
}

/**
 * Gets the average daily messages for a period
 * @param {string} guildId - Discord guild ID
 * @param {number} days - Number of days to average
 * @returns {Promise<number>} Average messages per day
 */
async function getAverageDailyMessages(guildId, days) {
    const startDate = daysAgo(days);
    const endDate = new Date();
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const sql = `
        SELECT COALESCE(AVG(messages_count), 0) as avg_messages
        FROM daily_stats
        WHERE guild_id = $1
          AND date >= $2
          AND date <= $3
    `;

    try {
        const result = await queryOne(sql, [guildId, startStr, endStr], 'getAverageDailyMessages');
        return parseFloat(result.avg_messages);
    } catch (error) {
        log.error(`Failed to get average daily messages for ${guildId}`, 'Stats', error);
        throw error;
    }
}

/**
 * Gets the average daily active members for a period
 * @param {string} guildId - Discord guild ID
 * @param {number} days - Number of days to average
 * @returns {Promise<number>} Average active members per day
 */
async function getAverageDailyActiveMembers(guildId, days) {
    const startDate = daysAgo(days);
    const endDate = new Date();
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const sql = `
        SELECT COALESCE(AVG(active_members_count), 0) as avg_members
        FROM daily_stats
        WHERE guild_id = $1
          AND date >= $2
          AND date <= $3
    `;

    try {
        const result = await queryOne(sql, [guildId, startStr, endStr], 'getAverageDailyActiveMembers');
        return parseFloat(result.avg_members);
    } catch (error) {
        log.error(`Failed to get average daily active members for ${guildId}`, 'Stats', error);
        throw error;
    }
}

/**
 * Aggregates messages into daily stats for a specific date
 * Uses direct query on messages table
 * @param {string} guildId - Discord guild ID
 * @param {Date} date - Date to aggregate
 * @returns {Promise<Object>} The created/updated stats record
 */
async function aggregateDay(guildId, date) {
    const dayStart = startOfDay(date);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const dateStr = dayStart.toISOString().split('T')[0];

    // Get counts from messages table
    const sql = `
        SELECT
            COUNT(*) as messages_count,
            COUNT(DISTINCT author_id) as active_members_count
        FROM messages
        WHERE guild_id = $1
          AND created_at >= $2
          AND created_at <= $3
    `;

    try {
        const result = await queryOne(sql, [guildId, toISOString(dayStart), toISOString(dayEnd)], 'aggregateDay');

        const messagesCount = parseInt(result.messages_count, 10);
        const activeMembersCount = parseInt(result.active_members_count, 10);

        return await upsertDailyStats(guildId, dateStr, {
            messagesCount,
            activeMembersCount,
        });
    } catch (error) {
        log.error(`Failed to aggregate day ${dateStr} for ${guildId}`, 'Stats', error);
        throw error;
    }
}

/**
 * Aggregates messages into daily stats for the last N days
 * Typically called periodically to keep stats up to date
 * @param {string} guildId - Discord guild ID
 * @param {number} days - Number of days to aggregate (default: 7)
 * @returns {Promise<Array>} Array of aggregated stats records
 */
async function aggregateDays(guildId, days = 7) {
    const results = [];

    for (let i = 0; i < days; i++) {
        const date = daysAgo(i);
        try {
            const stats = await aggregateDay(guildId, date);
            results.push(stats);
        } catch (error) {
            log.warn(`Failed to aggregate day ${formatDate(date)} for ${guildId}`, 'Stats');
            // Continue with other days even if one fails
        }
    }

    if (results.length > 0) {
        log.info(`Aggregated ${results.length} days of stats for guild ${guildId}`);
    }

    return results;
}

/**
 * Gets stats summary for a period
 * @param {string} guildId - Discord guild ID
 * @param {number} days - Number of days to summarize
 * @returns {Promise<Object>} Stats summary object
 */
async function getStatsSummary(guildId, days) {
    const startDate = daysAgo(days);
    const endDate = new Date();
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const sql = `
        SELECT
            COALESCE(SUM(messages_count), 0) as total_messages,
            COALESCE(AVG(messages_count), 0) as avg_messages_per_day,
            COALESCE(AVG(active_members_count), 0) as avg_active_members_per_day,
            COALESCE(MAX(messages_count), 0) as peak_messages,
            COUNT(*) as days_with_data
        FROM daily_stats
        WHERE guild_id = $1
          AND date >= $2
          AND date <= $3
    `;

    try {
        const result = await queryOne(sql, [guildId, startStr, endStr], 'getStatsSummary');

        // Find peak day
        const peakSql = `
            SELECT date, messages_count
            FROM daily_stats
            WHERE guild_id = $1
              AND date >= $2
              AND date <= $3
            ORDER BY messages_count DESC
            LIMIT 1
        `;

        const peakResult = await queryOne(peakSql, [guildId, startStr, endStr], 'getPeakDay');

        return {
            totalMessages: parseInt(result.total_messages, 10),
            avgMessagesPerDay: parseFloat(result.avg_messages_per_day),
            avgActiveMembersPerDay: parseFloat(result.avg_active_members_per_day),
            peakMessages: parseInt(result.peak_messages, 10),
            peakDay: peakResult?.date || null,
            daysWithData: parseInt(result.days_with_data, 10),
        };
    } catch (error) {
        log.error(`Failed to get stats summary for ${guildId}`, 'Stats', error);
        throw error;
    }
}

/**
 * Compares stats between two periods
 * @param {string} guildId - Discord guild ID
 * @param {number} periodDays - Number of days per period
 * @returns {Promise<Object>} Comparison object with current, previous, and delta
 */
async function compareStats(guildId, periodDays) {
    const currentEnd = new Date();
    const currentStart = daysAgo(periodDays);
    const previousEnd = new Date(currentStart.getTime() - 1);
    const previousStart = daysAgo(periodDays * 2);

    const sql = `
        SELECT COALESCE(SUM(messages_count), 0) as total_messages
        FROM daily_stats
        WHERE guild_id = $1
          AND date >= $2
          AND date <= $3
    `;

    try {
        const currentResult = await queryOne(sql, [
            guildId,
            currentStart.toISOString().split('T')[0],
            currentEnd.toISOString().split('T')[0],
        ], 'compareStatsCurrent');

        const previousResult = await queryOne(sql, [
            guildId,
            previousStart.toISOString().split('T')[0],
            previousEnd.toISOString().split('T')[0],
        ], 'compareStatsPrevious');

        const currentTotal = parseInt(currentResult.total_messages, 10);
        const previousTotal = parseInt(previousResult.total_messages, 10);

        const messageDelta = previousTotal > 0
            ? ((currentTotal - previousTotal) / previousTotal) * 100
            : (currentTotal > 0 ? 100 : 0);

        return {
            current: {
                messages: currentTotal,
            },
            previous: {
                messages: previousTotal,
            },
            delta: {
                messages: messageDelta,
                isImproving: messageDelta >= 0,
            },
        };
    } catch (error) {
        log.error(`Failed to compare stats for ${guildId}`, 'Stats', error);
        throw error;
    }
}

/**
 * Deletes old stats records to manage database size
 * @param {string} guildId - Discord guild ID
 * @param {number} daysToKeep - Number of days of stats to retain
 * @returns {Promise<number>} Number of records deleted
 */
async function pruneOldStats(guildId, daysToKeep = 180) {
    const cutoffDate = daysAgo(daysToKeep);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    const sql = `
        DELETE FROM daily_stats
        WHERE guild_id = $1
          AND date < $2
    `;

    try {
        const result = await query(sql, [guildId, cutoffStr], 'pruneOldStats');
        const count = result.rowCount || 0;

        if (count > 0) {
            log.info(`Pruned ${count} old stats records for guild ${guildId}`);
        }

        return count;
    } catch (error) {
        log.error(`Failed to prune old stats for ${guildId}`, 'Stats', error);
        throw error;
    }
}

/**
 * Checks if stats exist for a specific date
 * @param {string} guildId - Discord guild ID
 * @param {string} date - Date string (YYYY-MM-DD)
 * @returns {Promise<boolean>} True if stats exist
 */
async function statsExist(guildId, date) {
    const sql = `
        SELECT EXISTS(
            SELECT 1 FROM daily_stats
            WHERE guild_id = $1 AND date = $2
        ) as exists
    `;

    try {
        const result = await queryOne(sql, [guildId, date], 'statsExist');
        return result.exists;
    } catch (error) {
        log.error(`Failed to check stats existence for ${guildId}`, 'Stats', error);
        throw error;
    }
}

module.exports = {
    upsertDailyStats,
    getDailyStats,
    getAverageDailyMessages,
    getAverageDailyActiveMembers,
    aggregateDay,
    aggregateDays,
    getStatsSummary,
    compareStats,
    pruneOldStats,
    statsExist,
};
