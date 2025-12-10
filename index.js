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
    log.info('  🛡️  GuildLens - System Startup');
    log.info('  👤  Owner: Sávio Brito');
    log.info('  🚀  Environment: ' + (process.env.NODE_ENV || 'development'));
    log.info('='.repeat(50));

    // Check critical environment variables
    const requiredEnv = ['DISCORD_TOKEN', 'DATABASE_URL', 'OWNER_IDS'];
    const missingEnv = requiredEnv.filter(key => !process.env[key]);

    if (missingEnv.length > 0) {
        log.error(`Missing required environment variables: ${missingEnv.join(', ')}`);
        log.error('Please update your .env file.');
        process.exit(1);
    }

    try {
        // Step 1: Initialize PostgreSQL connection pool
        log.info('🔌 Connecting to database...');
        initPool();

        // Test connection before proceeding
        const dbConnected = await testConnection();
        if (!dbConnected) {
            log.error('❌ Database connection failed. Check your connection string.');
            process.exit(1);
        }
        log.success('✅ Database connected successfully.');

        // Step 2: Create Discord client
        log.info('🤖 Initializing Discord client...');
        const client = createClient();

        // Step 3: Register event handlers
        registerEventHandlers(client);

        // Step 4: Start Health Check Server
        const port = process.env.PORT || 3000;
        const { startServer } = require('./src/api/server');
        startServer(port);
        log.info(`🌍 Health check API running on port ${port}`);

        // Step 5: Handle graceful shutdown
        setupGracefulShutdown(client);

        // Step 6: Login to Discord
        log.info('🔑 Logging in...');
        await loginClient(client, config.discord.token);
        log.success('🚀 GuildLens is ONLINE and ready!');

    } catch (error) {
        log.error('❌ Fatal startup error', 'Main', error);
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

    // Official Server Events
    const { handleOfficialMemberAdd } = require('./src/discord/handlers/officialServer');
    client.on('guildMemberAdd', handleOfficialMemberAdd);

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
    process.on('unhandledRejection', (reason, _promise) => {
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
