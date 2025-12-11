// FILE: src/discord/client.js
// Discord.js client creation and configuration for GuildLens

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const logger = require('../utils/logger');

const log = logger.child('Client');

/**
 * Creates and configures the Discord client with required intents
 * 
 * Required Intents:
 * - Guilds: For guild events (join/leave/update)
 * - GuildMembers: For member join/leave events (CRITICAL for welcome)
 * - GuildMessages: For message events in servers
 * - MessageContent: For reading message content (length calculation)
 * 
 * @returns {Client} Configured Discord.js client instance
 */
function createClient() {
    log.info('Creating Discord client...');

    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers,      // REQUIRED for member join/leave events
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
        ],
        partials: [
            Partials.Channel,
            Partials.Message,
            Partials.GuildMember,  // For partial member data
        ],
        // Disable caching for messages to save memory
        // We store our own data in the database
        sweepers: {
            messages: {
                interval: 300, // 5 minutes
                lifetime: 600,  // 10 minutes
            },
        },
    });

    // Set up error handlers
    client.on('error', (error) => {
        log.error('Discord client error', error);
    });

    client.on('warn', (message) => {
        log.warn(message, 'Client');
    });

    // Debug logging (only in development)
    if (process.env.NODE_ENV === 'development') {
        client.on('debug', (message) => {
            log.debug(message, 'Client');
        });
    }

    // Handle rate limits
    client.rest.on('rateLimited', (info) => {
        log.warn(`Rate limited: ${info.method} ${info.route} - Retry after ${info.retryAfter}ms`, 'REST');
    });

    log.success('Discord client created');
    return client;
}

/**
 * Logs in the client to Discord
 * @param {Client} client - Discord client instance
 * @param {string} token - Bot token
 * @returns {Promise<string>} Bot tag once logged in
 */
async function loginClient(client, token) {
    log.info('Logging in to Discord...');

    try {
        await client.login(token);
        log.success(`Logged in as ${client.user.tag}`);
        return client.user.tag;
    } catch (error) {
        log.error('Failed to login to Discord', error);
        throw error;
    }
}

/**
 * Gracefully destroys the client connection
 * @param {Client} client - Discord client instance
 */
function destroyClient(client) {
    log.info('Destroying Discord client...');
    client.destroy();
    log.info('Discord client destroyed');
}

module.exports = {
    createClient,
    loginClient,
    destroyClient,
};
