// FILE: src/services/analytics.js
// Core analytics engine for GuildLens - calculates health scores, trends, and alerts

const logger = require('../utils/logger');
const { ALERTS } = require('../config/constants');
const messagesRepo = require('../db/repositories/messages');
const { getDateRange, getComparisonPeriods } = require('../utils/time');

const log = logger.child('Analytics');

/**
 * Calculates the health score for a guild
 * 
 * Health Score Formula (0-100):
 * - Base activity score (40%): Messages per day relative to baseline
 * - Member engagement score (30%): Active members relative to target
 * - Trend score (20%): Week-over-week growth/decline
 * - Consistency score (10%): Variance in daily activity
 * 
 * @param {string} guildId - Discord guild ID
 * @returns {Promise<Object>} Health score data
 */
async function calculateHealthScore(guildId) {
    log.debug(`Calculating health score for guild ${guildId}`);

    try {
        // Get metrics for different periods
        const { start: start7, end: end7 } = getDateRange(7);
        const { start: start30, end: end30 } = getDateRange(30);

        const [
            messagesLast7Days,
            messagesLast30Days,
            activeUsersLast7Days,
            comparison,
            dailyCounts
        ] = await Promise.all([
            messagesRepo.getMessageCount(guildId, start7, end7),
            messagesRepo.getMessageCount(guildId, start30, end30),
            messagesRepo.getActiveAuthorCount(guildId, start7, end7),
            messagesRepo.getActivityComparison(guildId, 7),
            messagesRepo.getDailyMessageCounts(guildId, start7, end7),
        ]);

        // Calculate average messages per day
        const avgMessagesPerDay = messagesLast7Days / 7;

        // Calculate component scores
        const activityScore = calculateActivityScore(avgMessagesPerDay);
        const engagementScore = calculateEngagementScore(activeUsersLast7Days, avgMessagesPerDay);
        const trendScore = calculateTrendScore(comparison.trend, comparison.percentage);
        const consistencyScore = calculateConsistencyScore(dailyCounts);

        // Calculate weighted final score
        const score = Math.round(
            (activityScore * 0.40) +
            (engagementScore * 0.30) +
            (trendScore * 0.20) +
            (consistencyScore * 0.10)
        );

        // Clamp to 0-100
        const finalScore = Math.max(0, Math.min(100, score));

        // Generate interpretation
        const interpretation = generateHealthInterpretation(
            finalScore,
            comparison.trend,
            comparison.percentage,
            avgMessagesPerDay,
            activeUsersLast7Days
        );

        log.debug(`Health score for ${guildId}: ${finalScore}`);

        return {
            score: finalScore,
            messagesLast7Days,
            messagesLast30Days,
            activeUsersLast7Days,
            avgMessagesPerDay,
            trend: comparison.trend,
            trendPercentage: comparison.percentage,
            interpretation,
            components: {
                activity: activityScore,
                engagement: engagementScore,
                trend: trendScore,
                consistency: consistencyScore,
            },
        };
    } catch (error) {
        log.error(`Failed to calculate health score for ${guildId}`, error);
        throw error;
    }
}

/**
 * Calculates activity score based on messages per day
 * Uses a logarithmic scale to handle servers of different sizes
 * 
 * Baseline targets:
 * - 0 msgs/day = 0 score
 * - 10 msgs/day = 40 score
 * - 50 msgs/day = 70 score
 * - 100+ msgs/day = 100 score
 * 
 * @param {number} avgMessagesPerDay - Average messages per day
 * @returns {number} Score from 0-100
 */
function calculateActivityScore(avgMessagesPerDay) {
    if (avgMessagesPerDay <= 0) return 0;
    if (avgMessagesPerDay >= 100) return 100;

    // Logarithmic scaling
    // log10(1) = 0, log10(10) = 1, log10(100) = 2
    const logValue = Math.log10(avgMessagesPerDay + 1);
    const score = (logValue / 2) * 100;

    return Math.round(score);
}

/**
 * Calculates engagement score based on active members and message ratio
 * A healthy ratio is 5-10 messages per active member per week
 * 
 * @param {number} activeUsers - Number of active users
 * @param {number} avgMessagesPerDay - Average messages per day
 * @returns {number} Score from 0-100
 */
