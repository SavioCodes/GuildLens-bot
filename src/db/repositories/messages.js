// FILE: src/db/repositories/messages.js
// Repository for message activity data operations
// Uses pg driver for PostgreSQL queries

const { query, queryOne, queryAll } = require('../pgClient');
const logger = require('../../utils/logger');
const { toISOString, getDateRange, getComparisonPeriods, getTimeSlot, getTimeSlotLabel } = require('../../utils/time');

const log = logger.child('MessagesRepo');

/**
 * Records a message in the database
 * @param {Object} messageData - Message data to record
 * @param {string} messageData.guildId - Discord guild ID
 * @param {string} messageData.channelId - Discord channel ID
 * @param {string} messageData.authorId - Discord user ID
 * @param {Date} messageData.createdAt - Message timestamp
 * @param {number} messageData.length - Message length in characters
 * @returns {Promise<Object>} The inserted message record
 */
async function recordMessage(messageData) {
    const sql = `
        INSERT INTO messages (guild_id, channel_id, author_id, created_at, length)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
    `;

    const params = [
        messageData.guildId,
        messageData.channelId,
        messageData.authorId,
        toISOString(messageData.createdAt),
        messageData.length,
    ];

    try {
        const result = await queryOne(sql, params, 'recordMessage');
        log.debug(`Message recorded: guild=${messageData.guildId}, channel=${messageData.channelId}`);
        return result;
    } catch (error) {
        log.error('Failed to record message', 'Messages', error);
        throw error;
    }
}

/**
 * Gets the total message count for a guild in a date range
 * @param {string} guildId - Discord guild ID
 * @param {Date} startDate - Start of date range
 * @param {Date} endDate - End of date range
 * @returns {Promise<number>} Total message count
 */
async function getMessageCount(guildId, startDate, endDate) {
    const sql = `
        SELECT COUNT(*) as count
        FROM messages
        WHERE guild_id = $1
          AND created_at >= $2
          AND created_at <= $3
    `;

    try {
        const result = await queryOne(sql, [guildId, toISOString(startDate), toISOString(endDate)], 'getMessageCount');
        return parseInt(result.count, 10);
    } catch (error) {
        log.error(`Failed to get message count for ${guildId}`, 'Messages', error);
        throw error;
    }
}

/**
 * Gets the count of unique active authors in a date range
 * @param {string} guildId - Discord guild ID
 * @param {Date} startDate - Start of date range
 * @param {Date} endDate - End of date range
 * @returns {Promise<number>} Number of unique authors
 */
async function getActiveAuthorCount(guildId, startDate, endDate) {
    const sql = `
        SELECT COUNT(DISTINCT author_id) as count
        FROM messages
        WHERE guild_id = $1
          AND created_at >= $2
          AND created_at <= $3
    `;

    try {
        const result = await queryOne(sql, [guildId, toISOString(startDate), toISOString(endDate)], 'getActiveAuthorCount');
        return parseInt(result.count, 10);
    } catch (error) {
        log.error(`Failed to get active author count for ${guildId}`, 'Messages', error);
        throw error;
    }
}

/**
 * Gets message counts grouped by channel for a date range
 * @param {string} guildId - Discord guild ID
 * @param {Date} startDate - Start of date range
 * @param {Date} endDate - End of date range
 * @returns {Promise<Array<{channelId: string, count: number}>>} Channel activity data
 */
async function getChannelActivity(guildId, startDate, endDate) {
    const sql = `
        SELECT channel_id, COUNT(*) as count
        FROM messages
        WHERE guild_id = $1
          AND created_at >= $2
          AND created_at <= $3
        GROUP BY channel_id
        ORDER BY count DESC
    `;

    try {
        const results = await queryAll(sql, [guildId, toISOString(startDate), toISOString(endDate)], 'getChannelActivity');
        return results.map(row => ({
            channelId: row.channel_id,
            count: parseInt(row.count, 10),
        }));
    } catch (error) {
        log.error(`Failed to get channel activity for ${guildId}`, 'Messages', error);
        throw error;
    }
}

/**
 * Gets the top N most active channels
 * @param {string} guildId - Discord guild ID
 * @param {number} days - Number of days to analyze
 * @param {number} limit - Maximum number of channels to return
 * @returns {Promise<Array<{channelId: string, count: number}>>} Top channels
 */
