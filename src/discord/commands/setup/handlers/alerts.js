// FILE: src/discord/commands/setup/handlers/alerts.js
// Handler for auto-alerts configuration subcommand (Growth plan)

const { EmbedBuilder } = require('discord.js');
const logger = require('../../../../utils/logger');
const { COLORS, EMOJI } = require('../../../../utils/embeds');
const settingsRepo = require('../../../../db/repositories/settings');

const { enforceFeature } = require('../../../../utils/planEnforcement');
const { handleCommandError } = require('../../../../utils/errorHandler');

const log = logger.child('SetupAlerts');

/**
 * Handles the auto-alerts channel configuration subcommand (Growth only)
 * @param {Interaction} interaction - Discord interaction
 * @param {string} guildId - Guild ID
 * @returns {Promise<void>}
 */
async function handleAlertasSetup(interaction, guildId) {
    const channel = interaction.options.getChannel('canal');
    const channelId = channel?.id || null;

    try {
        // Enforce Growth plan (allows owner bypass)
        const allowed = await enforceFeature(interaction, 'auto-alerts');
        if (!allowed) return;

        await settingsRepo.setAlertsChannelId(guildId, channelId);

        const embed = new EmbedBuilder()
            .setTitle(`${EMOJI.CHECK} Alertas Automáticos Configurados`)
            .setColor(COLORS.SUCCESS)
            .setDescription(
                channelId
                    ? `Os alertas automáticos serão enviados para <#${channelId}> a cada 6 horas.`
                    : 'Os alertas automáticos foram **desativados**.'
            )
            .setFooter({ text: 'GuildLens • Plano Growth' })
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
        });

        log.success(`Alerts channel configured for ${interaction.guild.name}: ${channelId || 'DISABLED'}`);

    } catch (error) {
        log.error('Failed to configure alerts channel', error);
        await handleCommandError(error, interaction, 'guildlens-setup alertas');
    }
}

module.exports = { handleAlertasSetup };
