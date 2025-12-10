// FILE: index.js
// Main entry point for GuildLens Discord bot
// Run with: node index.js

const config = require('./config');
const logger = require('./src/utils/logger');
const { createClient, loginClient, destroyClient } = require('./src/discord/client');
const { initPool, closePool, testConnection } = require('./src/db/pgClient');

// Event handlers
const { handleReady } = require('./src/discord/handlers/ready');
const { handleMessageCreate } = require('./src/discord/handlers/messageCreate');
const { handleInteractionCreate } = require('./src/discord/handlers/interactionCreate');
const { handleGuildCreate, handleGuildDelete, handleGuildUpdate } = require('./src/discord/handlers/guildCreate');

const log = logger.child('Main');

/**
 * Main application entry point
 */
async function main() {
    log.info('='.repeat(50));
    log.info('  GuildLens - Community Strategy Bot');
    log.info('  Version 1.0.0');
    log.info('='.repeat(50));
    log.info('Starting up...');

    try {
        // Step 1: Initialize PostgreSQL connection pool
        log.info('Initializing database connection...');
        initPool();

        // Test connection before proceeding
        const dbConnected = await testConnection();
        if (!dbConnected) {
            log.error('Cannot connect to database. Please check SUPABASE_DB_URL.');
            log.error('Make sure your Supabase project is running and the connection string is correct.');
            process.exit(1);
        }

        // Step 2: Create Discord client
        log.info('Creating Discord client...');
        const client = createClient();

        // Step 3: Register event handlers
        registerEventHandlers(client);

        // Step 4: Start Health Check Server
        const { startServer } = require('./src/api/server');
        startServer(process.env.PORT || 3000);

        // Step 5: Handle graceful shutdown
        setupGracefulShutdown(client);

        // Step 5: Login to Discord
        await loginClient(client, config.discord.token);

    } catch (error) {
        log.error('Failed to start GuildLens', 'Main', error);
        process.exit(1);
    }
}

/**
 * Registers all event handlers with the Discord client
 * @param {Client} client - Discord client instance
 */
function registerEventHandlers(client) {
    log.info('Registering event handlers...');

    // Ready event - bot is connected and ready
    client.once('ready', () => handleReady(client));

    // Message events - for activity tracking
    client.on('messageCreate', handleMessageCreate);

    // Interaction events - for slash commands
    client.on('interactionCreate', handleInteractionCreate);

    // Guild events - for database sync
    client.on('guildCreate', handleGuildCreate);
    client.on('guildDelete', handleGuildDelete);
    client.on('guildUpdate', handleGuildUpdate);

    log.success('Event handlers registered');
}

/**
 * Sets up graceful shutdown handlers
 * @param {Client} client - Discord client instance
 */
function setupGracefulShutdown(client) {
    const shutdown = async (signal) => {
        log.info(`\nReceived ${signal}. Shutting down gracefully...`);

        try {
            // Destroy Discord client
            destroyClient(client);

            // Close database pool
            await closePool();

            log.info('Shutdown complete. Goodbye!');
            process.exit(0);
        } catch (error) {
            log.error('Error during shutdown', 'Main', error);
            process.exit(1);
        }
    };

    // Handle various shutdown signals
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
        log.error('Unhandled Promise Rejection', 'Main', reason);
        // Don't exit - try to continue running
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
        log.error('Uncaught Exception - shutting down', 'Main', error);
        process.exit(1);
    });
}

// Run the application
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
