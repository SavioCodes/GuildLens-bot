// FILE: src/utils/errorHandler.js
// Robust error handling system for GuildLens
// Provides centralized error management, logging, and user-friendly messages

const logger = require('./logger');

const log = logger.child('ErrorHandler');

/**
 * Error codes for categorizing errors
 */
const ErrorCodes = {
    // Database errors (1xxx)
    DB_CONNECTION_FAILED: 'ERR_1001',
    DB_QUERY_FAILED: 'ERR_1002',
    DB_TRANSACTION_FAILED: 'ERR_1003',
    DB_NO_DATA: 'ERR_1004',
    DB_TIMEOUT: 'ERR_1005',

    // Discord API errors (2xxx)
    DISCORD_API_ERROR: 'ERR_2001',
    DISCORD_PERMISSION_DENIED: 'ERR_2002',
    DISCORD_RATE_LIMITED: 'ERR_2003',
    DISCORD_INVALID_TOKEN: 'ERR_2004',
    DISCORD_INTERACTION_FAILED: 'ERR_2005',

    // Validation errors (3xxx)
    VALIDATION_FAILED: 'ERR_3001',
    MISSING_REQUIRED_FIELD: 'ERR_3002',
    INVALID_FORMAT: 'ERR_3003',
    INVALID_GUILD_ID: 'ERR_3004',
    INVALID_CHANNEL_ID: 'ERR_3005',

    // Analytics errors (4xxx)
    ANALYTICS_CALCULATION_FAILED: 'ERR_4001',
    INSUFFICIENT_DATA: 'ERR_4002',
    RECOMMENDATIONS_FAILED: 'ERR_4003',
    STATS_AGGREGATION_FAILED: 'ERR_4004',

    // Configuration errors (5xxx)
    CONFIG_MISSING: 'ERR_5001',
    CONFIG_INVALID: 'ERR_5002',
    ENV_VAR_MISSING: 'ERR_5003',

    // General errors (9xxx)
    UNKNOWN_ERROR: 'ERR_9001',
    INTERNAL_ERROR: 'ERR_9002',
    NOT_IMPLEMENTED: 'ERR_9003',
};

/**
 * User-friendly error messages in Portuguese
 */
const ErrorMessages = {
    [ErrorCodes.DB_CONNECTION_FAILED]: 'Não foi possível conectar ao banco de dados. Tente novamente mais tarde.',
    [ErrorCodes.DB_QUERY_FAILED]: 'Erro ao consultar o banco de dados. Tente novamente.',
    [ErrorCodes.DB_TRANSACTION_FAILED]: 'Erro ao processar transação. Tente novamente.',
    [ErrorCodes.DB_NO_DATA]: 'Nenhum dado encontrado.',
    [ErrorCodes.DB_TIMEOUT]: 'A consulta demorou muito. Tente novamente.',

    [ErrorCodes.DISCORD_API_ERROR]: 'Erro na comunicação com o Discord. Tente novamente.',
    [ErrorCodes.DISCORD_PERMISSION_DENIED]: 'O bot não tem permissão para realizar esta ação.',
    [ErrorCodes.DISCORD_RATE_LIMITED]: 'Muitas requisições. Aguarde alguns segundos.',
    [ErrorCodes.DISCORD_INVALID_TOKEN]: 'Token do bot inválido. Verifique a configuração.',
    [ErrorCodes.DISCORD_INTERACTION_FAILED]: 'Erro ao processar o comando. Tente novamente.',

    [ErrorCodes.VALIDATION_FAILED]: 'Dados inválidos fornecidos.',
    [ErrorCodes.MISSING_REQUIRED_FIELD]: 'Campo obrigatório não fornecido.',
    [ErrorCodes.INVALID_FORMAT]: 'Formato inválido.',
    [ErrorCodes.INVALID_GUILD_ID]: 'ID do servidor inválido.',
    [ErrorCodes.INVALID_CHANNEL_ID]: 'ID do canal inválido.',

    [ErrorCodes.ANALYTICS_CALCULATION_FAILED]: 'Erro ao calcular métricas. Tente novamente.',
    [ErrorCodes.INSUFFICIENT_DATA]: 'Dados insuficientes para gerar análise. O bot precisa coletar mais dados de atividade.',
    [ErrorCodes.RECOMMENDATIONS_FAILED]: 'Erro ao gerar recomendações.',
    [ErrorCodes.STATS_AGGREGATION_FAILED]: 'Erro ao agregar estatísticas.',

    [ErrorCodes.CONFIG_MISSING]: 'Configuração ausente.',
    [ErrorCodes.CONFIG_INVALID]: 'Configuração inválida.',
    [ErrorCodes.ENV_VAR_MISSING]: 'Variável de ambiente não configurada.',

    [ErrorCodes.UNKNOWN_ERROR]: 'Erro desconhecido. Por favor, tente novamente.',
    [ErrorCodes.INTERNAL_ERROR]: 'Erro interno do sistema.',
    [ErrorCodes.NOT_IMPLEMENTED]: 'Funcionalidade não implementada.',
};