function calculateEngagementScore(activeUsers, avgMessagesPerDay) {
    if (activeUsers === 0) return 0;

    // Calculate messages per active user per week
    const msgPerUserPerWeek = (avgMessagesPerDay * 7) / activeUsers;

    // Ideal range: 5-20 messages per user per week
    if (msgPerUserPerWeek >= 5 && msgPerUserPerWeek <= 20) {
        return 100;
    } else if (msgPerUserPerWeek < 5) {
        // Under-engaged: scale up to 100 at 5 msgs
        return Math.round((msgPerUserPerWeek / 5) * 100);
    } else {
        // Over-concentrated: scale down from 100 at 20 to 60 at 50+
        const excess = msgPerUserPerWeek - 20;
        const penalty = Math.min(40, excess * 1.33);
        return Math.round(100 - penalty);
    }
}

/**
 * Calculates trend score based on week-over-week change
 * 
 * @param {string} trend - 'up', 'down', or 'stable'
 * @param {number} percentage - Percentage change
 * @returns {number} Score from 0-100
 */
function calculateTrendScore(trend, percentage) {
    if (trend === 'stable') {
        return 70; // Stable is good, but growth is better
    }

    if (trend === 'up') {
        // Growth is positive: up to 100 at +50% growth
        const bonus = Math.min(30, percentage * 0.6);
        return Math.round(70 + bonus);
    }

    // Decline is concerning
    // -10% = 60, -30% = 40, -50%+ = 20
    const penalty = Math.min(50, percentage * 1.0);
    return Math.max(20, Math.round(70 - penalty));
}

/**
 * Calculates consistency score based on daily activity variance
 * More consistent activity = higher score
 * 
 * @param {Array} dailyCounts - Array of {date, count} objects
 * @returns {number} Score from 0-100
 */
function calculateConsistencyScore(dailyCounts) {
    if (!dailyCounts || dailyCounts.length < 2) {
        return 50; // Not enough data
    }

    const counts = dailyCounts.map(d => d.count);
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length;

    if (avg === 0) return 0;

    // Calculate coefficient of variation (CV)
    const variance = counts.reduce((sum, c) => sum + Math.pow(c - avg, 2), 0) / counts.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / avg;

    // CV of 0 = perfect consistency (100)
    // CV of 0.5 = moderate variance (70)
    // CV of 1.0 = high variance (40)
    // CV of 2.0+ = very inconsistent (0)
    const score = Math.max(0, 100 - (cv * 50));

    return Math.round(score);
}

/**
 * Generates a human-readable interpretation of the health score
 * 
 * @param {number} score - Health score (0-100)
 * @param {string} trend - Trend direction
 * @param {number} percentage - Trend percentage
 * @param {number} avgMessages - Average messages per day
 * @param {number} activeUsers - Active users count
 * @returns {string} Interpretation text
 */
function generateHealthInterpretation(score, trend, percentage, avgMessages, activeUsers) {
    let status;
    if (score >= 80) {
        status = '🌟 **Excelente!** Seu servidor está muito saudável.';
    } else if (score >= 60) {
        status = '✅ **Bom!** Seu servidor está indo bem.';
    } else if (score >= 40) {
        status = '⚠️ **Atenção!** Seu servidor precisa de algum cuidado.';
    } else {
        status = '🚨 **Crítico!** Seu servidor precisa de ação urgente.';
    }

    let trendText = '';
    if (trend === 'up' && percentage > 5) {
        trendText = `A atividade cresceu **${percentage.toFixed(1)}%** em relação à semana anterior. Continue assim!`;
    } else if (trend === 'down' && percentage > 10) {
        trendText = `A atividade caiu **${percentage.toFixed(1)}%** em relação à semana anterior. Considere algumas ações de engajamento.`;
    } else {
        trendText = 'A atividade está relativamente estável.';
    }

    const activityText = avgMessages >= 50
        ? 'O volume de mensagens é alto.'
        : avgMessages >= 10
            ? 'O volume de mensagens é moderado.'
            : 'O volume de mensagens está baixo.';

    return `${status}\n\n${trendText}\n\n${activityText} Com **${activeUsers}** membros ativos nos últimos 7 dias.`;
}

/**
 * Gets detailed insights for a guild
 * 
 * @param {string} guildId - Discord guild ID
 * @param {number} days - Number of days to analyze (default: 7)
 * @returns {Promise<Object>} Insights data
 */
async function getInsights(guildId, days = 7) {
    log.debug(`Getting insights for guild ${guildId}`);

    try {
        const { start, end } = getDateRange(days);

        const [
            topChannels,
            peakHours,
            newAuthors,
            totalMessages,
            totalAuthors,
        ] = await Promise.all([
            messagesRepo.getTopChannels(guildId, days, 3),
            messagesRepo.getPeakTimeSlots(guildId, days, 3, 3),
            messagesRepo.getNewAuthorsCount(guildId, start, end),
            messagesRepo.getMessageCount(guildId, start, end),
            messagesRepo.getActiveAuthorCount(guildId, start, end),
        ]);

        return {
            topChannels,
            peakHours,
            newAuthors,
            totalMessages,
            totalAuthors,
            period: { start, end, days },
        };
    } catch (error) {
        log.error(`Failed to get insights for ${guildId}`, error);
        throw error;
    }
}

