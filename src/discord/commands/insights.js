// FILE: src/discord/commands/insights.js
// Slash command: /guildlens-insights

const { SlashCommandBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const { createInsightsEmbed, createWarningEmbed } = require('../../utils/embeds');
const { safeReply, safeDefer, checkCooldown, error } = require('../../utils/commandUtils');
const analytics = require('../../services/analytics');
const { addWatermark, getPlanForWatermark } = require('../../utils/planEnforcement');

const log = logger.child('InsightsCommand');

const data = new SlashCommandBuilder()
    .setName('guildlens-insights')
    .setDescription('Insights de atividade do servidor')
    .setDMPermission(false);

async function execute(interaction) {
    const guildId = interaction.guildId;
    const guildName = interaction.guild.name;

    // Cooldown: 15 seconds
    const remaining = checkCooldown(interaction.user.id, 'insights', 15);
    if (remaining) {
        return safeReply(interaction, {
            embeds: [error('Aguarde', `Tente novamente em ${remaining}s.`)],
            flags: 64
        });
    }

    log.info(`Insights command in ${guildName}`);
    await safeDefer(interaction);

    try {
        const insightsData = await analytics.getInsights(guildId);

        if (!insightsData || insightsData.totalMessages === 0) {
            const warningEmbed = createWarningEmbed(
                'Dados Insuficientes',
                'Ainda não há dados suficientes.\nContinue usando o servidor normalmente.'
            );
            return interaction.editReply({ embeds: [warningEmbed] });
        }

        let embed = createInsightsEmbed(insightsData);
        const plan = await getPlanForWatermark(guildId);
        embed = addWatermark(embed, plan);

        await interaction.editReply({ embeds: [embed] });
        log.success(`Insights shown in ${guildName}`);

    } catch (err) {
        log.error(`Insights failed in ${guildName}`, err);
        await interaction.editReply({ embeds: [error('Erro', 'Falha ao carregar insights.')] });
    }
}

module.exports = { data, execute };
