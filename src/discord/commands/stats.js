// FILE: src/discord/commands/stats.js
// Slash command: /guildlens-stats - Server statistics summary

const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');
const logger = require('../../utils/logger');
const { COLORS } = require('../../utils/embeds');
const messagesRepo = require('../../db/repositories/messages');
const { handleCommandError } = require('../../utils/errorHandler');
const { addWatermark, getPlanForWatermark } = require('../../utils/planEnforcement');
const { getDateRange } = require('../../utils/time');

const log = logger.child('Stats');

/**
 * Command data for registration
 */
const data = new SlashCommandBuilder()
    .setName('guildlens-stats')
    .setDescription('📊 Resumo estatístico do servidor')
    .setDMPermission(false);

/**
 * Creates a mini progress bar
 */
function miniBar(value, max, length = 6) {
    const filled = Math.min(Math.round((value / Math.max(max, 1)) * length), length);
    return '▓'.repeat(filled) + '░'.repeat(length - filled);
}

/**
 * Executes the stats command
 */
async function execute(interaction) {
    const guildId = interaction.guildId;
    const guild = interaction.guild;

    log.info(`Stats command in ${guild.name}`);

    await interaction.deferReply();

    try {
        // Get stats for different periods
        const { start: start7, end: end7 } = getDateRange(7);
        const { start: start30, end: end30 } = getDateRange(30);

        const [
            messages7,
            messages30,
            authors7,
            authors30,
            topChannels,
            comparison
        ] = await Promise.all([
            messagesRepo.getMessageCount(guildId, start7, end7),
            messagesRepo.getMessageCount(guildId, start30, end30),
            messagesRepo.getActiveAuthorCount(guildId, start7, end7),
            messagesRepo.getActiveAuthorCount(guildId, start30, end30),
            messagesRepo.getTopChannels(guildId, 7, 3),
            messagesRepo.getActivityComparison(guildId, 7)
        ]);

        // Calculate averages
        const avgPerDay7 = Math.round(messages7 / 7);
        const avgPerDay30 = Math.round(messages30 / 30);

        // Trend emoji
        const trendEmoji = comparison.trend === 'up' ? '📈' : comparison.trend === 'down' ? '📉' : '➡️';
        const trendText = comparison.trend === 'up'
            ? `+${comparison.percentage.toFixed(1)}%`
            : comparison.trend === 'down'
                ? `-${comparison.percentage.toFixed(1)}%`
                : 'Estável';

        // Top channels text
        let channelsText = '';
        for (let i = 0; i < topChannels.length; i++) {
            const ch = topChannels[i];
            const bar = miniBar(ch.count, topChannels[0]?.count || 1);
            channelsText += `${i + 1}. <#${ch.channelId}> ${bar} ${ch.count}\n`;
        }
        if (!channelsText) channelsText = 'Sem dados ainda';

        // Build embed
        let embed = new EmbedBuilder()
            .setTitle(`📊 Estatísticas — ${guild.name}`)
            .setColor(COLORS.PRIMARY)
            .setThumbnail(guild.iconURL({ size: 128 }))
            .addFields(
                {
                    name: '📨 Mensagens (7 dias)',
                    value: `**${messages7.toLocaleString('pt-BR')}**\n~${avgPerDay7}/dia`,
                    inline: true
                },
                {
                    name: '📨 Mensagens (30 dias)',
                    value: `**${messages30.toLocaleString('pt-BR')}**\n~${avgPerDay30}/dia`,
                    inline: true
                },
                {
                    name: `${trendEmoji} Tendência`,
                    value: `**${trendText}**\nvs semana anterior`,
                    inline: true
                },
                {
                    name: '👥 Membros Ativos (7d)',
                    value: `**${authors7}** membros`,
                    inline: true
                },
                {
                    name: '👥 Membros Ativos (30d)',
                    value: `**${authors30}** membros`,
                    inline: true
                },
                {
                    name: '👤 Total no Servidor',
                    value: `**${guild.memberCount}** membros`,
                    inline: true
                },
                {
                    name: '🔥 Top Canais (7 dias)',
                    value: channelsText,
                    inline: false
                }
            )
            .setFooter({ text: 'GuildLens • Estatísticas do Servidor' })
            .setTimestamp();

        // Add watermark for free plan
        const plan = await getPlanForWatermark(guildId);
        embed = addWatermark(embed, plan);

        await interaction.editReply({ embeds: [embed] });

        log.success(`Stats shown for ${guild.name}`);

    } catch (error) {
        log.error('Stats command failed', error);
        await handleCommandError(error, interaction, 'guildlens-stats');
    }
}

module.exports = {
    data,
    execute,
};
