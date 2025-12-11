// FILE: src/discord/commands/actions.js
// Slash command: /guildlens-actions - Recommended actions (Pro+ only)

const { SlashCommandBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const { createActionsEmbed, createWarningEmbed } = require('../../utils/embeds');
const recommendations = require('../../services/recommendations');
const { handleCommandError } = require('../../utils/errorHandler');
const { enforceFeature, addWatermark, getPlanForWatermark } = require('../../utils/planEnforcement');

const log = logger.child('ActionsCommand');

/**
 * Command data for registration
 */
const data = new SlashCommandBuilder()
    .setName('guildlens-actions')
    .setDescription('Mostra ações recomendadas para melhorar o engajamento do servidor')
    .setDMPermission(false);

/**
 * Executes the actions command
 * @param {Interaction} interaction - Discord interaction
 */
async function execute(interaction) {
    const guildId = interaction.guildId;
    const guildName = interaction.guild.name;

    log.info(`Actions command in ${guildName}`);

    // Defer reply since this might take a moment
    await interaction.deferReply();

    // Check if user has Pro+ plan
    const allowed = await enforceFeature(interaction, 'actions');
    if (!allowed) {
        return; // Already responded with upgrade prompt
    }

    try {
        // Generate recommendations
        const actions = await recommendations.generateRecommendations(guildId);

        // Check if we have any recommendations
        if (!actions || actions.length === 0) {
            const warningEmbed = createWarningEmbed(
                'Nenhuma Recomendação Disponível',
                '📊 O bot ainda está coletando dados do servidor.\n\n' +
                '**O que fazer?**\n' +
                '• Aguarde alguns dias de atividade\n' +
                '• Certifique-se de que as mensagens estão sendo enviadas nos canais monitorados\n' +
                '• Use `/guildlens-health` para ver o status atual\n\n' +
                '💡 Quanto mais dados, melhores serão as recomendações!'
            );

            await interaction.editReply({
                embeds: [warningEmbed],
            });
            return;
        }

        // Create and send the actions embed
        let embed = createActionsEmbed(actions);

        // Add watermark for free plan (shouldn't happen since Pro+ required, but just in case)
        const plan = await getPlanForWatermark(guildId);
        embed = addWatermark(embed, plan);

        await interaction.editReply({
            embeds: [embed],
        });

        log.success(`Actions generated for ${guildName}: ${actions.length} recommendation(s)`);

    } catch (error) {
        log.error(`Failed to generate actions for ${guildName}`, error);
        await handleCommandError(error, interaction, 'guildlens-actions');
    }
}

module.exports = {
    data,
    execute,
};
