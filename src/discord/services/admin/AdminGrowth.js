/**
 * Admin Growth Service
 * Handles plan activations, resets, and checks.
 */

const { EmbedBuilder } = require('discord.js');
const subscriptionsRepo = require('../../../db/repositories/subscriptions');
const { COLORS, EMOJI } = require('../../../utils/embeds');
const logger = require('../../../utils/logger');

const log = logger.child('AdminGrowth');

const AdminGrowth = {
    async activatePro(interaction) {
        const serverId = interaction.options.getString('server_id') || interaction.guildId;
        const days = interaction.options.getInteger('dias');

        await subscriptionsRepo.activatePro(serverId, days);

        const embed = new EmbedBuilder()
            .setTitle(`${EMOJI.CHECK} Plano Pro Ativado`)
            .setColor(COLORS.SUCCESS)
            .setDescription(`O plano **Pro** foi ativado para o servidor **${serverId}**.`)
            .addFields(
                { name: 'Validade', value: days ? `${days} dias` : 'Permanente', inline: true },
                { name: 'Servidor', value: serverId, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'GuildLens Admin' });

        await interaction.reply({ embeds: [embed], flags: 64 });
        log.success(`Pro activated for ${serverId} by ${interaction.user.tag}`);
    },

    async activateGrowth(interaction) {
        const serverId = interaction.options.getString('server_id') || interaction.guildId;
        const days = interaction.options.getInteger('dias');

        await subscriptionsRepo.activateGrowth(serverId, days);

        const embed = new EmbedBuilder()
            .setTitle(`${EMOJI.ROCKET} Plano Growth Ativado`)
            .setColor(COLORS.SUCCESS)
            .setDescription(`O plano **Growth** foi ativado para o servidor **${serverId}**.`)
            .addFields(
                { name: 'Validade', value: days ? `${days} dias` : 'Permanente', inline: true },
                { name: 'Servidor', value: serverId, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'GuildLens Admin' });

        await interaction.reply({ embeds: [embed], flags: 64 });
        log.success(`Growth activated for ${serverId} by ${interaction.user.tag}`);
    },

    async resetPlan(interaction) {
        const serverId = interaction.options.getString('server_id') || interaction.guildId;

        await subscriptionsRepo.resetToFree(serverId);

        const embed = new EmbedBuilder()
            .setTitle(`${EMOJI.INFO} Plano Resetado`)
            .setColor(COLORS.WARNING)
            .setDescription(`O servidor **${serverId}** foi resetado para o plano **Free**.`)
            .setTimestamp()
            .setFooter({ text: 'GuildLens Admin' });

        await interaction.reply({ embeds: [embed], flags: 64 });
        log.success(`Plan reset for ${serverId} by ${interaction.user.tag}`);
    },

    async checkPlan(interaction) {
        const serverId = interaction.options.getString('server_id') || interaction.guildId;

        const subscription = await subscriptionsRepo.getSubscription(serverId);
        const planKey = await subscriptionsRepo.getPlan(serverId);
        const { PLANS } = require('../../../config/plans');
        const limits = PLANS[planKey.toUpperCase()] || PLANS.FREE;

        const embed = new EmbedBuilder()
            .setTitle(`${EMOJI.CHART} Informações do Plano`)
            .setColor(COLORS.INFO)
            .addFields(
                { name: 'Servidor', value: serverId, inline: true },
                { name: 'Plano', value: limits.name, inline: true },
                { name: 'Preço', value: limits.price > 0 ? limits.priceDisplay : 'Gratuito', inline: true },
                { name: 'Início', value: subscription?.started_at ? new Date(subscription.started_at).toLocaleDateString('pt-BR') : 'N/A', inline: true },
                { name: 'Expira', value: subscription?.expires_at ? new Date(subscription.expires_at).toLocaleDateString('pt-BR') : 'Nunca', inline: true },
                { name: 'Histórico', value: `${limits.limits.historyDays} dias`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'GuildLens Admin' });

        await interaction.reply({ embeds: [embed], flags: 64 });
    }
};

module.exports = AdminGrowth;
