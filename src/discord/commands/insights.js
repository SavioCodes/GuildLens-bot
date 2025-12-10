// FILE: src/discord/commands/insights.js
// Slash command: /guildlens-insights - Server activity insights

const { SlashCommandBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const { createInsightsEmbed, createWarningEmbed } = require('../../utils/embeds');
const analytics = require('../../services/analytics');
const { handleCommandError } = require('../../utils/errorHandler');
const { addWatermark, getPlanForWatermark } = require('../../utils/planEnforcement');

const log = logger.child('InsightsCommand');

/**
 * Command data for registration
 */
const data = new SlashCommandBuilder()
    .setName('guildlens-insights')
    .setDescription('Mostra insights de atividade do servidor nos últimos 7 dias')
    .setDMPermission(false);

/**
 * Executes the insights command
 * @param {Interaction} interaction - Discord interaction
 */
async function execute(interaction) {
    const guildId = interaction.guildId;
    const guildName = interaction.guild.name;

    log.info(`Insights command in ${guildName}`);

    // Defer reply since analysis might take a moment
    await interaction.deferReply();

    try {
        // Get insights
        const insightsData = await analytics.getInsights(guildId, 7);

        // Check if we have enough data
        if (!insightsData.topChannels || insightsData.topChannels.length === 0) {
            const warningEmbed = createWarningEmbed(
                '📊 Dados Insuficientes',
                'Ainda não há dados suficientes para gerar insights.\n\n' +
                '**O que está acontecendo?**\n' +
                '• O bot começou a monitorar recentemente\n' +
                '• Poucos membros enviaram mensagens\n\n' +
                '**O que fazer?**\n' +
                '• Continue usando o servidor\n' +
                '• Volte em alguns dias para ver os insights\n\n' +
                '💡 Use `/guildlens-setup` para verificar quais canais estão sendo monitorados.'
            );

            await interaction.editReply({
                embeds: [warningEmbed],
            });
            return;
        }

        // Create the insights embed
        let embed = createInsightsEmbed(insightsData);

        // Add watermark for Free plan
        const plan = await getPlanForWatermark(guildId);
        embed = addWatermark(embed, plan);

        await interaction.editReply({
            embeds: [embed],
        });

        log.success(`Insights generated for ${guildName}`);

    } catch (error) {
        log.error(`Failed to get insights for ${guildName}`, 'Insights', error);
        await handleCommandError(error, interaction, 'guildlens-insights');
    }
}

module.exports = {
    data,
    execute,
};
