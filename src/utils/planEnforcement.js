// FILE: src/utils/planEnforcement.js
// Plan enforcement utilities for GuildLens
// Handles feature gating based on subscription plan

const { BOT_OWNER_ID } = require('./constants');
const subscriptionsRepo = require('../db/repositories/subscriptions');
const { EmbedBuilder } = require('discord.js');
const { COLORS, EMOJI } = require('./embeds');

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
    const planName = requiredPlan === 'pro' ? 'Pro' : 'Growth';
    const price = requiredPlan === 'pro' ? 'R$ 49/mês' : 'R$ 129/mês';

    return new EmbedBuilder()
        .setTitle(`${EMOJI.STAR} Recurso Premium`)
        .setColor(COLORS.WARNING)
        .setDescription(
            `Este recurso está disponível apenas no plano **${planName}**.\n\n` +
            `**Por apenas ${price}**, você terá acesso a:\n` +
            (requiredPlan === 'pro'
                ? '• Alertas de atividade\n• Recomendações de ações\n• Insights avançados (90 dias)\n• Sem watermark'
                : '• Tudo do Pro\n• Exportar dados (CSV)\n• Até 5 servidores\n• Alertas automáticos\n• Suporte prioritário'
            ) +
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
        embed.setFooter({
            text: `${currentFooter} • 🆓 Plano Free - Use /guildlens-pricing para upgrade`,
        });
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
    if (interaction.user.id === BOT_OWNER_ID) {
        return true;
    }
    // END: Owner Bypass

    const guildId = interaction.guildId;
    const { allowed, requiredPlan } = await checkFeatureAccess(guildId, featureName);

    if (!allowed) {
        const embed = createUpgradeEmbed(featureName, requiredPlan);

        if (interaction.deferred) {
            await interaction.editReply({
                embeds: [embed],
            });
        } else if (interaction.replied) {
            await interaction.followUp({
                embeds: [embed],
                flags: 64,
            });
        } else {
            await interaction.reply({
                embeds: [embed],
                flags: 64,
            });
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
