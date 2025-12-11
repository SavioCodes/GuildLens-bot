// FILE: src/db/repositories/subscriptions.js
// Repository for subscription/plan management
// Handles Free, Pro, and Growth plan tracking

const { query, queryOne, queryAll } = require('../pgClient');
const logger = require('../../utils/logger');

const log = logger.child('SubscriptionsRepo');

/**
 * Plan types available in GuildLens
 */
const PlanType = {
    FREE: 'free',
    PRO: 'pro',
    GROWTH: 'growth',
};

/**
 * Plan limits and features
 */
const PlanLimits = {
    [PlanType.FREE]: {
        name: 'Free',
        price: 0,
        maxMembers: 500,
        maxServers: 1,
        historyDays: 7,
        features: {
            healthBasic: true,
            healthAdvanced: false,
            insights: true,
            insightsAdvanced: false,
            alerts: false,
            actions: false,
            export: false,
            autoAlerts: false,
            prioritySupport: false,
        },
        watermark: true,
    },
    [PlanType.PRO]: {
        name: 'Pro',
        price: 1990, // R$ 19,90 em centavos (Promoção de Lançamento)
        maxMembers: null, // Unlimited
        maxServers: 2,
        historyDays: 90,
        features: {
            healthBasic: true,
            healthAdvanced: true,
            insights: true,
            insightsAdvanced: true,
            alerts: true,
            actions: true,
            export: false,
            autoAlerts: false,
            prioritySupport: false,
        },
        watermark: false,
    },
    [PlanType.GROWTH]: {
        name: 'Growth',
        price: 3990, // R$ 39,90 em centavos (Promoção de Lançamento)
        maxMembers: null, // Unlimited
        maxServers: 5,
        historyDays: 365,
        features: {
            healthBasic: true,
            healthAdvanced: true,
            insights: true,
            insightsAdvanced: true,
            alerts: true,
            actions: true,
            export: true,
            autoAlerts: true,
            prioritySupport: true,
        },
        watermark: false,
    },
};

/**
 * Gets the subscription for a guild
 * @param {string} guildId - Discord guild ID
 * @returns {Promise<Object|null>} Subscription record or null
 */
async function getSubscription(guildId) {
    const sql = `SELECT * FROM subscriptions WHERE guild_id = $1`;

    try {
        return await queryOne(sql, [guildId], 'getSubscription');
    } catch (error) {
        log.error(`Failed to get subscription for ${guildId}`, 'Subscriptions', error);
        throw error;
    }
}

/**
 * Gets the plan type for a guild (defaults to FREE)
 * @param {string} guildId - Discord guild ID
 * @returns {Promise<string>} Plan type (free, pro, growth)
 */
async function getPlan(guildId) {
    const subscription = await getSubscription(guildId);

    if (!subscription) {
        return PlanType.FREE;
    }

    // Check if subscription is expired
    if (subscription.expires_at && new Date(subscription.expires_at) < new Date()) {
        return PlanType.FREE;
    }

    return subscription.plan || PlanType.FREE;
}

/**
 * Gets the plan limits for a guild
 * @param {string} guildId - Discord guild ID
 * @returns {Promise<Object>} Plan limits object
 */
async function getPlanLimits(guildId) {
    const plan = await getPlan(guildId);
    return PlanLimits[plan] || PlanLimits[PlanType.FREE];
}

/**
 * Checks if a feature is available for a guild
 * @param {string} guildId - Discord guild ID
 * @param {string} featureName - Feature name to check
 * @returns {Promise<boolean>} True if feature is available
 */
async function hasFeature(guildId, featureName) {
    const limits = await getPlanLimits(guildId);
    return limits.features[featureName] === true;
}

/**
 * Creates or updates a subscription
 * @param {string} guildId - Discord guild ID
 * @param {string} plan - Plan type
 * @param {Date} [expiresAt] - Expiration date (null for permanent/manual)
 * @returns {Promise<Object>} Subscription record
 */
async function upsertSubscription(guildId, plan, expiresAt = null) {
    const sql = `
        INSERT INTO subscriptions (guild_id, plan, started_at, expires_at, created_at, updated_at)
        VALUES ($1, $2, NOW(), $3, NOW(), NOW())
        ON CONFLICT (guild_id)
        DO UPDATE SET
            plan = $2,
            expires_at = $3,
            updated_at = NOW()
        RETURNING *
    `;

    try {
        const result = await queryOne(sql, [guildId, plan, expiresAt], 'upsertSubscription');
        log.info(`Subscription upserted for guild ${guildId}: ${plan}`);
        return result;
    } catch (error) {
        log.error(`Failed to upsert subscription for ${guildId}`, 'Subscriptions', error);
        throw error;
    }
}

