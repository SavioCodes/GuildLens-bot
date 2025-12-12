// FILE: src/discord/commands/leaderboard.js
// Slash command: /guildlens-leaderboard - Member Activity Ranking

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const logger = require('../../utils/logger');
const { safeReply, safeDefer, checkCooldown, error, requireGuild, formatNumber, CMD_COLORS } = require('../../utils/commandUtils');
const messagesRepo = require('../../db/repositories/messages');
const { addWatermark, getPlanForWatermark } = require('../../utils/planEnforcement');

const log = logger.child('LeaderboardCommand');

const data = new SlashCommandBuilder()
    .setName('guildlens-leaderboard')
    .setDescription('🏆 Ver ranking dos membros mais ativos do servidor')
    .setDMPermission(false)
    .addIntegerOption(opt => opt
        .setName('dias')
        .setDescription('Período em dias para análise')
        .setMinValue(1)
        .setMaxValue(30)
        .addChoices(
            { name: '📅 Hoje (1 dia)', value: 1 },
            { name: '📆 Esta semana (7 dias)', value: 7 },
            { name: '📆 Últimos 14 dias', value: 14 },
            { name: '📆 Este mês (30 dias)', value: 30 }
        )
    )
    .addIntegerOption(opt => opt
        .setName('quantidade')
        .setDescription('Quantidade de membros no ranking (5-20)')
        .setMinValue(5)
        .setMaxValue(20)
    );

async function execute(interaction) {
    if (!await requireGuild(interaction)) return;

    const guildId = interaction.guildId;
    const guildName = interaction.guild.name;
    const days = interaction.options.getInteger('dias') || 7;
    const limit = interaction.options.getInteger('quantidade') || 10;

    // Cooldown: 15 seconds
    const remaining = checkCooldown(interaction.user.id, 'leaderboard', 15);
    if (remaining) {
        return safeReply(interaction, {
            embeds: [error('Aguarde', `Tente novamente em **${remaining}s**.`)],
            flags: 64
        });
    }

    log.info(`Leaderboard ${days}d (top ${limit}) in ${guildName}`);
    await safeDefer(interaction);

    try {
        const topMembers = await messagesRepo.getTopActiveMembers(guildId, days, limit);

        if (!topMembers || topMembers.length === 0) {
            return interaction.editReply({
                embeds: [error('Sem Dados',
                    '📊 Não há dados de atividade registrados para este período.\n\n' +
                    '**Sugestões:**\n' +
                    '• Tente um período maior\n' +
                    '• Aguarde mais atividade no servidor'
                )]
            });
        }

        const maxMsgs = topMembers[0]?.message_count || 1;
        const totalMessages = topMembers.reduce((sum, m) => sum + m.message_count, 0);

        // Build leaderboard text with visual bars
        const leaderboardText = topMembers.map((member, i) => {
            const barLength = Math.round((member.message_count / maxMsgs) * 10);
            const bar = '█'.repeat(barLength) + '░'.repeat(10 - barLength);
            const medal = getMedal(i);
            const percentage = Math.round((member.message_count / totalMessages) * 100);

            return `${medal} <@${member.author_id}>\n` +
                `\`${bar}\` **${formatNumber(member.message_count)}** msgs (${percentage}%)`;
        }).join('\n\n');

        // Period label
        const periodLabel = days === 1 ? 'Hoje' :
            days === 7 ? 'Esta Semana' :
                days === 14 ? 'Últimos 14 Dias' :
                    'Este Mês';

        let embed = new EmbedBuilder()
            .setColor(CMD_COLORS.INFO)
            .setTitle(`🏆 Top ${topMembers.length} — ${periodLabel}`)
            .setDescription(leaderboardText)
            .addFields(
                {
                    name: '📊 Estatísticas',
                    value: `**Total:** ${formatNumber(totalMessages)} mensagens\n**Período:** ${days} dias`,
                    inline: true
                }
            )
            .setFooter({ text: `GuildLens • ${guildName}` })
            .setTimestamp();

        // Check if requesting user is in the leaderboard
        const userPosition = topMembers.findIndex(m => m.author_id === interaction.user.id);
        if (userPosition !== -1) {
            embed.addFields({
                name: '🎯 Sua Posição',
                value: `Você está em **#${userPosition + 1}** com **${formatNumber(topMembers[userPosition].message_count)}** mensagens!`,
                inline: true
            });
        }

        // Add watermark
        const plan = await getPlanForWatermark(guildId);
        embed = addWatermark(embed, plan);

        // Navigation buttons
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`leaderboard_${days}_prev`)
                    .setLabel('⬅️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('leaderboard_refresh')
                    .setLabel('🔄 Atualizar')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`leaderboard_${days}_next`)
                    .setLabel('➡️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(topMembers.length < limit)
            );

        await interaction.editReply({ embeds: [embed], components: [row] });
        log.success(`Leaderboard shown (${topMembers.length} members) in ${guildName}`);

    } catch (err) {
        log.error(`Leaderboard failed in ${guildName}`, err);
        await interaction.editReply({
            embeds: [error('Erro ao Carregar', 'Não foi possível carregar o ranking.\nTente novamente em alguns instantes.')]
        });
    }
}

/**
 * Get medal emoji by position
 */
function getMedal(position) {
    const medals = ['🥇', '🥈', '🥉'];
    if (position < 3) return medals[position];
    return `\`${position + 1}.\``;
}

module.exports = { data, execute };
