// FILE: src/discord/handlers/interactionCreate.js
// Handler for Discord interaction events (slash commands and buttons)

const logger = require('../../utils/logger');
const { createErrorEmbed } = require('../../utils/embeds');
const { handleCommandError } = require('../../utils/errorHandler');
const maintenanceState = require('../../utils/maintenanceState');
const { BOT_OWNER_ID } = require('../../utils/constants');

// Import services
const ticketHandler = require('../services/ticketHandler');

// Import command handlers
const setupCommand = require('../commands/setup');
const healthCommand = require('../commands/health');
const insightsCommand = require('../commands/insights');
const alertsCommand = require('../commands/alerts');
const actionsCommand = require('../commands/actions');
const aboutCommand = require('../commands/about');
const premiumCommand = require('../commands/premium');
const adminCommand = require('../commands/admin');
const communityCommand = require('../commands/community');
const helpCommand = require('../commands/help');
const exportCommand = require('../commands/export');

const log = logger.child('Interaction');

/**
 * Command registry - maps command names to their handlers
 */
const commands = {
    'guildlens-setup': setupCommand,
    'guildlens-health': healthCommand,
    'guildlens-insights': insightsCommand,
    'guildlens-alerts': alertsCommand,
    'guildlens-actions': actionsCommand,
    'guildlens-about': aboutCommand,
    'guildlens-premium': premiumCommand,
    'guildlens-admin': adminCommand,
    'guildlens-community': communityCommand,
    'guildlens-help': helpCommand,
    'guildlens-export': exportCommand,
};

/**
 * Handles incoming interactions (slash commands, buttons, etc.)
 * @param {Interaction} interaction - Discord.js Interaction object
 */
async function handleInteractionCreate(interaction) {

    // [BUTTONS] Handle Button Interactions first
    if (interaction.isButton()) {
        const { customId } = interaction;

        if (customId === 'open_ticket') {
            await ticketHandler.handleOpenTicket(interaction);
            return;
        }

        if (customId === 'close_ticket') {
            await ticketHandler.handleCloseTicket(interaction);
            return;
        }

        return;
    }

    // Only handle slash commands from here
    if (!interaction.isChatInputCommand()) {
        return;
    }

    const { commandName, user, guild } = interaction;

    // [ROBUSTNESS] Maintenance Mode Check
    if (maintenanceState.isEnabled() && user.id !== BOT_OWNER_ID) {
        return interaction.reply({
            content: `🔒 **Sistema em Manutenção**\n${maintenanceState.getReason()}\n\nO bot está temporariamente bloqueado para atualizações. Tente novamente em breve.`,
            flags: 64 // Ephemeral
        });
    }

    // [POLISH] Command Cooldowns (Avoid Spam)
    if (user.id !== BOT_OWNER_ID) {
        const cooldownTime = 3000; // 3 Seconds

        if (checkCooldown(user.id, commandName)) {
            const expires = getCooldown(user.id, commandName);
            const remaining = ((expires - Date.now()) / 1000).toFixed(1);
            return interaction.reply({
                content: `⏳ **Calma aí!** Aguarde ${remaining}s para usar \`/${commandName}\` novamente.`,
                flags: 64
            });
        }
        setCooldown(user.id, commandName, cooldownTime);
    }

    log.info(`Command received: /${commandName} by ${user.tag} in ${guild?.name || 'DM'}`);

    // Find the command handler
    const command = commands[commandName];

    if (!command) {
        log.warn(`Unknown command: ${commandName}`);
        try {
            await interaction.reply({
                embeds: [createErrorEmbed(
                    'Comando Desconhecido',
                    `O comando \`/${commandName}\` não existe.`
                )],
                flags: 64, // Ephemeral
            });
        } catch (err) {
            log.error('Failed to reply to unknown command', 'Interaction', err);
        }
        return;
    }

    // Execute the command
    try {
        await command.execute(interaction);
        log.success(`Command completed: /${commandName}`);
    } catch (error) {
        log.error(`Command failed: /${commandName}`, 'Interaction', error);

        // Use the improved error handler
        await handleCommandError(error, interaction, commandName);
    }
}

/**
 * Gets command data for registration
 * @returns {Array} Array of command data objects
 */
function getCommandsData() {
    return Object.values(commands)
        .filter(cmd => cmd.data)
        .map(cmd => cmd.data.toJSON());
}

// COOLDOWN SYSTEM
const cooldowns = new Map();

function checkCooldown(userId, commandName) {
    const key = `${userId}-${commandName}`;
    const expires = cooldowns.get(key);
    if (!expires) return false;
    return Date.now() < expires;
}

function getCooldown(userId, commandName) {
    const key = `${userId}-${commandName}`;
    return cooldowns.get(key);
}

function setCooldown(userId, commandName, duration) {
    const key = `${userId}-${commandName}`;
    cooldowns.set(key, Date.now() + duration);

    // Cleanup
    setTimeout(() => cooldowns.delete(key), duration);
}

module.exports = {
    handleInteractionCreate,
    getCommandsData,
};
