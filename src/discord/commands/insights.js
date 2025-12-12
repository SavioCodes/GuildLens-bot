// FILE: src/discord/commands/insights.js
// Slash command: /guildlens-insights - Activity Insights & Trends

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const logger = require('../../utils/logger');
const { createInsightsEmbed, createWarningEmbed } = require('../../utils/embeds');
const { safeReply, safeDefer, checkCooldown, error, requireGuild, formatNumber } = require('../../utils/commandUtils');
const analytics = require('../../services/analytics');
const { addWatermark, getPlanForWatermark } = require('../../utils/planEnforcement');

const log = logger.child('InsightsCommand');

const data = new SlashCommandBuilder()
    .setName('guildlens-insights')
    .setDescription('📈 Ver tendências e padrões de atividade do servidor')
    .setDMPermission(false)
    .addStringOption(option =>
        option.setName('tipo')
            .setDescription('Tipo de insight para visualizar')
            .setRequired(false)
            .addChoices(
                { name: '📊 Geral - Visão completa', value: 'general' },
                { name: '👥 Membros - Atividade de usuários', value: 'members' },
                { name: '📺 Canais - Performance por canal', value: 'channels' },
                { name: '⏰ Horários - Picos de atividade', value: 'timing' }
            )
    );

async function execute(interaction) {
    if (!await requireGuild(interaction)) return;

    const guildId = interaction.guildId;
    const guildName = interaction.guild.name;
    const insightType = interaction.options.getString('tipo') || 'general';

    // Cooldown: 15 seconds
    const remaining = checkCooldown(interaction.user.id, 'insights', 15);
    if (remaining) {
        return safeReply(interaction, {
            embeds: [error('Aguarde', `Tente novamente em **${remaining}s**.`)],
            flags: 64
        });
    }

    log.info(`Insights command (${insightType}) in ${guildName}`);
    await safeDefer(interaction);

    try {
        const insightsData = await analytics.getInsights(guildId);

        if (!insightsData || insightsData.totalMessages === 0) {
            const warningEmbed = createWarningEmbed(
                'Dados Insuficientes',
                '📊 Ainda não há dados suficientes para gerar insights.\n\n' +
                '**O que fazer:**\n' +
                '• Continue usando o servidor normalmente\n' +
                '• O bot precisa de pelo menos 1 dia de dados\n' +
                '• Volte em algumas horas para verificar'
            );
            return interaction.editReply({ embeds: [warningEmbed] });
        }

        let embed = createInsightsEmbed(insightsData);

        // Add type-specific insights
        switch (insightType) {
            case 'members':
                if (insightsData.topAuthors && insightsData.topAuthors.length > 0) {
                    const topUsers = insightsData.topAuthors.slice(0, 5)
                        .map((u, i) => `${getMedal(i)} <@${u.author_id}> — ${formatNumber(u.count)} msgs`)
                        .join('\n');
                    embed.addFields({
                        name: '👥 Top Membros Ativos',
                        value: topUsers,
                        inline: false
                    });
                }
                break;

            case 'channels':
                if (insightsData.topChannels && insightsData.topChannels.length > 0) {
                    const topChannels = insightsData.topChannels.slice(0, 5)
                        .map((c, i) => `${getMedal(i)} <#${c.channel_id}> — ${formatNumber(c.count)} msgs`)
                        .join('\n');
                    embed.addFields({
                        name: '📺 Canais Mais Ativos',
                        value: topChannels,
                        inline: false
                    });
                }
                break;

            case 'timing':
                const peakHour = insightsData.peakHour || 'N/A';
                const peakDay = insightsData.peakDay || 'N/A';
                embed.addFields({
                    name: '⏰ Horários de Pico',
                    value:
                        `**Hora mais ativa:** ${peakHour}h\n` +
                        `**Dia mais ativo:** ${peakDay}\n` +
                        `\n_💡 Agende posts importantes nesses horários_`,
                    inline: false
                });
                break;
        }

        // Add watermark
        const plan = await getPlanForWatermark(guildId);
        embed = addWatermark(embed, plan);

        // Add navigation buttons
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('insights_refresh')
                    .setLabel('🔄 Atualizar')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('insights_export')
                    .setLabel('📁 Exportar')
                    .setStyle(ButtonStyle.Primary)
            );

        await interaction.editReply({ embeds: [embed], components: [row] });
        log.success(`Insights (${insightType}) shown in ${guildName}`);

    } catch (err) {
        log.error(`Insights failed in ${guildName}`, err);
        await interaction.editReply({
            embeds: [error('Erro ao Carregar', 'Não foi possível carregar os insights.\nTente novamente em alguns instantes.')]
        });
    }
}

/**
 * Get medal emoji by position
 */
function getMedal(position) {
    return ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][position] || '•';
}

module.exports = { data, execute };