/**
 * Custom application error class
 */
class AppError extends Error {
    /**
     * Creates a new AppError
     * @param {string} code - Error code from ErrorCodes
     * @param {string} [message] - Custom message (optional, defaults to predefined)
     * @param {Object} [context] - Additional context data
     * @param {Error} [originalError] - Original error if wrapping
     */
    constructor(code, message = null, context = {}, originalError = null) {
        const userMessage = message || ErrorMessages[code] || ErrorMessages[ErrorCodes.UNKNOWN_ERROR];
        super(userMessage);

        this.name = 'AppError';
        this.code = code;
        this.userMessage = userMessage;
        this.context = context;
        this.originalError = originalError;
        this.timestamp = new Date().toISOString();
        this.id = generateErrorId();

        // Capture stack trace
        Error.captureStackTrace(this, this.constructor);
    }

    /**
     * Converts error to JSON for logging
     */
    toJSON() {
        return {
            id: this.id,
            code: this.code,
            message: this.message,
            context: this.context,
            timestamp: this.timestamp,
            stack: this.stack,
            originalError: this.originalError?.message,
        };
    }

    /**
     * Gets user-friendly message for display
     */
    getUserMessage() {
        return this.userMessage;
    }
}

/**
 * Generates a unique error ID for tracking
 * @returns {string} Unique error ID
 */
function generateErrorId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `E-${timestamp}-${random}`.toUpperCase();
}

/**
 * Wraps an error with AppError for consistent handling
 * @param {Error} error - Original error
 * @param {string} [code] - Error code (defaults based on error type)
 * @param {Object} [context] - Additional context
 * @returns {AppError} Wrapped error
 */
function wrapError(error, code = null, context = {}) {
    // Already an AppError
    if (error instanceof AppError) {
        return error;
    }

    // Detect error type and assign appropriate code
    let errorCode = code || ErrorCodes.UNKNOWN_ERROR;

    if (!code) {
        // Database errors
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            errorCode = ErrorCodes.DB_CONNECTION_FAILED;
        } else if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
            errorCode = ErrorCodes.DB_TIMEOUT;
        } else if (error.message?.includes('SELF_SIGNED_CERT')) {
            errorCode = ErrorCodes.DB_CONNECTION_FAILED;
        }
        // Discord errors
        else if (error.code >= 10000 && error.code < 20000) {
            errorCode = ErrorCodes.DISCORD_API_ERROR;
        } else if (error.code === 50001 || error.code === 50013) {
            errorCode = ErrorCodes.DISCORD_PERMISSION_DENIED;
        } else if (error.code === 429) {
            errorCode = ErrorCodes.DISCORD_RATE_LIMITED;
        }
    }

    return new AppError(errorCode, null, context, error);
}

/**
 * Handles errors in command execution
 * @param {Error} error - Error to handle
 * @param {Object} interaction - Discord interaction
 * @param {string} commandName - Name of the command
 */