async function getTopChannels(guildId, days, limit = 3) {
    const { start, end } = getDateRange(days);
    const sql = `
        SELECT channel_id, COUNT(*) as count
        FROM messages
        WHERE guild_id = $1
          AND created_at >= $2
          AND created_at <= $3
        GROUP BY channel_id
        ORDER BY count DESC
        LIMIT $4
    `;

    try {
        const results = await queryAll(sql, [guildId, toISOString(start), toISOString(end), limit], 'getTopChannels');
        return results.map(row => ({
            channelId: row.channel_id,
            count: parseInt(row.count, 10),
        }));
    } catch (error) {
        log.error(`Failed to get top channels for ${guildId}`, 'Messages', error);
        throw error;
    }
}

/**
 * Gets message counts grouped by hour of day
 * @param {string} guildId - Discord guild ID
 * @param {Date} startDate - Start of date range
 * @param {Date} endDate - End of date range
 * @returns {Promise<Array<{hour: number, count: number}>>} Hourly activity data
 */
async function getHourlyActivity(guildId, startDate, endDate) {
    const sql = `
        SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as count
        FROM messages
        WHERE guild_id = $1
          AND created_at >= $2
          AND created_at <= $3
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY count DESC
    `;

    try {
        const results = await queryAll(sql, [guildId, toISOString(startDate), toISOString(endDate)], 'getHourlyActivity');
        return results.map(row => ({
            hour: parseInt(row.hour, 10),
            count: parseInt(row.count, 10),
        }));
    } catch (error) {
        log.error(`Failed to get hourly activity for ${guildId}`, 'Messages', error);
        throw error;
    }
}

/**
 * Gets the top N peak time slots
 * @param {string} guildId - Discord guild ID
 * @param {number} days - Number of days to analyze
 * @param {number} slotSize - Hours per slot (default 3)
 * @param {number} limit - Maximum number of slots to return
 * @returns {Promise<Array<{slotStart: number, label: string, count: number}>>} Peak time slots
 */
