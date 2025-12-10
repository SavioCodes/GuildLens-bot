// FILE: src/discord/commands/setup.js
// Slash command: /guildlens-setup - Server configuration
// Main command file - handlers extracted to ./setup/handlers/

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const logger = require('../../utils/logger');
const { createErrorEmbed } = require('../../utils/embeds');
const guildsRepo = require('../../db/repositories/guilds');
const { handleCommandError } = require('../../utils/errorHandler');

// Import modular handlers
const {
    handleChannelsSetup,
    handleLanguageSetup,
    handleStaffSetup,
    handleAlertasSetup,
    handleViewConfig,
} = require('./setup/handlers');

const log = logger.child('SetupCommand');

/**
 * Command data for registration
 * @type {SlashCommandBuilder}
 */
const data = new SlashCommandBuilder()
    .setName('guildlens-setup')
    .setDescription('Configura o GuildLens para monitorar seu servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addSubcommand(subcommand =>
        subcommand
            .setName('canais')
            .setDescription('Define quais canais o bot deve monitorar')
            .addStringOption(option =>
                option
                    .setName('modo')
                    .setDescription('Modo de monitoramento')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Todos os canais de texto', value: 'all' },
                        { name: 'Canais específicos', value: 'specific' },
                    )
            )
            .addChannelOption(option =>
                option
                    .setName('canal1')
                    .setDescription('Primeiro canal a monitorar')
                    .addChannelTypes(ChannelType.GuildText)
            )
            .addChannelOption(option =>
                option
                    .setName('canal2')
                    .setDescription('Segundo canal a monitorar')
                    .addChannelTypes(ChannelType.GuildText)
            )
            .addChannelOption(option =>
                option
                    .setName('canal3')
                    .setDescription('Terceiro canal a monitorar')
                    .addChannelTypes(ChannelType.GuildText)
            )
            .addChannelOption(option =>
                option
                    .setName('canal4')
                    .setDescription('Quarto canal a monitorar')
                    .addChannelTypes(ChannelType.GuildText)
            )
            .addChannelOption(option =>
                option
                    .setName('canal5')
                    .setDescription('Quinto canal a monitorar')
                    .addChannelTypes(ChannelType.GuildText)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('idioma')
            .setDescription('Define o idioma das respostas do bot')
            .addStringOption(option =>
                option
                    .setName('idioma')
                    .setDescription('Idioma preferido')
                    .setRequired(true)
                    .addChoices(
                        { name: '🇧🇷 Português (Brasil)', value: 'pt-BR' },
                        { name: '🇺🇸 English (US)', value: 'en-US' },
                    )
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('staff')
            .setDescription('Define o cargo de staff para receber alertas')
            .addRoleOption(option =>
                option
                    .setName('cargo')
                    .setDescription('Cargo de staff (deixe vazio para remover)')
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('alertas')
            .setDescription('Define o canal para alertas automáticos (Growth)')
            .addChannelOption(option =>
                option
                    .setName('canal')
                    .setDescription('Canal para receber alertas (deixe vazio para desativar)')
                    .addChannelTypes(ChannelType.GuildText)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('ver')
            .setDescription('Mostra a configuração atual do GuildLens')
    );

/**
 * Subcommand handlers map
 * @type {Object.<string, Function>}
 */
const subcommandHandlers = {
    'canais': handleChannelsSetup,
    'idioma': handleLanguageSetup,
    'staff': handleStaffSetup,
    'alertas': handleAlertasSetup,
    'ver': handleViewConfig,
};

/**
 * Executes the setup command
 * @param {Interaction} interaction - Discord interaction
 * @returns {Promise<void>}
 */
async function execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const memberCount = interaction.guild.memberCount || 0;

    log.info(`Setup command: ${subcommand} in ${interaction.guild.name}`);

    // Ensure guild exists in database with settings
    try {
        await guildsRepo.ensureGuild(guildId, interaction.guild.name, memberCount);
    } catch (error) {
        log.error('Failed to ensure guild exists', 'Setup', error);
        await handleCommandError(error, interaction, 'guildlens-setup');
        return;
    }

    // Get handler for subcommand
    const handler = subcommandHandlers[subcommand];

    if (!handler) {
        await interaction.reply({
            embeds: [createErrorEmbed(
                'Subcomando Inválido',
                'Este subcomando não existe.'
            )],
            flags: 64,
        });
        return;
    }

    // Execute handler
    await handler(interaction, guildId);
}

module.exports = {
    data,
    execute,
};
