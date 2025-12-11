// FILE: src/discord/commands/leaderboard.js
// Slash command: /guildlens-leaderboard

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const { safeReply, safeDefer, checkCooldown, error, CMD_COLORS } = require('../../utils/commandUtils');
const messagesRepo = require('../../db/repositories/messages');

const log = logger.child('LeaderboardCommand');

const data = new SlashCommandBuilder()
    .setName('guildlens-leaderboard')
    .setDescription('Ranking de membros mais ativos')
    .setDMPermission(false)
    .addIntegerOption(opt => opt
        .setName('dias')
        .setDescription('Período em dias (1-30)')
        .setMinValue(1)
        .setMaxValue(30)
    );

async function execute(interaction) {
    const guildId = interaction.guildId;
    const guildName = interaction.guild.name;
    const days = interaction.options.getInteger('dias') || 7;

    // Cooldown: 15 seconds
    const remaining = checkCooldown(interaction.user.id, 'leaderboard', 15);
    if (remaining) {
        return safeReply(interaction, {
            embeds: [error('Aguarde', `Tente novamente em ${remaining}s.`)],
            flags: 64
        });
    }

    log.info(`Leaderboard ${days}d in ${guildName}`);
    await safeDefer(interaction);

    try {
        const topMembers = await messagesRepo.getTopActiveMembers(guildId, days, 10);

        if (!topMembers || topMembers.length === 0) {
            return interaction.editReply({
                embeds: [error('Sem Dados', 'Não há dados de atividade ainda.')]
            });
        }

        const maxMsgs = topMembers[0]?.message_count || 1;

        const leaderboardText = topMembers.map((member, i) => {
            const barLength = Math.round((member.message_count / maxMsgs) * 8);
            const bar = '█'.repeat(barLength) + '░'.repeat(8 - barLength);
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
            return `${medal} <@${member.author_id}>\n${bar} **${member.message_count}** msgs`;
        }).join('\n\n');

        const embed = new EmbedBuilder()
            .setColor(CMD_COLORS.INFO)
            .setTitle(`Top 10 — Últimos ${days} dias`)
            .setDescription(leaderboardText)
            .setFooter({ text: 'GuildLens' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        log.success(`Leaderboard shown in ${guildName}`);

    } catch (err) {
        log.error(`Leaderboard failed in ${guildName}`, err);
        await interaction.editReply({ embeds: [error('Erro', 'Falha ao carregar ranking.')] });
    }
}

module.exports = { data, execute };
