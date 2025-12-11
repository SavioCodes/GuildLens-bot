// FILE: src/utils/commandUtils.js
// Standardized utilities for all bot commands

const { EmbedBuilder } = require('discord.js');

// Standard colors
const CMD_COLORS = {
    SUCCESS: 0x22C55E,
    ERROR: 0xEF4444,
    WARNING: 0xFB923C,
    INFO: 0x5865F2,
    PREMIUM: 0xA855F7
};

// Cooldowns map
const cooldowns = new Map();

/**
 * Standard success response
 */
function success(title, description) {
    return new EmbedBuilder()
        .setColor(CMD_COLORS.SUCCESS)
        .setTitle(`✅ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

/**
 * Standard error response
 */
function error(title, description) {
    return new EmbedBuilder()
        .setColor(CMD_COLORS.ERROR)
        .setTitle(`❌ ${title}`)
        .setDescription(description);
}

/**
 * Standard warning response
 */
function warning(title, description) {
    return new EmbedBuilder()
        .setColor(CMD_COLORS.WARNING)
        .setTitle(`⚠️ ${title}`)
        .setDescription(description);
}

/**
 * Standard info response
 */
function info(title, description) {
    return new EmbedBuilder()
        .setColor(CMD_COLORS.INFO)
        .setTitle(title)
        .setDescription(description);
}

/**
 * Check and apply cooldown
 * @returns {number|null} Remaining seconds or null if not on cooldown
 */
function checkCooldown(userId, commandName, cooldownSeconds = 5) {
    const key = `${userId}-${commandName}`;
    const now = Date.now();
    const cooldownEnd = cooldowns.get(key);

    if (cooldownEnd && now < cooldownEnd) {
        return Math.ceil((cooldownEnd - now) / 1000);
    }

    cooldowns.set(key, now + (cooldownSeconds * 1000));
    return null;
}

/**
 * Check if user has required permission
 */
function hasPermission(member, permission) {
    if (!member) return false;
    return member.permissions.has(permission);
}

/**
 * Safe reply - handles already replied interactions
 */
async function safeReply(interaction, options) {
    try {
        if (interaction.replied || interaction.deferred) {
            return await interaction.editReply(options);
        }
        return await interaction.reply(options);
    } catch (err) {
        console.error('Failed to reply:', err.message);
    }
}

/**
 * Safe defer - handles already deferred
 */
async function safeDefer(interaction, ephemeral = false) {
    try {
        if (!interaction.replied && !interaction.deferred) {
            await interaction.deferReply({ flags: ephemeral ? 64 : 0 });
        }
    } catch (err) {
        console.error('Failed to defer:', err.message);
    }
}

/**
 * Standard command wrapper with error handling
 */
function wrapCommand(handler, commandName) {
    return async (interaction) => {
        try {
            await handler(interaction);
        } catch (err) {
            console.error(`[${commandName}] Error:`, err);
            const embed = error('Erro', 'Ocorreu um erro. Tente novamente.');
            await safeReply(interaction, { embeds: [embed], flags: 64 });
        }
    };
}

module.exports = {
    CMD_COLORS,
    success,
    error,
    warning,
    info,
    checkCooldown,
    hasPermission,
    safeReply,
    safeDefer,
    wrapCommand
};
