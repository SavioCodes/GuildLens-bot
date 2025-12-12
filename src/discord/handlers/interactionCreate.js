// FILE: src/discord/handlers/interactionCreate.js
// Handler for Discord interaction events (slash commands, buttons, context menus)

const logger = require('../../utils/logger');
const { createErrorEmbed } = require('../../utils/embeds');
const { handleCommandError } = require('../../utils/errorHandler');
const maintenanceState = require('../../utils/maintenanceState');
const { BOT_OWNER_ID } = require('../../utils/constants');
const { checkCooldown } = require('../../utils/commandUtils');

// Services & Handlers
const TicketController = require('../services/tickets/TicketController');
const { handleMemberVerification, enforceOfficialPermissions } = require('../handlers/officialServer');
const OFFICIAL = require('../../utils/official');
const upsellService = require('../../services/upsell');

// Command Registry
const commands = {
    'guildlens-setup': require('../commands/setup'),
    'guildlens-health': require('../commands/health'),
    'guildlens-insights': require('../commands/insights'),
    'guildlens-alerts': require('../commands/alerts'),
    'guildlens-actions': require('../commands/actions'),
    'guildlens-about': require('../commands/about'),
    'guildlens-premium': require('../commands/premium'),
    'guildlens-admin': require('../commands/admin'),
    'guildlens-community': require('../commands/community'),
    'guildlens-help': require('../commands/help'),
    'guildlens-export': require('../commands/export'),
    'guildlens-leaderboard': require('../commands/leaderboard'),
    'guildlens-stats': require('../commands/stats'),
};

// Import services
const userInfoCommand = require('../commands/context/userInfo');
const log = logger.child('Interaction');

/**
 * Handles incoming interactions
 * @param {Interaction} interaction 
 */
async function handleInteractionCreate(interaction) {
    try {
        if (interaction.isButton()) await handleButton(interaction);
        else if (interaction.isUserContextMenuCommand()) await handleContextMenu(interaction);
        else if (interaction.isChatInputCommand()) await handleSlashCommand(interaction);
    } catch (error) {
        log.error('Interaction Router Fatal Error', error);
    }
}

/**
 * Handle Button Interactions
 */
async function handleButton(interaction) {
    const { customId } = interaction;

    // Ticket System
    if (customId === 'open_ticket') {
        await TicketController.createTicket(interaction);
        return;
    }

    if (customId === 'close_ticket') {
        await TicketController.closeTicket(interaction);
        return;
    }

    // Plan Selection Buttons (inside tickets)
    if (customId === 'select_plan_PRO') {
        await TicketController.handlePlanSelection(interaction, 'PRO');
        return;
    }

    if (customId === 'select_plan_GROWTH') {
        await TicketController.handlePlanSelection(interaction, 'GROWTH');
        return;
    }

    if (customId === 'ticket_help_only') {
        // Deprecated or mapped to Support
        await TicketController.handleSelection(interaction, 'SUPPORT');
        return;
    }

    // --- NEW TICKET FLOW BUTTONS ---
    if (customId === 'ticket_type_sales') {
        await TicketController.handleSelection(interaction, 'SALES');
        return;
    }

    if (customId === 'ticket_type_support') {
        await TicketController.handleSelection(interaction, 'SUPPORT');
        return;
    }

    if (customId === 'approve_payment') {
        await TicketController.handleStaffAction(interaction, 'APPROVE');
        return;
    }

    if (customId === 'reject_payment') {
        await TicketController.handleStaffAction(interaction, 'REJECT');
        return;
    }

    if (customId === 'ticket_back_menu') {
        await TicketController.resetToMenu(interaction);
        return;
    }

    // Official Server Actions
    if (customId === 'verify_member') {
        return handleMemberVerification(interaction);
    }
}

/**
 * Handle Context Menu Interactions
 */
async function handleContextMenu(interaction) {
    if (interaction.commandName === 'Ver Perfil (GuildLens)') {
        try {
            await userInfoCommand.execute(interaction);
        } catch (error) {
            log.error('Context menu failed', error);
            await interaction.reply({ content: '❌ Erro ao abrir perfil.', ephemeral: true });
        }
    }
}

/**
 * Handle Slash Commands
 */
async function handleSlashCommand(interaction) {
    const { commandName, user, guild } = interaction;

    // 1. Maintenance Check
    if (maintenanceState.isEnabled() && user.id !== BOT_OWNER_ID) {
        return interaction.reply({
            content: `🔒 **Sistema em Manutenção**\n${maintenanceState.getReason()}\n\nO bot está temporariamente bloqueado.`,
            ephemeral: true
        });
    }

    // 2. Cooldown Check
    if (user.id !== BOT_OWNER_ID) {
        const remaining = checkCooldown(user.id, commandName, 3);
        if (remaining) {
            return interaction.reply({ content: `⏳ Aguarde ${remaining}s.`, ephemeral: true });
        }
    }

    // 3. Official Server Channel Restriction
    if (guild?.id === OFFICIAL.GUILD_ID) {
        const ALLOWED_CHANNEL = OFFICIAL.CHANNELS.COMMANDS_CHANNEL;
        const EXEMPT = ['guildlens-admin'];

        if (interaction.channelId !== ALLOWED_CHANNEL && !EXEMPT.includes(commandName)) {
            // Check if user is staff (bypass restriction)? No, keeps organize.
            return interaction.reply({
                content: `❌ Use comandos apenas em <#${ALLOWED_CHANNEL}>.`,
                ephemeral: true
            });
        }
    }

    log.info(`Command: /${commandName} by ${user.tag}`);

    const command = commands[commandName];
    if (!command) {
        return interaction.reply({ content: '❌ Comando não existe.', ephemeral: true });
    }

    try {
        await command.execute(interaction);
        log.success(`Executed: /${commandName}`);

        // Smart Upsell
        upsellService.attemptUpsell(interaction).catch(() => { });

    } catch (error) {
        await handleCommandError(error, interaction, commandName);
    }
}

/**
 * Gets command data for registration
 */
function getCommandsData() {
    return Object.values(commands)
        .filter(cmd => cmd.data)
        .map(cmd => cmd.data.toJSON());
}

module.exports = {
    handleInteractionCreate,
    getCommandsData,
};