/**
 * Generates alerts for a guild based on activity analysis
 * 
 * @param {string} guildId - Discord guild ID
 * @returns {Promise<Array>} Array of alert objects
 */
async function generateAlerts(guildId) {
    log.debug(`Generating alerts for guild ${guildId}`);

    const alerts = [];

    try {
        // Get activity comparison
        const comparison = await messagesRepo.getActivityComparison(guildId, 7);
        const { current, previous, trend, percentage } = comparison;

        // Alert 1: General activity drop
        if (trend === 'down' && percentage >= ALERTS.ACTIVITY_DROP_THRESHOLD) {
            alerts.push({
                type: 'activity',
                level: percentage >= 50 ? 'CRITICAL' : 'WARNING',
                title: 'Queda de Atividade Geral',
                description: `A atividade caiu **${percentage.toFixed(1)}%** em relação à semana anterior. ` +
                    `De ${previous.messages} para ${current.messages} mensagens.`,
            });
        }

        // Alert 2: At-risk channels (channels that were active but are now quiet)
        const { start: prevStart, end: prevEnd } = getComparisonPeriods(7).previous;
        const { start: currStart, end: currEnd } = getComparisonPeriods(7).current;

        const prevChannels = await messagesRepo.getChannelActivity(guildId, prevStart, prevEnd);
        const currChannels = await messagesRepo.getChannelActivity(guildId, currStart, currEnd);

        // Build a map of current channel activity
        const currChannelMap = new Map(currChannels.map(c => [c.channelId, c.count]));

        for (const prevChannel of prevChannels) {
            // Only check channels that were reasonably active before
            if (prevChannel.count < ALERTS.MIN_ACTIVE_CHANNEL_MESSAGES) continue;

            const currCount = currChannelMap.get(prevChannel.channelId) || 0;
            const dropPercent = ((prevChannel.count - currCount) / prevChannel.count) * 100;

            if (dropPercent >= 50) {
                alerts.push({
                    type: 'channel',
                    level: dropPercent >= 80 ? 'WARNING' : 'INFO',
                    title: 'Canal em Risco',
                    description: `<#${prevChannel.channelId}> teve uma queda de **${dropPercent.toFixed(0)}%** ` +
                        `(de ${prevChannel.count} para ${currCount} msgs).`,
                    channelId: prevChannel.channelId,
                });
            }
        }

        // Alert 3: Low activation of new members
        const newAuthorsRecent = await messagesRepo.getNewAuthorsCount(guildId, currStart, currEnd);

        // This is simplified - ideally we'd track member joins
        // For now, we alert if there are very few new authors despite having activity
        if (current.messages > 50 && newAuthorsRecent <= 1) {
            alerts.push({
                type: 'activation',
                level: 'INFO',
                title: 'Poucos Novos Participantes',
                description: `Apenas **${newAuthorsRecent}** membro(s) novo(s) escreveram pela primeira vez esta semana. ` +
                    `Considere criar formas de incentivar novos membros a participarem.`,
            });
        }

        // Sort alerts by severity
        const levelOrder = { CRITICAL: 0, WARNING: 1, INFO: 2 };
        alerts.sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);

        log.debug(`Generated ${alerts.length} alerts for guild ${guildId}`);
        return alerts;

    } catch (error) {
        log.error(`Failed to generate alerts for ${guildId}`, error);
        throw error;
    }
}

/**
 * Gets a quick summary of guild activity for internal use
 * 
 * @param {string} guildId - Discord guild ID
 * @returns {Promise<Object>} Quick summary object
 */
async function getQuickSummary(guildId) {
    const { start, end } = getDateRange(7);

    const [messages, authors] = await Promise.all([
        messagesRepo.getMessageCount(guildId, start, end),
        messagesRepo.getActiveAuthorCount(guildId, start, end),
    ]);

    return {
        messagesLast7Days: messages,
        activeUsersLast7Days: authors,
        avgMessagesPerDay: messages / 7,
    };
}

module.exports = {
    calculateHealthScore,
    getInsights,
    generateAlerts,
    getQuickSummary,
    // Export component calculators for testing
    calculateActivityScore,
    calculateEngagementScore,
    calculateTrendScore,
    calculateConsistencyScore,
};
