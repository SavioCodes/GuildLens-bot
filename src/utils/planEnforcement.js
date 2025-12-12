// FILE: src/utils/planEnforcement.js
// Plan enforcement utilities for GuildLens
// Handles feature gating based on subscription plan

const DISCORD_IDS = require('../config/discordIds');
const { PLANS } = require('../config/plans');
const { EmbedBuilder } = require('discord.js');
const { COLORS, EMOJI } = require('../config/constants');
const subscriptionsRepo = require('../db/repositories/subscriptions');

/**
 * Features that require specific plans
 */
const FEATURE_REQUIREMENTS = {
    // Free features
    'health-basic': 'free',
    'insights-basic': 'free',
    'setup': 'free',
    'about': 'free',
    'pricing': 'free',

    // Pro features
    'alerts': 'pro',
    'actions': 'pro',
    'insights-advanced': 'pro',
    'health-advanced': 'pro',

    // Growth features
    'export': 'growth',
    'auto-alerts': 'growth',
    'multi-server': 'growth',
};

/**
 * Plan hierarchy for comparison
 */
const PLAN_HIERARCHY = {
    'free': 0,
    'pro': 1,
    'growth': 2,
};

/**
 * Checks if a guild has access to a feature
 * @param {string} guildId - Discord guild ID
 * @param {string} featureName - Feature name to check
 * @returns {Promise<{allowed: boolean, currentPlan: string, requiredPlan: string}>}
 */
async function checkFeatureAccess(guildId, featureName) {
    const currentPlan = await subscriptionsRepo.getPlan(guildId);
    const requiredPlan = FEATURE_REQUIREMENTS[featureName] || 'free';

    const currentLevel = PLAN_HIERARCHY[currentPlan] || 0;
    const requiredLevel = PLAN_HIERARCHY[requiredPlan] || 0;

    return {
        allowed: currentLevel >= requiredLevel,
        currentPlan,
        requiredPlan,
    };
}

/**
 * Creates an embed for when a feature is blocked
 * @param {string} featureName - Feature that was blocked
 * @param {string} requiredPlan - Plan required for the feature
 * @returns {EmbedBuilder} Upgrade prompt embed
 */
function createUpgradeEmbed(featureName, requiredPlan) {
    // Get plan details dynamically
    const planKey = requiredPlan.toUpperCase();
    const plan = PLANS[planKey];

    // Safely fallback if plan logic fails (robustness)
    const displayName = plan ? plan.name : requiredPlan;
    const priceDisplay = plan ? plan.priceDisplay : 'Premium';

    const benefits = requiredPlan === 'pro'
        ? '• Alertas de atividade\n• Recomendações de ações\n• Insights avançados (90 dias)\n• Sem watermark'
        : '• Tudo do Pro\n• Exportar dados (CSV)\n• Até 5 servidores\n• Alertas automáticos\n• Suporte prioritário';

    return new EmbedBuilder()
        .setTitle(`${EMOJI.STAR} Recurso Premium`)
        .setColor(COLORS.WARNING)
        .setDescription(
            `Este recurso está disponível apenas no plano **${displayName}**.\n\n` +
            `**Por apenas ${priceDisplay}**, você terá acesso a:\n` +
            benefits +
            '\n\n💡 Use `/guildlens-pricing` para mais detalhes.'
        )
        .setTimestamp()
        .setFooter({
            text: 'GuildLens • Faça upgrade e desbloqueie todo o potencial!',
        });
}

/**
 * Adds watermark to embed footer for Free plan
 * @param {EmbedBuilder} embed - Embed to modify
 * @param {string} plan - Current plan
 * @returns {EmbedBuilder} Modified embed
 */
function addWatermark(embed, plan) {
    if (plan === 'free') {
        const currentFooter = embed.data.footer?.text || 'GuildLens';
        // Check if watermark already exists to avoid duplication
        if (!currentFooter.includes('Plano Free')) {
            embed.setFooter({
                text: `${currentFooter} • 🆓 Plano Free - Use /guildlens-pricing para upgrade`,
            });
        }
    }
    return embed;
}

/**
 * Middleware-style function to check plan and respond if blocked
 * @param {Interaction} interaction - Discord interaction
 * @param {string} featureName - Feature to check
 * @returns {Promise<boolean>} True if allowed, false if blocked (already responded)
 */
async function enforceFeature(interaction, featureName) {
    // START: Owner Bypass
    const isOwner = interaction.user.id === DISCORD_IDS.OWNER_ID;
    if (isOwner) return true;
    // END: Owner Bypass

    const guildId = interaction.guildId;
    const { allowed, requiredPlan } = await checkFeatureAccess(guildId, featureName);

    if (!allowed) {
        const embed = createUpgradeEmbed(featureName, requiredPlan);
        const replyPayload = { embeds: [embed], flags: 64 }; // Ephemeral

        if (interaction.deferred) {
            await interaction.editReply(replyPayload);
        } else if (interaction.replied) {
            await interaction.followUp(replyPayload);
        } else {
            await interaction.reply(replyPayload);
        }

        return false;
    }

    return true;
}

/**
 * Gets the plan for adding watermark
 * @param {string} guildId - Discord guild ID
 * @returns {Promise<string>} Plan name
 */
async function getPlanForWatermark(guildId) {
    return await subscriptionsRepo.getPlan(guildId);
}

module.exports = {
    FEATURE_REQUIREMENTS,
    PLAN_HIERARCHY,
    checkFeatureAccess,
    createUpgradeEmbed,
    addWatermark,
    enforceFeature,
    getPlanForWatermark,
};
