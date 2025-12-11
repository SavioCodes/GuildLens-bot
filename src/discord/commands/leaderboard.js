// FILE: src/discord/commands/leaderboard.js
// Slash command: /guildlens-leaderboard - Shows most active members

const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');
const logger = require('../../utils/logger');
const { COLORS, EMOJI } = require('../../utils/embeds');
const messagesRepo = require('../../db/repositories/messages');
const { handleCommandError } = require('../../utils/errorHandler');
const { addWatermark, getPlanForWatermark } = require('../../utils/planEnforcement');

const log = logger.child('Leaderboard');

/**
 * Command data for registration
 */
const data = new SlashCommandBuilder()
    .setName('guildlens-leaderboard')
    .setDescription('🏆 Mostra os membros mais ativos do servidor')
    .setDMPermission(false)
    .addStringOption(option =>
        option
            .setName('periodo')
            .setDescription('Período para analisar')
            .addChoices(
                { name: '📅 Últimos 7 dias', value: '7' },
                { name: '📅 Últimos 30 dias', value: '30' },
                { name: '📅 Todo o tempo', value: '365' }
            )
    );

/**
 * Medal emojis for top positions
 */
const MEDALS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

/**
 * Creates a visual progress bar
 */
function createProgressBar(value, max, length = 10) {
    const filled = Math.round((value / max) * length);
    const empty = length - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Executes the leaderboard command
 */
async function execute(interaction) {
    const guildId = interaction.guildId;
    const days = parseInt(interaction.options.getString('periodo') || '7');

    log.info(`Leaderboard command in ${interaction.guild.name} (${days} days)`);

    await interaction.deferReply();

    try {
        // Get top active members
        const topMembers = await messagesRepo.getTopActiveMembers(guildId, days, 10);

        if (!topMembers || topMembers.length === 0) {
            const noDataEmbed = new EmbedBuilder()
                .setTitle('🏆 Leaderboard')
                .setColor(COLORS.WARNING)
                .setDescription(
                    '📊 **Ainda não há dados suficientes!**\n\n' +
                    'O bot precisa coletar mensagens por alguns dias antes de gerar o ranking.\n' +
                    'Continue usando o servidor normalmente!'
                )
                .setTimestamp();

            return interaction.editReply({ embeds: [noDataEmbed] });
        }

        // Get max for progress bar scaling
        const maxMessages = topMembers[0]?.message_count || 1;

        // Build leaderboard
        let leaderboardText = '';
        for (let i = 0; i < topMembers.length; i++) {
            const member = topMembers[i];
            const medal = MEDALS[i] || `${i + 1}.`;
            const bar = createProgressBar(member.message_count, maxMessages, 8);
            const count = member.message_count.toLocaleString('pt-BR');

            leaderboardText += `${medal} <@${member.user_id}>\n`;
            leaderboardText += `   ${bar} **${count}** mensagens\n\n`;
        }

        // Period text
        const periodText = days === 365 ? 'Todo o tempo' : `Últimos ${days} dias`;

        // Build embed
        let embed = new EmbedBuilder()
            .setTitle('🏆 Leaderboard — Membros Mais Ativos')
            .setColor(COLORS.PRIMARY)
            .setDescription(leaderboardText)
            .addFields(
                { name: '📅 Período', value: periodText, inline: true },
                { name: '👥 Total Analisado', value: `${topMembers.length} membros`, inline: true }
            )
            .setThumbnail(interaction.guild.iconURL({ size: 128 }))
            .setFooter({ text: 'GuildLens • Ranking de Atividade' })
            .setTimestamp();

        // Add watermark for free plan
        const plan = await getPlanForWatermark(guildId);
        embed = addWatermark(embed, plan);

        await interaction.editReply({ embeds: [embed] });

        log.success(`Leaderboard shown for ${interaction.guild.name}`);

    } catch (error) {
        log.error('Leaderboard command failed', error);
        await handleCommandError(error, interaction, 'guildlens-leaderboard');
    }
}

module.exports = {
    data,
    execute,
};