/**
 * Sets a guild to Pro plan (manual activation)
 * @param {string} guildId - Discord guild ID
 * @param {number} [daysValid] - Days until expiration (null for indefinite)
 * @returns {Promise<Object>} Subscription record
 */
async function activatePro(guildId, daysValid = null) {
    const expiresAt = daysValid
        ? new Date(Date.now() + daysValid * 24 * 60 * 60 * 1000)
        : null;

    return await upsertSubscription(guildId, PlanType.PRO, expiresAt);
}

/**
 * Sets a guild to Growth plan (manual activation)
 * @param {string} guildId - Discord guild ID
 * @param {number} [daysValid] - Days until expiration (null for indefinite)
 * @returns {Promise<Object>} Subscription record
 */
async function activateGrowth(guildId, daysValid = null) {
    const expiresAt = daysValid
        ? new Date(Date.now() + daysValid * 24 * 60 * 60 * 1000)
        : null;

    return await upsertSubscription(guildId, PlanType.GROWTH, expiresAt);
}

/**
 * Resets a guild to Free plan
 * @param {string} guildId - Discord guild ID
 * @returns {Promise<Object>} Subscription record
 */
async function resetToFree(guildId) {
    return await upsertSubscription(guildId, PlanType.FREE, null);
}

/**
 * Deletes subscription for a guild
 * @param {string} guildId - Discord guild ID
 * @returns {Promise<void>}
 */
async function deleteSubscription(guildId) {
    const sql = `DELETE FROM subscriptions WHERE guild_id = $1`;

    try {
        await query(sql, [guildId], 'deleteSubscription');
        log.info(`Subscription deleted for guild ${guildId}`);
    } catch (error) {
        log.error(`Failed to delete subscription for ${guildId}`, 'Subscriptions', error);
        throw error;
    }
}

/**
 * Gets all active Pro/Growth subscriptions
 * @returns {Promise<Array>} Array of subscription records
 */
async function getActiveSubscriptions() {
    const sql = `
        SELECT * FROM subscriptions
        WHERE plan != 'free'
        AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY created_at DESC
    `;

    try {
        return await queryAll(sql, [], 'getActiveSubscriptions');
    } catch (error) {
        log.error('Failed to get active subscriptions', 'Subscriptions', error);
        throw error;
    }
}

/**
 * Gets recent paid plan activations
 * @param {number} limit - Number of records to return
 * @returns {Promise<Array>} Array of subscription records with plan details
 */
async function getRecentActivations(limit = 5) {
    const sql = `
        SELECT s.*, g.name as guild_name 
        FROM subscriptions s
        LEFT JOIN guilds g ON s.guild_id = g.guild_id
        WHERE s.plan IN ('pro', 'growth')
        ORDER BY s.updated_at DESC
        LIMIT $1
    `;

    try {
        return await queryAll(sql, [limit], 'getRecentActivations');
    } catch (error) {
        log.error('Failed to get recent activations', 'Subscriptions', error);
        return [];
    }
}

/**
 * Gets subscription statistics
 * @returns {Promise<Object>} Statistics object
 */
async function getStats() {
    const sql = `
        SELECT
            COUNT(*) FILTER (WHERE plan = 'free' OR plan IS NULL) as free_count,
            COUNT(*) FILTER (WHERE plan = 'pro' AND (expires_at IS NULL OR expires_at > NOW())) as pro_count,
            COUNT(*) FILTER (WHERE plan = 'growth' AND (expires_at IS NULL OR expires_at > NOW())) as growth_count,
            COUNT(*) as total_count
        FROM subscriptions
    `;

    try {
        return await queryOne(sql, [], 'getSubscriptionStats');
    } catch (error) {
        log.error('Failed to get subscription stats', 'Subscriptions', error);
        throw error;
    }
}

module.exports = {
    PlanType,
    PlanLimits,
    getSubscription,
    getPlan,
    getPlanLimits,
    hasFeature,
    upsertSubscription,
    activatePro,
    activateGrowth,
    resetToFree,
    deleteSubscription,
    getActiveSubscriptions,
    getRecentActivations,
    getStats,
};
