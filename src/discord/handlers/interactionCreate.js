// FILE: src/discord/handlers/interactionCreate.js
// Handler for Discord interaction events (slash commands)

const logger = require('../../utils/logger');
const { createErrorEmbed } = require('../../utils/embeds');
const { handleCommandError } = require('../../utils/errorHandler');
const maintenanceState = require('../../utils/maintenanceState');
const { BOT_OWNER_ID } = require('../../utils/constants');

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
    'guildlens-export': exportCommand,
};

/**
 * Handles incoming interactions (slash commands, buttons, etc.)
 * @param {Interaction} interaction - Discord.js Interaction object
 */
async function handleInteractionCreate(interaction) {
    // Only handle slash commands for now
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

module.exports = {
    handleInteractionCreate,
    getCommandsData,
};
