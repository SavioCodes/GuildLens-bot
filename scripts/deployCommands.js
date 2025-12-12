// FILE: scripts/deployCommands.js
// Script to register slash commands with Discord API
// Run with: npm run deploy-commands

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

// Import ALL command files
const setupCommand = require('../src/discord/commands/setup');
const healthCommand = require('../src/discord/commands/health');
const insightsCommand = require('../src/discord/commands/insights');
const statsCommand = require('../src/discord/commands/stats');
const leaderboardCommand = require('../src/discord/commands/leaderboard');
const alertsCommand = require('../src/discord/commands/alerts');
const actionsCommand = require('../src/discord/commands/actions');
const aboutCommand = require('../src/discord/commands/about');
const premiumCommand = require('../src/discord/commands/premium');
const adminCommand = require('../src/discord/commands/admin');
const communityCommand = require('../src/discord/commands/community');
const helpCommand = require('../src/discord/commands/help');
const exportCommand = require('../src/discord/commands/export');
const userInfoCommand = require('../src/discord/commands/context/userInfo');

// Collect all command data
const commands = [
    setupCommand.data.toJSON(),
    healthCommand.data.toJSON(),
    insightsCommand.data.toJSON(),
    statsCommand.data.toJSON(),
    leaderboardCommand.data.toJSON(),
    alertsCommand.data.toJSON(),
    actionsCommand.data.toJSON(),
    aboutCommand.data.toJSON(),
    premiumCommand.data.toJSON(),
    adminCommand.data.toJSON(),
    communityCommand.data.toJSON(),
    helpCommand.data.toJSON(),
    exportCommand.data.toJSON(),
    userInfoCommand.data.toJSON(),
];

// Create REST client
const rest = new REST({ version: '10' }).setToken(token);

// Deploy commands
async function deployCommands() {
    console.log('🚀 Starting command deployment...');
    console.log(`📋 Found ${commands.length} commands to deploy\n`);

    try {
        // STEP 1: Clear ALL global commands first
        console.log('🧹 Step 1: Clearing ALL global commands...');
        await rest.put(Routes.applicationCommands(clientId), { body: [] });
        console.log('   ✅ Global commands cleared\n');

        // STEP 2: Clear guild commands if guild ID is set
        if (guildId && !guildId.startsWith('your_')) {
            console.log(`🧹 Step 2: Clearing guild commands (${guildId})...`);
            await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
            console.log('   ✅ Guild commands cleared\n');
        }

        // STEP 3: Wait a moment for Discord to process deletions
        console.log('⏳ Waiting 2 seconds for Discord to process...');
        await new Promise(r => setTimeout(r, 2000));

        // STEP 4: Deploy commands to the appropriate scope
        let data;
        if (guildId && !guildId.startsWith('your_')) {
            // Development mode: deploy to specific guild (instant update)
            console.log(`🏠 Step 3: Deploying to GUILD (instant update)...`);
            data = await rest.put(
                Routes.applicationGuildCommands(clientId, guildId),
                { body: commands }
            );
            console.log(`   ✅ Deployed ${data.length} commands to guild\n`);
        } else {
            // Production mode: deploy globally (up to 1 hour to propagate)
            console.log('🌍 Step 3: Deploying GLOBALLY (may take up to 1 hour)...');
            data = await rest.put(
                Routes.applicationCommands(clientId),
                { body: commands }
            );
            console.log(`   ✅ Deployed ${data.length} commands globally\n`);
        }

        // List deployed commands
        console.log('📜 Deployed commands:');
        commands.forEach(cmd => {
            console.log(`   /${cmd.name}`);
        });

        console.log('\n🎉 Command deployment complete!');
        console.log('💡 If you still see duplicates, restart Discord (Ctrl+R) or wait a few minutes.');

    } catch (error) {
        console.error('❌ Error deploying commands:', error);
        process.exit(1);
    }
}

// Run deployment
deployCommands();
