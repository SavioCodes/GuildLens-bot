// FILE: src/utils/logger.js
// Enhanced logger with performance timing and observability features

/**
 * Log levels for filtering output
 */
const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
};

/**
 * Current minimum log level (configured via environment)
 */
const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO;
const isProduction = process.env.NODE_ENV === 'production';

/**
 * ANSI color codes for terminal output
 */
const COLORS = {
    RESET: '\x1b[0m',
    BRIGHT: '\x1b[1m',
    DIM: '\x1b[2m',
    RED: '\x1b[31m',
    GREEN: '\x1b[32m',
    YELLOW: '\x1b[33m',
    BLUE: '\x1b[34m',
    MAGENTA: '\x1b[35m',
    CYAN: '\x1b[36m',
    WHITE: '\x1b[37m',
    GRAY: '\x1b[90m',
};

// Performance timers map
const timers = new Map();

// Log counters for observability
const logCounts = {
    debug: 0,
    info: 0,
    warn: 0,
    error: 0,
    total: 0,
};

/**
 * Formats the current timestamp for log output
 * @returns {string} Formatted timestamp [YYYY-MM-DD HH:MM:SS]
 */
function getTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Formats a log message with timestamp, level, and optional context
 * @param {string} level - Log level name
 * @param {string} color - ANSI color code
 * @param {string} message - Main message
 * @param {string} [context] - Optional context (e.g., module name)
 * @param {Object} [data] - Optional data to log
 */
function formatAndLog(level, color, message, context, data) {
    const timestamp = `${COLORS.GRAY}[${getTimestamp()}]${COLORS.RESET}`;
    const levelTag = `${color}[${level}]${COLORS.RESET}`;
    const contextTag = context ? `${COLORS.CYAN}[${context}]${COLORS.RESET} ` : '';

    let output = `${timestamp} ${levelTag} ${contextTag}${message}`;

    if (level === 'ERROR') {
        console.error(output);
    } else if (level === 'WARN') {
        console.warn(output);
    } else {
        console.log(output);
    }

    // Log additional data if provided
    if (data !== undefined) {
        if (data instanceof Error) {
            console.error(`${COLORS.DIM}   Stack: ${data.stack}${COLORS.RESET}`);
        } else if (typeof data === 'object') {
            // In production, keep data logging minimal
            if (!isProduction) {
                console.log(`${COLORS.DIM}   Data: ${JSON.stringify(data, null, 2)}${COLORS.RESET}`);
            }
        } else {
            console.log(`${COLORS.DIM}   ${data}${COLORS.RESET}`);
        }
    }
}

// Error callbacks for external integrations
const errorCallbacks = [];

/**
 * Logger object with methods for each log level
 */
const logger = {
    /**
     * Registers a callback for error logs
     * @param {Function} callback - Function(message, context, error)
     */
    onError(callback) {
        errorCallbacks.push(callback);
    },

    /**
     * Debug level logging - for detailed development info
     * @param {string} message - Message to log
     * @param {string} [context] - Optional context/module name
     * @param {*} [data] - Optional data to include
     */
    debug(message, context, data) {
        if (currentLevel <= LOG_LEVELS.DEBUG) {
            logCounts.debug++;
            logCounts.total++;
            formatAndLog('DEBUG', COLORS.GRAY, message, context, data);
        }
    },

    /**
     * Info level logging - for general operational info
     * @param {string} message - Message to log
     * @param {string} [context] - Optional context/module name
     * @param {*} [data] - Optional data to include
     */
    info(message, context, data) {
        if (currentLevel <= LOG_LEVELS.INFO) {
            logCounts.info++;
            logCounts.total++;
            formatAndLog('INFO', COLORS.GREEN, message, context, data);
        }
    },

    /**
     * Warning level logging - for potential issues
     * @param {string} message - Message to log
     * @param {string} [context] - Optional context/module name
     * @param {*} [data] - Optional data to include
     */
    warn(message, context, data) {
        if (currentLevel <= LOG_LEVELS.WARN) {
            logCounts.warn++;
            logCounts.total++;
            formatAndLog('WARN', COLORS.YELLOW, message, context, data);
        }
    },

    /**
     * Error level logging - for errors and exceptions
     * @param {string} message - Message to log
     * @param {string} [context] - Optional context/module name
     * @param {*} [data] - Optional data to include (usually an Error object)
     */
    error(message, context, data) {
        if (currentLevel <= LOG_LEVELS.ERROR) {
            logCounts.error++;
            logCounts.total++;
            formatAndLog('ERROR', COLORS.RED, message, context, data);

            // Trigger callbacks safely
            errorCallbacks.forEach(cb => {
                try {
                    cb(message, context, data);
                } catch (err) {
                    console.error('Failed to execute error callback:', err);
                }
            });
        }
    },

    /**
     * Success logging - for important successful operations
     * @param {string} message - Message to log
     * @param {string} [context] - Optional context/module name
     */
    success(message, context) {
        if (currentLevel <= LOG_LEVELS.INFO) {
            logCounts.info++;
            logCounts.total++;
            formatAndLog('OK', COLORS.BRIGHT + COLORS.GREEN, message, context);
        }
    },

    /**
     * Starts a performance timer
     * @param {string} label - Timer label
     */
    time(label) {
        timers.set(label, Date.now());
    },

    /**
     * Ends a performance timer and logs duration
     * @param {string} label - Timer label
     * @param {string} [context] - Optional context for the log
     * @returns {number} Duration in milliseconds
     */
    timeEnd(label, context) {
        const start = timers.get(label);
        if (!start) {
            this.warn(`Timer '${label}' does not exist`, context || 'Logger');
            return 0;
        }

        const duration = Date.now() - start;
        timers.delete(label);

        // Log slow operations (> 1000ms) as warnings
        if (duration > 1000) {
            this.warn(`⚠️ Slow operation: ${label} took ${duration}ms`, context || 'Performance');
        } else if (currentLevel <= LOG_LEVELS.DEBUG) {
            this.debug(`${label} completed in ${duration}ms`, context || 'Performance');
        }

        return duration;
    },

    /**
     * Gets log counts for observability
     * @returns {Object} Log counts by level
     */
    getLogCounts() {
        return { ...logCounts };
    },

    /**
     * Resets log counters
     */
    resetLogCounts() {
        logCounts.debug = 0;
        logCounts.info = 0;
        logCounts.warn = 0;
        logCounts.error = 0;
        logCounts.total = 0;
    },

    /**
     * Creates a child logger with a fixed context
     * @param {string} context - Context name for all logs from this logger
     * @returns {Object} Logger object with the context pre-set
     */
    child(context) {
        return {
            debug: (message, data) => logger.debug(message, context, data),
            info: (message, data) => logger.info(message, context, data),
            warn: (message, data) => logger.warn(message, context, data),
            error: (message, data) => logger.error(message, context, data),
            success: (message) => logger.success(message, context),
            time: (label) => logger.time(`${context}:${label}`),
            timeEnd: (label) => logger.timeEnd(`${context}:${label}`, context),
            onError: (callback) => logger.onError(callback),
        };
    },
};

module.exports = logger;
