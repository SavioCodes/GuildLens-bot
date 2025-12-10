// FILE: config.js
// Centralized configuration loader for GuildLens
// Validates and exports all required environment variables

require('dotenv').config();

/**
 * Validates that a required environment variable exists and is not a placeholder.
 * Throws an error with a helpful message if missing or invalid.
 * @param {string} name - Name of the environment variable
 * @param {string} description - Human-readable description for error message
 * @returns {string} The value of the environment variable
 */
function requireEnv(name, description) {
    const value = process.env[name];
    if (!value || value.trim() === '') {
        console.error(`\n❌ FATAL ERROR: Missing required environment variable: ${name}`);
        console.error(`   Description: ${description}`);
        console.error(`   Please check your .env file and ensure this variable is set correctly.\n`);
        process.exit(1);
    }
    if (value.startsWith('your_') || value.includes('your_password')) {
        console.error(`\n❌ FATAL ERROR: Environment variable ${name} contains placeholder value.`);
        console.error(`   Current value appears to be a template placeholder.`);
        console.error(`   Please replace it with your actual value in .env file.\n`);
        process.exit(1);
    }
    return value.trim();
}

/**
 * Gets an optional environment variable with a default value.
 * @param {string} name - Name of the environment variable
 * @param {string} defaultValue - Default value if not set
 * @returns {string} The value or default
 */
function optionalEnv(name, defaultValue) {
    const value = process.env[name];
    if (!value || value.trim() === '' || value.startsWith('your_')) {
        return defaultValue;
    }
    return value.trim();
}

/**
 * Gets an optional integer environment variable with a default value.
 * @param {string} name - Name of the environment variable
 * @param {number} defaultValue - Default value if not set or invalid
 * @returns {number} The parsed integer or default
 */
function optionalIntEnv(name, defaultValue) {
    const value = process.env[name];
    if (!value || value.trim() === '') {
        return defaultValue;
    }
    const parsed = parseInt(value.trim(), 10);
    if (isNaN(parsed)) {
        console.warn(`⚠️ Warning: ${name} is not a valid integer. Using default: ${defaultValue}`);
        return defaultValue;
    }
    return parsed;
}

/**
 * Validates log level and returns normalized value
 * @param {string} level - Log level from env
 * @returns {string} Validated log level
 */
function validateLogLevel(level) {
    const validLevels = ['debug', 'info', 'warn', 'error'];
    const normalized = level.toLowerCase();
    if (!validLevels.includes(normalized)) {
        console.warn(`⚠️ Warning: Invalid LOG_LEVEL "${level}". Using "info" as default.`);
        return 'info';
    }
    return normalized;
}

// ===========================================
// Configuration Object
// ===========================================

const config = {
    // Discord Configuration
    discord: {
        token: requireEnv('DISCORD_TOKEN', 'Discord bot token from Developer Portal'),
        clientId: requireEnv('DISCORD_CLIENT_ID', 'Discord application/client ID'),
        guildId: optionalEnv('DISCORD_GUILD_ID', ''),
    },

    // Database Configuration (Postgres via Supabase)
    database: {
        connectionString: requireEnv('SUPABASE_DB_URL', 'PostgreSQL connection string from Supabase'),
        // Pool configuration
        pool: {
            max: optionalIntEnv('DB_POOL_MAX', 10),
            idleTimeoutMillis: optionalIntEnv('DB_IDLE_TIMEOUT', 30000),
            connectionTimeoutMillis: optionalIntEnv('DB_CONNECT_TIMEOUT', 10000),
        },
    },

    // Logging Configuration
    logging: {
        level: validateLogLevel(optionalEnv('LOG_LEVEL', 'info')),
    },

    // Bot Behavior Configuration
    bot: {
        // Interval in milliseconds for stats aggregation (default: 60 minutes)
        statsAggregationIntervalMs: optionalIntEnv('STATS_AGGREGATION_INTERVAL_MINUTES', 60) * 60 * 1000,
        // Default language for new guilds
        defaultLanguage: optionalEnv('DEFAULT_LANGUAGE', 'pt-BR'),
    },

    // Health Score Thresholds
    healthScore: {
        // Score thresholds for color coding
        excellent: 80,   // Green: >= 80
        good: 60,        // Yellow: 60-79
        warning: 40,     // Orange: 40-59
        critical: 0,     // Red: < 40
    },

    // Alert Thresholds
    alerts: {
        // Percentage drop to trigger activity warning
        activityDropThreshold: 30,
        // Minimum messages in previous period to consider a channel "active"
        minActiveChannelMessages: 10,
        // Days to consider a member "new"
        newMemberDays: 14,
    },

    // Analysis Time Periods (in days)
    periods: {
        short: 7,    // Short-term analysis (1 week)
        medium: 30,  // Medium-term analysis (1 month)
        long: 90,    // Long-term analysis (3 months)
    },
};

// Freeze the config object to prevent accidental modification
Object.freeze(config);
Object.freeze(config.discord);
Object.freeze(config.database);
Object.freeze(config.database.pool);
Object.freeze(config.logging);
Object.freeze(config.bot);
Object.freeze(config.healthScore);
Object.freeze(config.alerts);
Object.freeze(config.periods);

module.exports = config;
