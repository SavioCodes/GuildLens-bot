/**
 * Centralized Error Handler
 * Standardizes error logging and user responses across the bot.
 * Enhanced with error categorization and recovery suggestions.
 */

const logger = require('./logger');

const log = logger.child('ErrorHandler');

// Error categories for better handling
const ERROR_CATEGORIES = {
    PERMISSION: 'permission',
    RATE_LIMIT: 'rate_limit',
    DATABASE: 'database',
    DISCORD_API: 'discord_api',
    VALIDATION: 'validation',
    UNKNOWN: 'unknown'
};

// User-friendly messages by category
const USER_MESSAGES = {
    [ERROR_CATEGORIES.PERMISSION]: '🔒 **Sem permissão.**\nO bot não tem as permissões necessárias para executar esta ação.',
    [ERROR_CATEGORIES.RATE_LIMIT]: '⏳ **Muitas requisições.**\nAguarde alguns segundos e tente novamente.',
    [ERROR_CATEGORIES.DATABASE]: '💾 **Erro de dados.**\nNão foi possível acessar o banco de dados. Tente novamente.',
    [ERROR_CATEGORIES.DISCORD_API]: '🌐 **Erro de conexão.**\nProblema ao comunicar com o Discord. Tente novamente.',
    [ERROR_CATEGORIES.VALIDATION]: '📝 **Entrada inválida.**\nVerifique os dados informados e tente novamente.',
    [ERROR_CATEGORIES.UNKNOWN]: '❌ **Erro inesperado.**\nNossa equipe foi notificada. Tente novamente em alguns instantes.'
};

/**
 * Categorizes an error for appropriate handling
 * @param {Error} error 
 * @returns {string} Error category
 */
function categorizeError(error) {
    const message = error.message?.toLowerCase() || '';
    const code = error.code;

    // Discord.js specific errors
    if (code === 50001 || message.includes('missing access')) {
        return ERROR_CATEGORIES.PERMISSION;
    }
    if (code === 50013 || message.includes('missing permissions')) {
        return ERROR_CATEGORIES.PERMISSION;
    }
    if (code === 429 || message.includes('rate limit')) {
        return ERROR_CATEGORIES.RATE_LIMIT;
    }
    if (message.includes('unknown interaction')) {
        return ERROR_CATEGORIES.DISCORD_API;
    }

    // Database errors
    if (message.includes('econnrefused') || message.includes('connection')) {
        return ERROR_CATEGORIES.DATABASE;
    }
    if (message.includes('relation') || message.includes('does not exist')) {
        return ERROR_CATEGORIES.DATABASE;
    }

    // Validation errors
    if (message.includes('invalid') || message.includes('validation')) {
        return ERROR_CATEGORIES.VALIDATION;
    }

    return ERROR_CATEGORIES.UNKNOWN;
}

const ErrorHandler = {
    /**
     * Handles errors during interaction processing (Commands, Buttons, Modals)
     * @param {Error} error 
     * @param {Interaction} interaction 
     * @param {string} context - 'Command: name' or 'Button: id'
     */
    handleInteraction: async (error, interaction, context = 'Unknown Context') => {
        const category = categorizeError(error);

        // Log with full context
        log.error(`[${context}] Category: ${category}`, error);

        // Get user-friendly message
        const userMessage = USER_MESSAGES[category];

        const failureMessage = {
            content: userMessage,
            ephemeral: true
        };

        try {
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply(failureMessage).catch(() => { });
            } else {
                await interaction.reply(failureMessage).catch(() => { });
            }
        } catch (e) {
            log.error(`Failed to send error response in [${context}]`, e);
        }
    },

    /**
     * Handles errors in background events or scheduled tasks
     * @param {Error} error 
     * @param {string} context 
     */
    handleEvent: (error, context) => {
        const category = categorizeError(error);
        log.error(`Event Error [${context}] Category: ${category}`, error);
    },

    /**
     * Handles critical errors that should trigger alerts
     * @param {Error} error
     * @param {string} context
     */
    handleCritical: (error, context) => {
        log.error(`🚨 CRITICAL ERROR [${context}]`, error);
        // In production, this could send to monitoring service
        console.error('\n🚨 CRITICAL ERROR:', context);
        console.error(error);
        console.error('Stack:', error.stack);
    }
};

/**
 * Creates a safe wrapper for event handlers that catches and logs errors
 * @param {Function} handler - The async handler function
 * @param {string} name - Handler name for logging
 * @returns {Function} Wrapped handler
 */
function createSafeHandler(handler, name) {
    return async (...args) => {
        try {
            await handler(...args);
        } catch (error) {
            ErrorHandler.handleEvent(error, name);
        }
    };
}

/**
 * Creates a safe wrapper with timeout protection
 * @param {Function} handler - The async handler function
 * @param {string} name - Handler name for logging
 * @param {number} timeoutMs - Maximum execution time
 * @returns {Function} Wrapped handler with timeout
 */
function createSafeHandlerWithTimeout(handler, name, timeoutMs = 30000) {
    return async (...args) => {
        try {
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error(`Handler ${name} timed out after ${timeoutMs}ms`)), timeoutMs);
            });

            await Promise.race([handler(...args), timeoutPromise]);
        } catch (error) {
            ErrorHandler.handleEvent(error, name);
        }
    };
}

module.exports = {
    ...ErrorHandler,
    createSafeHandler,
    createSafeHandlerWithTimeout,
    handleCommandError: ErrorHandler.handleInteraction,
    ERROR_CATEGORIES,
    categorizeError
};
