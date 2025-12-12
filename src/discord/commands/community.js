// FILE: src/discord/commands/community.js
// Slash command: /guildlens-community

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const { success, error, safeReply, safeDefer, checkCooldown, CMD_COLORS } = require('../../utils/commandUtils');
const { sanitizeString } = require('../../utils/validation');
const OFFICIAL = require('../../utils/official');

const log = logger.child('CommunityCommand');

const data = new SlashCommandBuilder()
    .setName('guildlens-community')
    .setDescription('👥 Enviar sugestões e reportar bugs para a equipe')
    .addSubcommand(sub => sub
        .setName('suggest')
        .setDescription('Envie uma sugestão')
        .addStringOption(opt => opt
            .setName('sugestao')
            .setDescription('Sua sugestão')
            .setRequired(true)
            .setMinLength(10)
            .setMaxLength(500)
        )
    )
    .addSubcommand(sub => sub
        .setName('report-bug')
        .setDescription('Reporte um bug')
        .addStringOption(opt => opt
            .setName('problema')
            .setDescription('Descrição do bug')
            .setRequired(true)
            .setMinLength(10)
            .setMaxLength(500)
        )
    );

async function execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    // Cooldown: 60 seconds
    const remaining = checkCooldown(userId, 'community', 60);
    if (remaining) {
        return safeReply(interaction, {
            embeds: [error('Aguarde', `Tente novamente em ${remaining}s.`)],
            flags: 64
        });
    }

    await safeDefer(interaction, true);

    try {
        const officialGuild = interaction.client.guilds.cache.get(OFFICIAL.GUILD_ID);
        if (!officialGuild) {
            return interaction.editReply({ embeds: [error('Erro', 'Servidor oficial não encontrado.')] });
        }

        if (subcommand === 'suggest') {
            const suggestion = sanitizeString(interaction.options.getString('sugestao'), 500);
            const channel = officialGuild.channels.cache.get(OFFICIAL.CHANNELS.SUGESTOES);

            if (!channel) {
                return interaction.editReply({ embeds: [error('Erro', 'Canal não encontrado.')] });
            }

            const embed = new EmbedBuilder()
                .setColor(CMD_COLORS.INFO)
                .setTitle('💡 Sugestão')
                .setDescription(suggestion)
                .setFooter({ text: `De: ${interaction.user.tag}` })
                .setTimestamp();

            await channel.send({ embeds: [embed] });
            await interaction.editReply({ embeds: [success('Enviado', 'Sua sugestão foi enviada!')] });
            log.success(`Suggestion from ${interaction.user.tag}`);

        } else if (subcommand === 'report-bug') {
            const bugReport = sanitizeString(interaction.options.getString('problema'), 500);
            const channel = officialGuild.channels.cache.get(OFFICIAL.CHANNELS.BUGS);

            if (!channel) {
                return interaction.editReply({ embeds: [error('Erro', 'Canal não encontrado.')] });
            }

            const embed = new EmbedBuilder()
                .setColor(CMD_COLORS.ERROR)
                .setTitle('🐛 Bug Report')
                .setDescription(bugReport)
                .addFields(
                    { name: 'Usuário', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
                    { name: 'Servidor', value: interaction.guild?.name || 'DM', inline: true }
                )
                .setTimestamp();

            await channel.send({ embeds: [embed] });
            await interaction.editReply({ embeds: [success('Enviado', 'Bug reportado com sucesso!')] });
            log.success(`Bug report from ${interaction.user.tag}`);
        }

    } catch (err) {
        log.error('Community command failed', err);
        await interaction.editReply({ embeds: [error('Erro', 'Falha ao processar. Tente novamente.')] });
    }
}

module.exports = { data, execute };
