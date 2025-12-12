// FILE: src/discord/commands/stats.js
// Slash command: /guildlens-stats - Server statistics overview

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const { safeReply, safeDefer, checkCooldown, error } = require('../../utils/commandUtils');
const { COLORS, EMOJI } = require('../../config/constants');
const messagesRepo = require('../../db/repositories/messages');
const { addWatermark, getPlanForWatermark } = require('../../utils/planEnforcement');

const log = logger.child('StatsCommand');

const data = new SlashCommandBuilder()
    .setName('guildlens-stats')
    .setDescription('📊 Ver estatísticas detalhadas do servidor')
    .setDMPermission(false)
    .addStringOption(option =>
        option.setName('periodo')
            .setDescription('Período de análise')
            .setRequired(false)
            .addChoices(
                { name: '📅 Hoje', value: '1' },
                { name: '📆 Última semana', value: '7' },
                { name: '📆 Último mês', value: '30' }
            )
    );

async function execute(interaction) {
    const guildId = interaction.guildId;
    const guildName = interaction.guild.name;
    const period = parseInt(interaction.options.getString('periodo') || '7');

    // Cooldown: 10 seconds
    const remaining = checkCooldown(interaction.user.id, 'stats', 10);
    if (remaining) {
        return safeReply(interaction, {
            embeds: [error('Aguarde', `Tente novamente em ${remaining}s.`)],
            flags: 64
        });
    }

    log.info(`Stats command in ${guildName} (period: ${period} days)`);
    await safeDefer(interaction);

    try {
        // Fetch all data in parallel for performance
        const [periodCount, todayCount, topChannels, topUsers] = await Promise.all([
            messagesRepo.getMessageCount(guildId, period),
            messagesRepo.getMessageCount(guildId, 1),
            messagesRepo.getTopChannels(guildId, period, 3),
            messagesRepo.getTopAuthors(guildId, period, 3)
        ]);

        const avgPerDay = Math.round(periodCount / period);
        const memberCount = interaction.guild.memberCount;
        const channelCount = interaction.guild.channels.cache.filter(c => c.isTextBased()).size;

        // Format top channels
        const topChannelsText = topChannels.length > 0
            ? topChannels.map((c, i) => {
                const medal = ['🥇', '🥈', '🥉'][i] || '•';
                return `${medal} <#${c.channel_id}> — ${c.count.toLocaleString('pt-BR')} msgs`;
            }).join('\n')
            : '_Sem dados_';

        // Format top users
        const topUsersText = topUsers.length > 0
            ? topUsers.map((u, i) => {
                const medal = ['🥇', '🥈', '🥉'][i] || '•';
                return `${medal} <@${u.author_id}> — ${u.count.toLocaleString('pt-BR')} msgs`;
            }).join('\n')
            : '_Sem dados_';

        // Period label
        const periodLabel = period === 1 ? 'Hoje' : period === 7 ? 'Última Semana' : 'Último Mês';

        let embed = new EmbedBuilder()
            .setColor(COLORS.INFO)
            .setTitle(`${EMOJI.CHART} Estatísticas do Servidor`)
            .setDescription(`**Período:** ${periodLabel}`)
            .addFields(
                { name: '💬 Total Mensagens', value: `**${periodCount.toLocaleString('pt-BR')}**`, inline: true },
                { name: '📅 Hoje', value: `**${todayCount.toLocaleString('pt-BR')}**`, inline: true },
                { name: '📈 Média/Dia', value: `**${avgPerDay.toLocaleString('pt-BR')}**`, inline: true },
                { name: '👥 Membros', value: `**${memberCount.toLocaleString('pt-BR')}**`, inline: true },
                { name: '📺 Canais', value: `**${channelCount}**`, inline: true },
                { name: '\u200B', value: '\u200B', inline: true }, // Spacer
                { name: '🏆 Top Canais', value: topChannelsText, inline: true },
                { name: '👑 Top Membros', value: topUsersText, inline: true }
            )
            .setFooter({ text: `GuildLens • ${guildName}` })
            .setTimestamp();

        const plan = await getPlanForWatermark(guildId);
        embed = addWatermark(embed, plan);

        await interaction.editReply({ embeds: [embed] });
        log.success(`Stats shown in ${guildName}`);

    } catch (err) {
        log.error(`Stats failed in ${guildName}`, err);
        await interaction.editReply({ embeds: [error('Erro', 'Falha ao carregar estatísticas.')] });
    }
}

module.exports = { data, execute };