async function handleCommandError(error, interaction, commandName) {
    const appError = wrapError(error, null, { commandName, guildId: interaction.guildId });

    // Log the full error
    log.error(`Command error [${appError.id}]: ${commandName}`);
    log.error(`Code: ${appError.code}`);
    log.error(`Message: ${appError.message}`);
    if (appError.originalError?.stack) {
        log.debug(`Original stack: ${appError.originalError.stack}`);
    }

    // Send user-friendly response
    const userMessage = `❌ **Erro** (${appError.id})\n\n${appError.getUserMessage()}`;

    try {
        if (interaction.deferred) {
            await interaction.editReply({
                content: userMessage,
                embeds: [],
            });
        } else if (interaction.replied) {
            await interaction.followUp({
                content: userMessage,
                flags: 64, // Ephemeral
            });
        } else {
            await interaction.reply({
                content: userMessage,
                flags: 64, // Ephemeral
            });
        }
    } catch (_replyError) {
        log.error(`Failed to send error response for ${appError.id}`);
    }

    return appError;
}

/**
 * Handles database errors specifically
 * @param {Error} error - Database error
 * @param {string} operation - Operation that failed
 * @param {Object} [context] - Additional context
 */
function handleDatabaseError(error, operation, context = {}) {
    const appError = wrapError(error, ErrorCodes.DB_QUERY_FAILED, {
        operation,
        ...context,
    });

    log.error(`Database error [${appError.id}]: ${operation}`);
    log.error(`Details: ${error.message}`);

    return appError;
}

/**
 * Safely executes an async function with error handling
 * @param {Function} fn - Async function to execute
 * @param {string} [errorCode] - Error code to use on failure
 * @param {Object} [context] - Additional context
 * @returns {Promise<[Error|null, any]>} Tuple of [error, result]
 */
async function safeExecute(fn, errorCode = null, context = {}) {
    try {
        const result = await fn();
        return [null, result];
    } catch (error) {
        const appError = wrapError(error, errorCode, context);
        log.error(`Safe execute failed [${appError.id}]: ${appError.message}`);
        return [appError, null];
    }
}

/**
 * Checks if error indicates insufficient data
 * @param {Error} error - Error to check
 * @returns {boolean} True if insufficient data error
 */
function isInsufficientDataError(error) {
    if (error instanceof AppError) {
        return error.code === ErrorCodes.INSUFFICIENT_DATA;
    }
    return false;
}

/**
 * Creates an insufficient data error
 * @param {string} [message] - Custom message
 * @param {Object} [context] - Additional context
 * @returns {AppError} Insufficient data error
 */
function insufficientDataError(message = null, context = {}) {
    return new AppError(
        ErrorCodes.INSUFFICIENT_DATA,
        message || 'O bot ainda não coletou dados suficientes. Aguarde algumas horas de atividade.',
        context
    );
}

/**
 * Error statistics tracking
 */
const errorStats = {
    counts: {},
    lastErrors: [],

    record(error) {
        const code = error instanceof AppError ? error.code : 'UNKNOWN';
        this.counts[code] = (this.counts[code] || 0) + 1;

        this.lastErrors.unshift({
            id: error.id || generateErrorId(),
            code,
            message: error.message,
            timestamp: new Date().toISOString(),
        });

        // Keep only last 100 errors
        if (this.lastErrors.length > 100) {
            this.lastErrors.pop();
        }
    },

    getStats() {
        return {
            totalErrors: Object.values(this.counts).reduce((a, b) => a + b, 0),
            byCode: { ...this.counts },
            recentErrors: this.lastErrors.slice(0, 10),
        };
    },

    reset() {
        this.counts = {};
        this.lastErrors = [];
    },
};

module.exports = {
    ErrorCodes,
    ErrorMessages,
    AppError,
    wrapError,
    handleCommandError,
    handleDatabaseError,
    safeExecute,
    isInsufficientDataError,
    insufficientDataError,
    generateErrorId,
    errorStats,
};
