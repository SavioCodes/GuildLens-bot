// FILE: src/discord/commands/stats.js
// Slash command: /guildlens-stats

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const { safeReply, safeDefer, checkCooldown, error, CMD_COLORS } = require('../../utils/commandUtils');
const messagesRepo = require('../../db/repositories/messages');
const { addWatermark, getPlanForWatermark } = require('../../utils/planEnforcement');

const log = logger.child('StatsCommand');

const data = new SlashCommandBuilder()
    .setName('guildlens-stats')
    .setDescription('Estatísticas do servidor')
    .setDMPermission(false);

async function execute(interaction) {
    const guildId = interaction.guildId;
    const guildName = interaction.guild.name;

    // Cooldown: 10 seconds
    const remaining = checkCooldown(interaction.user.id, 'stats', 10);
    if (remaining) {
        return safeReply(interaction, {
            embeds: [error('Aguarde', `Tente novamente em ${remaining}s.`)],
            flags: 64
        });
    }

    log.info(`Stats command in ${guildName}`);
    await safeDefer(interaction);

    try {
        const [today, week] = await Promise.all([
            messagesRepo.getMessageCount(guildId, 1),
            messagesRepo.getMessageCount(guildId, 7)
        ]);

        const avgPerDay = Math.round(week / 7);
        const memberCount = interaction.guild.memberCount;

        let embed = new EmbedBuilder()
            .setColor(CMD_COLORS.INFO)
            .setTitle('Estatísticas')
            .addFields(
                { name: 'Hoje', value: `${today.toLocaleString('pt-BR')} msgs`, inline: true },
                { name: 'Semana', value: `${week.toLocaleString('pt-BR')} msgs`, inline: true },
                { name: 'Média/Dia', value: `${avgPerDay} msgs`, inline: true },
                { name: 'Membros', value: memberCount.toLocaleString('pt-BR'), inline: true }
            )
            .setFooter({ text: 'GuildLens' })
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
