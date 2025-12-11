// FILE: src/discord/commands/alerts.js
// Slash command: /guildlens-alerts - Activity alerts (Pro+ only)

const { SlashCommandBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const { createAlertsEmbed, createWarningEmbed } = require('../../utils/embeds');
const analytics = require('../../services/analytics');
const { handleCommandError } = require('../../utils/errorHandler');
const { enforceFeature, addWatermark, getPlanForWatermark } = require('../../utils/planEnforcement');

const log = logger.child('AlertsCommand');

/**
 * Command data for registration
 */
const data = new SlashCommandBuilder()
    .setName('guildlens-alerts')
    .setDescription('Mostra alertas de riscos e problemas detectados no servidor')
    .setDMPermission(false);

/**
 * Executes the alerts command
 * @param {Interaction} interaction - Discord interaction
 */
async function execute(interaction) {
    const guildId = interaction.guildId;
    const guildName = interaction.guild.name;

    log.info(`Alerts command in ${guildName}`);

    // Defer reply since this might take a moment
    await interaction.deferReply();

    // Check if user has Pro+ plan
    const allowed = await enforceFeature(interaction, 'alerts');
    if (!allowed) {
        return; // Already responded with upgrade prompt
    }

    try {
        // Generate alerts
        const alerts = await analytics.generateAlerts(guildId);

        // Check if we have any alerts
        if (!alerts || alerts.length === 0) {
            const successEmbed = createWarningEmbed(
                '✅ Nenhum Alerta Detectado',
                '🎉 Ótimas notícias! Não há alertas de risco no momento.\n\n' +
                '**Isso significa que:**\n' +
                '• A atividade está estável ou subindo\n' +
                '• Os canais principais estão ativos\n' +
                '• Novos membros estão participando\n\n' +
                '💡 Continue monitorando com `/guildlens-health`'
            );

            await interaction.editReply({
                embeds: [successEmbed],
            });
            return;
        }

        // Create and send the alerts embed
        let embed = createAlertsEmbed(alerts);

        // Add watermark for free plan (shouldn't happen since Pro+ required, but just in case)
        const plan = await getPlanForWatermark(guildId);
        embed = addWatermark(embed, plan);

        await interaction.editReply({
            embeds: [embed],
        });

        log.success(`Alerts generated for ${guildName}: ${alerts.length} alert(s)`);

    } catch (error) {
        log.error(`Failed to generate alerts for ${guildName}`, error);
        await handleCommandError(error, interaction, 'guildlens-alerts');
    }
}

module.exports = {
    data,
    execute,
};