async function getPeakTimeSlots(guildId, days, slotSize = 3, limit = 3) {
    const { start, end } = getDateRange(days);
    const hourlyActivity = await getHourlyActivity(guildId, start, end);

    // Group hourly data into slots
    const slotCounts = {};
    hourlyActivity.forEach(({ hour, count }) => {
        const slotStart = getTimeSlot(hour, slotSize);
        slotCounts[slotStart] = (slotCounts[slotStart] || 0) + count;
    });

    // Convert to array with labels
    const slots = Object.entries(slotCounts)
        .map(([slotStart, count]) => ({
            slotStart: parseInt(slotStart, 10),
            label: getTimeSlotLabel(parseInt(slotStart, 10), slotSize),
            count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);

    return slots;
}

/**
 * Gets the count of "new" authors (first time posting in the period)
 * An author is "new" if their first message ever is within the date range
 * @param {string} guildId - Discord guild ID
 * @param {Date} startDate - Start of date range
 * @param {Date} endDate - End of date range
 * @returns {Promise<number>} Count of new authors
 */
async function getNewAuthorsCount(guildId, startDate, endDate) {
    // Authors who posted in the period but never posted before
    const sql = `
        SELECT COUNT(DISTINCT m.author_id) as count
        FROM messages m
        WHERE m.guild_id = $1
          AND m.created_at >= $2
          AND m.created_at <= $3
          AND NOT EXISTS (
              SELECT 1 FROM messages m2
              WHERE m2.guild_id = $1
                AND m2.author_id = m.author_id
                AND m2.created_at < $2
          )
    `;

    try {
        const result = await queryOne(sql, [guildId, toISOString(startDate), toISOString(endDate)], 'getNewAuthorsCount');
        return parseInt(result.count, 10);
    } catch (error) {
        log.error(`Failed to get new authors count for ${guildId}`, 'Messages', error);
        throw error;
    }
}

/**
 * Gets daily message counts for a guild
 * @param {string} guildId - Discord guild ID
 * @param {Date} startDate - Start of date range
 * @param {Date} endDate - End of date range
 * @returns {Promise<Array<{date: string, count: number}>>} Daily message counts
 */
async function getDailyMessageCounts(guildId, startDate, endDate) {
    const sql = `
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM messages
        WHERE guild_id = $1
          AND created_at >= $2
          AND created_at <= $3
        GROUP BY DATE(created_at)
        ORDER BY date ASC
    `;

    try {
        const results = await queryAll(sql, [guildId, toISOString(startDate), toISOString(endDate)], 'getDailyMessageCounts');
        return results.map(row => ({
            date: row.date.toISOString().split('T')[0],
            count: parseInt(row.count, 10),
        }));
    } catch (error) {
        log.error(`Failed to get daily message counts for ${guildId}`, 'Messages', error);
        throw error;
    }
}

/**
 * Gets comparison metrics between current and previous periods
 * @param {string} guildId - Discord guild ID
 * @param {number} days - Number of days per period
 * @returns {Promise<{current: Object, previous: Object, trend: string, percentage: number}>}
 */
async function getActivityComparison(guildId, days) {
    const periods = getComparisonPeriods(days);

    const [currentCount, previousCount, currentAuthors, previousAuthors] = await Promise.all([
        getMessageCount(guildId, periods.current.start, periods.current.end),
        getMessageCount(guildId, periods.previous.start, periods.previous.end),
        getActiveAuthorCount(guildId, periods.current.start, periods.current.end),
        getActiveAuthorCount(guildId, periods.previous.start, periods.previous.end),
    ]);

    // Calculate trend
    let trend = 'stable';
    let percentage = 0;

    if (previousCount > 0) {
        percentage = ((currentCount - previousCount) / previousCount) * 100;
        if (percentage > 5) {
            trend = 'up';
        } else if (percentage < -5) {
            trend = 'down';
        }
    } else if (currentCount > 0) {
        trend = 'up';
        percentage = 100;
    }

    return {
        current: {
            messages: currentCount,
            authors: currentAuthors,
            period: periods.current,
        },
        previous: {
            messages: previousCount,
            authors: previousAuthors,
            period: periods.previous,
        },
        trend,
        percentage: Math.abs(percentage),
    };
}

/**
 * Deletes old messages to manage database size
 * @param {string} guildId - Discord guild ID
 * @param {number} daysToKeep - Number of days of messages to retain
 * @returns {Promise<number>} Number of messages deleted
 */
async function pruneOldMessages(guildId, daysToKeep = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const sql = `
        DELETE FROM messages
        WHERE guild_id = $1
          AND created_at < $2
    `;

    try {
        const result = await query(sql, [guildId, toISOString(cutoffDate)], 'pruneOldMessages');
        const count = result.rowCount || 0;

        if (count > 0) {
            log.info(`Pruned ${count} old messages for guild ${guildId}`);
        }

        return count;
    } catch (error) {
        log.error(`Failed to prune old messages for ${guildId}`, 'Messages', error);
        throw error;
    }
}

/**
 * Gets all unique author IDs in a date range
 * @param {string} guildId - Discord guild ID
 * @param {Date} startDate - Start of date range
 * @param {Date} endDate - End of date range
 * @returns {Promise<Array<string>>} Array of author IDs
 */
async function getUniqueAuthors(guildId, startDate, endDate) {
    const sql = `
        SELECT DISTINCT author_id
        FROM messages
        WHERE guild_id = $1
          AND created_at >= $2
          AND created_at <= $3
    `;

    try {
        const results = await queryAll(sql, [guildId, toISOString(startDate), toISOString(endDate)], 'getUniqueAuthors');
        return results.map(row => row.author_id);
    } catch (error) {
        log.error(`Failed to get unique authors for ${guildId}`, 'Messages', error);
        throw error;
    }
}

/**
 * Gets message statistics for a guild
 * @param {string} guildId - Discord guild ID
 * @returns {Promise<Object>} Message statistics
 */
async function getMessageStats(guildId) {
    const sql = `
        SELECT
            COUNT(*) as total_messages,
            COUNT(DISTINCT author_id) as total_authors,
            COUNT(DISTINCT channel_id) as total_channels,
            MIN(created_at) as first_message,
            MAX(created_at) as last_message
        FROM messages
        WHERE guild_id = $1
    `;

    try {
        const result = await queryOne(sql, [guildId], 'getMessageStats');
        return {
            totalMessages: parseInt(result.total_messages, 10),
            totalAuthors: parseInt(result.total_authors, 10),
            totalChannels: parseInt(result.total_channels, 10),
            firstMessage: result.first_message,
            lastMessage: result.last_message,
        };
    } catch (error) {
        log.error(`Failed to get message stats for ${guildId}`, 'Messages', error);
        throw error;
    }
}

module.exports = {
    recordMessage,
    getMessageCount,
    getActiveAuthorCount,
    getChannelActivity,
    getTopChannels,
    getHourlyActivity,
    getPeakTimeSlots,
    getNewAuthorsCount,
    getDailyMessageCounts,
    getActivityComparison,
    pruneOldMessages,
    getUniqueAuthors,
    getMessageStats,
};
