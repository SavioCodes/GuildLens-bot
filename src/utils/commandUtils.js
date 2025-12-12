// FILE: src/utils/commandUtils.js
// Standardized utilities for all bot commands - Enhanced & Robust

const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('./logger');

const log = logger.child('CommandUtils');

// Standard colors matching Discord's palette
const CMD_COLORS = {
    SUCCESS: 0x22C55E,  // Green
    ERROR: 0xEF4444,    // Red
    WARNING: 0xFB923C,  // Orange
    INFO: 0x5865F2,     // Discord Blurple
    PREMIUM: 0xA855F7,  // Purple
    LOADING: 0x9CA3AF,  // Gray
};

// Cooldowns map with automatic cleanup
const cooldowns = new Map();
const COOLDOWN_CLEANUP_INTERVAL = 60 * 1000; // 1 minute

// Cleanup expired cooldowns periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, expiry] of cooldowns.entries()) {
        if (now > expiry) cooldowns.delete(key);
    }
}, COOLDOWN_CLEANUP_INTERVAL);

/**
 * Standard success response embed
 * @param {string} title - Embed title
 * @param {string} description - Embed description
 * @returns {EmbedBuilder}
 */
function success(title, description) {
    return new EmbedBuilder()
        .setColor(CMD_COLORS.SUCCESS)
        .setTitle(`✅ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

/**
 * Standard error response embed
 * @param {string} title - Embed title
 * @param {string} description - Embed description
 * @returns {EmbedBuilder}
 */
function error(title, description) {
    return new EmbedBuilder()
        .setColor(CMD_COLORS.ERROR)
        .setTitle(`❌ ${title}`)
        .setDescription(description)
        .setFooter({ text: 'Se o problema persistir, abra um ticket.' });
}

/**
 * Standard warning response embed
 * @param {string} title - Embed title
 * @param {string} description - Embed description
 * @returns {EmbedBuilder}
 */
function warning(title, description) {
    return new EmbedBuilder()
        .setColor(CMD_COLORS.WARNING)
        .setTitle(`⚠️ ${title}`)
        .setDescription(description);
}

/**
 * Standard info response embed
 * @param {string} title - Embed title
 * @param {string} description - Embed description
 * @returns {EmbedBuilder}
 */
function info(title, description) {
    return new EmbedBuilder()
        .setColor(CMD_COLORS.INFO)
        .setTitle(title)
        .setDescription(description);
}

/**
 * Loading/processing embed
 * @param {string} message - Loading message
 * @returns {EmbedBuilder}
 */
function loading(message = 'Processando...') {
    return new EmbedBuilder()
        .setColor(CMD_COLORS.LOADING)
        .setDescription(`⏳ ${message}`);
}

/**
 * Check and apply cooldown with automatic cleanup
 * @param {string} userId - User ID
 * @param {string} commandName - Command name for tracking
 * @param {number} cooldownSeconds - Cooldown duration in seconds
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
 * @param {GuildMember} member - Guild member
 * @param {PermissionFlagsBits} permission - Required permission
 * @returns {boolean}
 */
function hasPermission(member, permission) {
    if (!member) return false;
    return member.permissions.has(permission);
}

/**
 * Check if user is server admin (Manage Guild permission)
 * @param {Interaction} interaction - Discord interaction
 * @returns {boolean}
 */
function isServerAdmin(interaction) {
    return hasPermission(interaction.member, PermissionFlagsBits.ManageGuild);
}

/**
 * Check if user is bot owner
 * @param {Interaction} interaction - Discord interaction
 * @returns {boolean}
 */
function isBotOwner(interaction) {
    const ownerIds = (process.env.OWNER_IDS || '').split(',').map(id => id.trim());
    return ownerIds.includes(interaction.user.id);
}

/**
 * Safe reply - handles already replied interactions gracefully
 * @param {Interaction} interaction - Discord interaction
 * @param {object} options - Reply options
 * @returns {Promise<Message|void>}
 */
async function safeReply(interaction, options) {
    try {
        if (interaction.replied || interaction.deferred) {
            return await interaction.editReply(options);
        }
        return await interaction.reply(options);
    } catch (err) {
        log.error('Failed to reply to interaction', err);
    }
}

/**
 * Safe defer - handles already deferred interactions
 * @param {Interaction} interaction - Discord interaction
 * @param {boolean} ephemeral - Whether response should be ephemeral
 * @returns {Promise<void>}
 */
async function safeDefer(interaction, ephemeral = false) {
    try {
        if (!interaction.replied && !interaction.deferred) {
            await interaction.deferReply({ flags: ephemeral ? 64 : 0 });
        }
    } catch (err) {
        log.error('Failed to defer interaction', err);
    }
}

/**
 * Standard command wrapper with comprehensive error handling
 * @param {Function} handler - Command handler function
 * @param {string} commandName - Command name for logging
 * @returns {Function} Wrapped handler
 */
function wrapCommand(handler, commandName) {
    return async (interaction) => {
        const startTime = Date.now();

        try {
            await handler(interaction);

            const duration = Date.now() - startTime;
            if (duration > 2000) {
                log.warn(`[${commandName}] Slow execution: ${duration}ms`);
            }
        } catch (err) {
            log.error(`[${commandName}] Command error:`, err);

            const errorEmbed = error(
                'Erro Inesperado',
                'Ocorreu um erro ao processar o comando.\nTente novamente em alguns instantes.'
            );

            await safeReply(interaction, { embeds: [errorEmbed], flags: 64 });
        }
    };
}

/**
 * Validate that a command is run in a guild (not DM)
 * @param {Interaction} interaction - Discord interaction
 * @returns {boolean} True if valid, false otherwise (also sends error reply)
 */
async function requireGuild(interaction) {
    if (!interaction.guild) {
        await safeReply(interaction, {
            embeds: [error('Comando Indisponível', 'Este comando só pode ser usado em servidores.')],
            flags: 64
        });
        return false;
    }
    return true;
}

/**
 * Validate that user has admin permissions
 * @param {Interaction} interaction - Discord interaction
 * @returns {boolean} True if admin, false otherwise (also sends error reply)
 */
async function requireAdmin(interaction) {
    if (!isServerAdmin(interaction)) {
        await safeReply(interaction, {
            embeds: [error('Sem Permissão', 'Você precisa ter permissão de **Gerenciar Servidor** para usar este comando.')],
            flags: 64
        });
        return false;
    }
    return true;
}

/**
 * Format a number with Brazilian locale
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
function formatNumber(num) {
    return num.toLocaleString('pt-BR');
}

/**
 * Format bytes to human readable
 * @param {number} bytes - Bytes to format
 * @returns {string} Formatted size
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Format duration in milliseconds to human readable
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration
 */
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

module.exports = {
    CMD_COLORS,
    success,
    error,
    warning,
    info,
    loading,
    checkCooldown,
    hasPermission,
    isServerAdmin,
    isBotOwner,
    safeReply,
    safeDefer,
    wrapCommand,
    requireGuild,
    requireAdmin,
    formatNumber,
    formatBytes,
    formatDuration,
};
