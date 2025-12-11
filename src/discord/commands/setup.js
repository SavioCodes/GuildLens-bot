// FILE: src/discord/commands/setup.js
// Slash command: /guildlens-setup

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const logger = require('../../utils/logger');
const { safeReply, safeDefer, checkCooldown, error } = require('../../utils/commandUtils');
const guildsRepo = require('../../db/repositories/guilds');

// Import handlers
const {
    handleChannelsSetup,
    handleLanguageSetup,
    handleStaffSetup,
    handleAlertasSetup,
    handleViewConfig,
} = require('./setup/handlers');

const log = logger.child('SetupCommand');

const data = new SlashCommandBuilder()
    .setName('guildlens-setup')
    .setDescription('Configurar o GuildLens')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addSubcommand(sub => sub
        .setName('canais')
        .setDescription('Definir canais para monitorar')
        .addStringOption(opt => opt
            .setName('modo')
            .setDescription('Modo de monitoramento')
            .setRequired(true)
            .addChoices(
                { name: 'Todos os canais', value: 'all' },
                { name: 'Canais específicos', value: 'specific' }
            )
        )
        .addChannelOption(opt => opt.setName('canal1').setDescription('Canal 1').addChannelTypes(ChannelType.GuildText))
        .addChannelOption(opt => opt.setName('canal2').setDescription('Canal 2').addChannelTypes(ChannelType.GuildText))
        .addChannelOption(opt => opt.setName('canal3').setDescription('Canal 3').addChannelTypes(ChannelType.GuildText))
    )
    .addSubcommand(sub => sub
        .setName('idioma')
        .setDescription('Definir idioma do bot')
        .addStringOption(opt => opt
            .setName('idioma')
            .setDescription('Idioma')
            .setRequired(true)
            .addChoices(
                { name: 'Português (BR)', value: 'pt-BR' },
                { name: 'English (US)', value: 'en-US' }
            )
        )
    )
    .addSubcommand(sub => sub
        .setName('staff')
        .setDescription('Definir cargo de staff')
        .addRoleOption(opt => opt.setName('cargo').setDescription('Cargo de staff'))
    )
    .addSubcommand(sub => sub
        .setName('alertas')
        .setDescription('Canal de alertas')
        .addChannelOption(opt => opt.setName('canal').setDescription('Canal').addChannelTypes(ChannelType.GuildText))
    )
    .addSubcommand(sub => sub
        .setName('ver')
        .setDescription('Ver configuração atual')
    );

const handlers = {
    'canais': handleChannelsSetup,
    'idioma': handleLanguageSetup,
    'staff': handleStaffSetup,
    'alertas': handleAlertasSetup,
    'ver': handleViewConfig,
};

async function execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const guildName = interaction.guild.name;

    // Cooldown: 5 seconds
    const remaining = checkCooldown(interaction.user.id, 'setup', 5);
    if (remaining) {
        return safeReply(interaction, {
            embeds: [error('Aguarde', `Tente novamente em ${remaining}s.`)],
            flags: 64
        });
    }

    log.info(`Setup ${subcommand} in ${guildName}`);

    try {
        // Ensure guild exists
        await guildsRepo.ensureGuild(guildId, guildName, interaction.guild.memberCount || 0);

        // Get handler
        const handler = handlers[subcommand];
        if (!handler) {
            return safeReply(interaction, {
                embeds: [error('Erro', 'Subcomando inválido.')],
                flags: 64
            });
        }

        // Execute
        await handler(interaction, guildId);
        log.success(`Setup ${subcommand} completed in ${guildName}`);

    } catch (err) {
        log.error(`Setup ${subcommand} failed in ${guildName}`, err);
        await safeReply(interaction, {
            embeds: [error('Erro', 'Falha na configuração. Tente novamente.')],
            flags: 64
        });
    }
}

module.exports = { data, execute };
