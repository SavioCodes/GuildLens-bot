// FILE: src/discord/commands/setup/handlers/view.js
// Handler for viewing current configuration

const { EmbedBuilder } = require('discord.js');
const logger = require('../../../../utils/logger');
const { COLORS, EMOJI, createWarningEmbed } = require('../../../../utils/embeds');
const settingsRepo = require('../../../../db/repositories/settings');
const subscriptionsRepo = require('../../../../db/repositories/subscriptions');
const { handleCommandError } = require('../../../../utils/errorHandler');

const log = logger.child('SetupView');

/**
 * Handles viewing current configuration
 * @param {Interaction} interaction - Discord interaction
 * @param {string} guildId - Guild ID
 * @returns {Promise<void>}
 */
async function handleViewConfig(interaction, guildId) {
    try {
        const settings = await settingsRepo.getSettings(guildId);
        const planKey = await subscriptionsRepo.getPlan(guildId);
        const { PLANS } = require('../../../../config/plans');
        const planLimits = PLANS[planKey.toUpperCase()] || PLANS.FREE;

        if (!settings) {
            // Settings should exist due to ensureGuild, but just in case
            await interaction.reply({
                embeds: [createWarningEmbed(
                    'Configuração Inicial',
                    'Este servidor ainda não foi totalmente configurado.\n\n' +
                    '**Use:**\n' +
                    '• `/guildlens-setup canais` - Escolher canais a monitorar\n' +
                    '• `/guildlens-setup idioma` - Definir idioma\n' +
                    '• `/guildlens-setup staff` - Definir cargo de staff'
                )],
            });
            return;
        }

        const channelsList = settings.monitored_channels && settings.monitored_channels.length > 0
            ? settings.monitored_channels.map(id => `<#${id}>`).join(', ')
            : 'Todos os canais de texto';

        const staffRole = settings.staff_role_id
            ? `<@&${settings.staff_role_id}>`
            : 'Não configurado';

        const alertsChannel = settings.alerts_channel_id
            ? `<#${settings.alerts_channel_id}>`
            : 'Não configurado';

        const embed = new EmbedBuilder()
            .setTitle(`${EMOJI.SETTINGS} Configuração do GuildLens`)
            .setColor(COLORS.SUCCESS)
            .setDescription(`Configuração atual do servidor **${interaction.guild.name}**`)
            .addFields(
                {
                    name: '📋 Plano Atual',
                    value: `**${planLimits.name}**${planLimits.features.watermark ? ' (com watermark)' : ''}`,
                    inline: true,
                },
                {
                    name: '👥 Membros',
                    value: `${interaction.guild.memberCount}`,
                    inline: true,
                },
                {
                    name: '📅 Histórico',
                    value: `${planLimits.limits.historyDays} dias`,
                    inline: true,
                },
                {
                    name: `${EMOJI.CHANNEL} Canais Monitorados`,
                    value: channelsList,
                    inline: false,
                },
                {
                    name: '🌐 Idioma',
                    value: settings.language === 'pt-BR' ? '🇧🇷 Português (Brasil)' : settings.language,
                    inline: true,
                },
                {
                    name: '👑 Cargo de Staff',
                    value: staffRole,
                    inline: true,
                },
                {
                    name: '🔔 Canal de Alertas',
                    value: plan === 'growth' ? alertsChannel : '🔒 Plano Growth',
                    inline: true,
                }
            )
            .setTimestamp()
            .setFooter({
                text: 'GuildLens • Use /guildlens-pricing para ver planos',
            });

        await interaction.reply({
            embeds: [embed],
        });

    } catch (error) {
        log.error('Failed to view config', error);
        await handleCommandError(error, interaction, 'guildlens-setup ver');
    }
}

module.exports = { handleViewConfig };
