// FILE: scripts/deployCommands.js
// Script to register slash commands with Discord API

const { REST, Routes } = require('discord.js');
require('dotenv').config();

// Validate environment variables
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || token.startsWith('your_')) {
    console.error('❌ Error: DISCORD_TOKEN is not set in .env file');
    process.exit(1);
}

if (!clientId || clientId.startsWith('your_')) {
    console.error('❌ Error: DISCORD_CLIENT_ID is not set in .env file');
    process.exit(1);
}

// Import command data
const setupCommand = require('../src/discord/commands/setup');
const healthCommand = require('../src/discord/commands/health');
const insightsCommand = require('../src/discord/commands/insights');
const alertsCommand = require('../src/discord/commands/alerts');
const actionsCommand = require('../src/discord/commands/actions');
const aboutCommand = require('../src/discord/commands/about');
const premiumCommand = require('../src/discord/commands/premium');
const adminCommand = require('../src/discord/commands/admin');
const communityCommand = require('../src/discord/commands/community');
const helpCommand = require('../src/discord/commands/help');
const exportCommand = require('../src/discord/commands/export');

// Collect all command data
const commands = [
    setupCommand.data.toJSON(),
    healthCommand.data.toJSON(),
    insightsCommand.data.toJSON(),
    alertsCommand.data.toJSON(),
    actionsCommand.data.toJSON(),
    aboutCommand.data.toJSON(),
    premiumCommand.data.toJSON(),
    adminCommand.data.toJSON(),
    communityCommand.data.toJSON(),
    helpCommand.data.toJSON(),
    exportCommand.data.toJSON(),
];

// Create REST client
const rest = new REST({ version: '10' }).setToken(token);

// Deploy commands
async function deployCommands() {
    console.log('🚀 Starting command deployment...');
    console.log(`📋 Deploying ${commands.length} commands`);

    try {
        let data;

        if (guildId && !guildId.startsWith('your_')) {
            // Deploy to specific guild (faster, for development)
            console.log(`🏠 Deploying to guild: ${guildId}`);

            // Clear global commands to avoid duplicates in development
            console.log('🧹 Clearing global commands to prevent duplicates...');
            await rest.put(Routes.applicationCommands(clientId), { body: [] });

            data = await rest.put(
                Routes.applicationGuildCommands(clientId, guildId),
                { body: commands }
            );

            console.log(`✅ Successfully deployed ${data.length} commands to guild`);
        } else {
            // Deploy globally (takes up to 1 hour to propagate)
            console.log('🌍 Deploying globally (this may take up to 1 hour to propagate)');

            data = await rest.put(
                Routes.applicationCommands(clientId),
                { body: commands }
            );

            console.log(`✅ Successfully deployed ${data.length} commands globally`);
        }

        // List deployed commands
        console.log('\n📜 Deployed commands:');
        commands.forEach(cmd => {
            console.log(`   /${cmd.name} - ${cmd.description}`);
        });

        console.log('\n🎉 Command deployment complete!');

    } catch (error) {
        console.error('❌ Error deploying commands:', error);
        process.exit(1);
    }
}

// Run deployment
deployCommands();
