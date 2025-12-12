// FILE: src/discord/commands/admin.js
// Slash command: /guildlens-admin - Router for Admin Services

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../../utils/logger');
const Validation = require('../../utils/validation');
const { handleCommandError } = require('../../utils/errorHandler');

// Services
const AdminGrowth = require('../services/admin/AdminGrowth');
const AdminSystem = require('../services/admin/AdminSystem');
const AdminOfficial = require('../services/admin/AdminOfficial');
const AdminGlobal = require('../services/admin/AdminGlobal');

const log = logger.child('AdminCommand');

/**
 * Command Registration Data
 */
const data = new SlashCommandBuilder()
    .setName('guildlens-admin')
    .setDescription('🔐 Comandos administrativos do GuildLens (apenas dono)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    // Growth
    .addSubcommand(s => s.setName('activate-pro').setDescription('Ativa plano Pro').addStringOption(o => o.setName('server_id').setDescription('ID do servidor')).addIntegerOption(o => o.setName('dias').setDescription('Validade em dias')))
    .addSubcommand(s => s.setName('activate-growth').setDescription('Ativa plano Growth').addStringOption(o => o.setName('server_id').setDescription('ID do servidor')).addIntegerOption(o => o.setName('dias').setDescription('Validade em dias')))
    .addSubcommand(s => s.setName('reset-plan').setDescription('Reseta para Free').addStringOption(o => o.setName('server_id').setDescription('ID do servidor')))
    .addSubcommand(s => s.setName('check-plan').setDescription('Verifica plano').addStringOption(o => o.setName('server_id').setDescription('ID do servidor')))
    // System
    .addSubcommand(s => s.setName('dashboard').setDescription('Dashboard Financeiro'))
    .addSubcommand(s => s.setName('system').setDescription('Saúde do Sistema'))
    .addSubcommand(s => s.setName('view-server').setDescription('Espião').addStringOption(o => o.setName('server_id').setDescription('ID do servidor').setRequired(true)))
    .addSubcommand(s => s.setName('backup').setDescription('Backup dados críticos'))
    // Official
    .addSubcommand(s => s.setName('fix-permissions').setDescription('God Mode: Fix Perms'))
    .addSubcommand(s => s.setName('setup-tickets').setDescription('Deploy Ticket Panel'))
    .addSubcommand(s => s.setName('refresh-content').setDescription('Refresh Content').addStringOption(o => o.setName('canal').setDescription('Canal').setRequired(true).addChoices({ name: 'Todos', value: 'all' })))
    // Global
    .addSubcommand(s => s.setName('broadcast').setDescription('Global Broadcast').addStringOption(o => o.setName('mensagem').setDescription('Msg').setRequired(true)))
    .addSubcommand(s => s.setName('maintenance').setDescription('Modo Manutenção').addStringOption(o => o.setName('estado').setDescription('ON/OFF').setRequired(true).addChoices({ name: 'ON', value: 'on' }, { name: 'OFF', value: 'off' })).addStringOption(o => o.setName('motivo').setDescription('Motivo')));

/**
 * Execution Router
 */
async function execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    log.info(`Admin command: ${subcommand} by ${interaction.user.tag}`);

    // Security Check - Owner Only
    if (!Validation.isOwner(userId)) {
        log.warn(`🚫 Unauthorized admin attempt: ${interaction.user.tag} (${userId})`);
        return interaction.reply({ content: '🔒 **Acesso Negado.**\nEste comando é restrito ao dono do bot.', flags: 64 });
    }

    // Defer for long operations
    await interaction.deferReply({ flags: 64 });

    try {
        switch (subcommand) {
            // Growth
            case 'activate-pro': return AdminGrowth.activatePro(interaction);
            case 'activate-growth': return AdminGrowth.activateGrowth(interaction);
            case 'reset-plan': return AdminGrowth.resetPlan(interaction);
            case 'check-plan': return AdminGrowth.checkPlan(interaction);

            // System
            case 'dashboard': return AdminSystem.dashboard(interaction);
            case 'system': return AdminSystem.systemStats(interaction);
            case 'view-server': return AdminSystem.spyServer(interaction);
            case 'backup': return AdminSystem.backup(interaction);

            // Official
            case 'fix-permissions': return AdminOfficial.fixPermissions(interaction);
            case 'setup-tickets': return AdminOfficial.setupTickets(interaction);
            case 'refresh-content': return AdminOfficial.refreshContent(interaction);

            // Global
            case 'broadcast': return AdminGlobal.broadcast(interaction);
            case 'maintenance': return AdminGlobal.maintenance(interaction);

            default:
                await interaction.reply({ content: '❌ Subcomando não implementado.', flags: 64 });
        }
    } catch (error) {
        await handleCommandError(error, interaction, `Admin: ${subcommand}`);
    }
}

module.exports = { data, execute };
