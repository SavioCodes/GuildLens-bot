// FILE: src/discord/commands/health.js
// Slash command: /guildlens-health - Server health score

const { SlashCommandBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const { createHealthEmbed, createWarningEmbed } = require('../../utils/embeds');
const analytics = require('../../services/analytics');
const { handleCommandError } = require('../../utils/errorHandler');
const { addWatermark, getPlanForWatermark } = require('../../utils/planEnforcement');

const log = logger.child('HealthCommand');

/**
 * Command data for registration
 */
const data = new SlashCommandBuilder()
    .setName('guildlens-health')
    .setDescription('Mostra o índice de saúde do servidor e métricas de atividade')
    .setDMPermission(false);

/**
 * Executes the health command
 * @param {Interaction} interaction - Discord interaction
 */
async function execute(interaction) {
    const guildId = interaction.guildId;
    const guildName = interaction.guild.name;

    log.info(`Health command in ${guildName}`);

    // Defer reply since calculation might take a moment
    await interaction.deferReply();

    try {
        // Calculate health score
        const healthData = await analytics.calculateHealthScore(guildId);

        // Check if we have enough data
        if (healthData.totalMessages === 0 || healthData.totalMessages === undefined) {
            const warningEmbed = createWarningEmbed(
                '📊 Coletando Dados',
                'O bot ainda está coletando dados de atividade do servidor.\n\n' +
                '**Próximos passos:**\n' +
                '• Continue usando o servidor normalmente\n' +
                '• O bot registra mensagens automaticamente\n' +
                '• Volte em algumas horas para ver o Health Score\n\n' +
                '💡 Quanto mais atividade, mais precisa será a análise!'
            );

            await interaction.editReply({
                embeds: [warningEmbed],
            });
            return;
        }

        // Create the health embed
        let embed = createHealthEmbed(healthData);

        // Add watermark for Free plan
        const plan = await getPlanForWatermark(guildId);
        embed = addWatermark(embed, plan);

        await interaction.editReply({
            embeds: [embed],
        });

        log.success(`Health score for ${guildName}: ${healthData.score}`);

    } catch (error) {
        log.error(`Failed to calculate health for ${guildName}`, 'Health', error);
        await handleCommandError(error, interaction, 'guildlens-health');
    }
}

module.exports = {
    data,
    execute,
};
