// FILE: src/discord/handlers/interactionCreate.js
// Handler for Discord interaction events (slash commands, buttons, context menus)

const logger = require('../../utils/logger');
const { createErrorEmbed } = require('../../utils/embeds');
const { handleCommandError } = require('../../utils/errorHandler');
const maintenanceState = require('../../utils/maintenanceState');
const { BOT_OWNER_ID } = require('../../utils/constants');

// Import services
const ticketHandler = require('../services/ticketHandler');
const userInfoCommand = require('../commands/context/userInfo');

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
const leaderboardCommand = require('../commands/leaderboard');
const statsCommand = require('../commands/stats');

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
    'guildlens-leaderboard': leaderboardCommand,
    'guildlens-stats': statsCommand,
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

        // Plan Selection Buttons (inside tickets)
        if (customId === 'select_plan_PRO') {
            await ticketHandler.handlePlanSelection(interaction, 'PRO');
            return;
        }

        if (customId === 'select_plan_GROWTH') {
            await ticketHandler.handlePlanSelection(interaction, 'GROWTH');
            return;
        }

        if (customId === 'ticket_help_only') {
            await ticketHandler.handleHelpOnly(interaction);
            return;
        }

        // Member Verification Button
        if (customId === 'verify_member') {
            await handleVerification(interaction);
            return;
        }

        return;
    }

    // [CONTEXT MENU] Handle User Context Interactions
    if (interaction.isUserContextMenuCommand()) {
        if (interaction.commandName === 'Ver Perfil (GuildLens)') {
            try {
                await userInfoCommand.execute(interaction);
            } catch (error) {
                log.error('Context menu failed', error);
                await interaction.reply({ content: '❌ Erro ao abrir perfil.', ephemeral: true });
            }
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
            log.error('Failed to reply to unknown command', err);
        }
        return;
    }

    // Execute the command
    try {
        await command.execute(interaction);
        log.success(`Command completed: /${commandName}`);
    } catch (error) {
        log.error(`Command failed: /${commandName}`, error);

        // Use the improved error handler
        await handleCommandError(error, interaction, commandName);
    }

    // [SALES] Attempt Smart Upsell (Post-Command)
    try {
        const upsellService = require('../../services/upsell');
        await upsellService.attemptUpsell(interaction);
    } catch (upsellError) {
        log.warn('Upsell failed silently', 'Interaction');
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

// ========== VERIFICATION HANDLER ==========
const OFFICIAL = require('../../utils/official');
const { EmbedBuilder } = require('discord.js');

async function handleVerification(interaction) {
    const { member, guild } = interaction;

    // Only works on official server
    if (guild.id !== OFFICIAL.GUILD_ID) {
        return interaction.reply({ content: 'Este sistema só funciona no servidor oficial.', ephemeral: true });
    }

    const verifiedRole = guild.roles.cache.get(OFFICIAL.ROLES.VERIFIED);
    const memberRole = guild.roles.cache.get(OFFICIAL.ROLES.MEMBER);

    if (!verifiedRole) {
        return interaction.reply({ content: '❌ Cargo de verificação não encontrado.', ephemeral: true });
    }

    // Check if already verified
    if (member.roles.cache.has(verifiedRole.id)) {
        return interaction.reply({ content: '✅ Você já está verificado!', ephemeral: true });
    }

    try {
        // Add Verified role
        await member.roles.add(verifiedRole);

        // Also add Member role if exists
        if (memberRole) {
            await member.roles.add(memberRole);
        }

        // Success embed
        const successEmbed = new EmbedBuilder()
            .setTitle('✅ Verificação Concluída!')
            .setDescription(
                `Bem-vindo(a) ao **GuildLens Official**, <@${member.id}>! 🎉\n\n` +
                `Agora você tem acesso a todos os canais.\n\n` +
                `🔹 Dúvidas? Vá em <#${OFFICIAL.CHANNELS.CRIAR_TICKET}>\n` +
                `🔹 Quer contratar? Veja os planos em <#${OFFICIAL.CHANNELS.PLANOS}>`
            )
            .setColor(0x22C55E)
            .setThumbnail(member.user.displayAvatarURL({ size: 128 }));

        await interaction.reply({ embeds: [successEmbed], ephemeral: true });

        // Log verification
        log.success(`${member.user.tag} verified`);

    } catch (error) {
        log.error('Verification failed', error);
        await interaction.reply({ content: '❌ Erro ao verificar. Contate a Staff.', ephemeral: true });
    }
}

module.exports = {
    handleInteractionCreate,
    getCommandsData,
};
