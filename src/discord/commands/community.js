// FILE: src/discord/commands/community.js
// Slash command: /guildlens-community - Interaction with the official community

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const logger = require('../../utils/logger');
const { COLORS, EMOJI } = require('../../utils/embeds');
const { handleCommandError } = require('../../utils/errorHandler');
const OFFICIAL = require('../../utils/official');
const { sanitizeString } = require('../../utils/validation');

const log = logger.child('CommunityCommand');

/**
 * Command data for registration
 */
const data = new SlashCommandBuilder()
    .setName('guildlens-community')
    .setDescription('Interaja com a comunidade oficial do GuildLens')
    .addSubcommand(subcommand =>
        subcommand
            .setName('suggest')
            .setDescription('Envie uma sugestão para o time de desenvolvimento')
            .addStringOption(option =>
                option
                    .setName('sugestao')
                    .setDescription('Sua ideia incrível')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('report-bug')
            .setDescription('Reporte um problema ou erro encontrado')
            .addStringOption(option =>
                option
                    .setName('problema')
                    .setDescription('Descreva o erro que encontrou')
                    .setRequired(true)
            )
    );

/**
 * Executes the community command
 * @param {Interaction} interaction - Discord interaction
 */
async function execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    try {
        switch (subcommand) {
            case 'suggest':
                await handleSuggest(interaction);
                break;
            case 'report-bug':
                await handleReportBug(interaction);
                break;
            default:
                await interaction.reply({
                    content: '❌ Subcomando inválido.',
                    flags: 64,
                });
        }
    } catch (error) {
        log.error('Community command failed', 'Community', error);
        await handleCommandError(error, interaction, 'guildlens-community');
    }
}

/**
 * Handles suggestion submission
 */
async function handleSuggest(interaction) {
    const suggestion = sanitizeString(interaction.options.getString('sugestao'), 2000);

    if (suggestion.length < 10) {
        return interaction.reply({ content: '❌ A sugestão deve ter pelo menos 10 caracteres.', flags: 64 });
    }

    await interaction.deferReply({ flags: 64 });

    // Target channel in Official Server
    const officialGuild = interaction.client.guilds.cache.get(OFFICIAL.GUILD_ID);
    if (!officialGuild) {
        return interaction.editReply('❌ Erro de conexão com o servidor oficial. Tente novamente mais tarde.');
    }

    const suggestionsChannel = officialGuild.channels.cache.get(OFFICIAL.CHANNELS.SUGESTOES);
    if (!suggestionsChannel) {
        return interaction.editReply('❌ Canal de sugestões não encontrado. Contate o suporte.');
    }

    // Create Embed
    const embed = new EmbedBuilder()
        .setTitle('💡 Nova Sugestão')
        .setDescription(suggestion)
        .setColor(COLORS.INFO)
        .setAuthor({
            name: interaction.user.tag,
            iconURL: interaction.user.displayAvatarURL()
        })
        .addFields({
            name: 'Origem',
            value: interaction.guild ? `${interaction.guild.name} (${interaction.guildId})` : 'DM',
            inline: true
        })
        .setTimestamp()
        .setFooter({ text: `ID: ${interaction.user.id}` });

    // Create Voting Buttons
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('vote_up')
                .setLabel('👍') // Simplified, actual logic for counting votes needs persistence or message checks
                .setStyle(ButtonStyle.Success)
                .setDisabled(true), // Disabled since we don't have a click handler for this yet
            new ButtonBuilder()
                .setCustomId('vote_down')
                .setLabel('👎')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(true)
        );

    // Send to Official Channel
    await suggestionsChannel.send({ embeds: [embed] }); // Removed components for now to keep simple

    // Confirm to user
    await interaction.editReply(`✅ **Sugestão enviada!**\nEla apareceu no canal <#${OFFICIAL.CHANNELS.SUGESTOES}> no servidor oficial.`);
}

/**
 * Handles bug reporting
 */
async function handleReportBug(interaction) {
    const bugReport = sanitizeString(interaction.options.getString('problema'), 2000);

    if (bugReport.length < 10) {
        return interaction.reply({ content: '❌ O reporte deve ter pelo menos 10 caracteres.', flags: 64 });
    }

    await interaction.deferReply({ flags: 64 });

    // Target channel in Official Server
    const officialGuild = interaction.client.guilds.cache.get(OFFICIAL.GUILD_ID);
    if (!officialGuild) {
        return interaction.editReply('❌ Erro de conexão com o servidor oficial.');
    }

    const bugsChannel = officialGuild.channels.cache.get(OFFICIAL.CHANNELS.BUGS);
    if (!bugsChannel) {
        return interaction.editReply('❌ Canal de bugs não encontrado.');
    }

    // Create Embed
    const embed = new EmbedBuilder()
        .setTitle('🪲 Bug Reportado')
        .setDescription(bugReport)
        .setColor(COLORS.ERROR)
        .addFields(
            { name: 'Repórter', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
            { name: 'Servidor', value: interaction.guild ? `${interaction.guild.name} (${interaction.guildId})` : 'DM', inline: true }
        )
        .setTimestamp();

    // Send to Official Channel
    await bugsChannel.send({ embeds: [embed] });

    // Confirm to user
    await interaction.editReply('✅ **Bug reportado com sucesso!**\nNossa equipe técnica vai analisar o problema. Obrigado pelo aviso!');
}

module.exports = {
    data,
    execute,
};
