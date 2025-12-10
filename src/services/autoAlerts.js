// FILE: src/services/autoAlerts.js
// Automatic alerts service for Growth plan users
// Sends alerts to a configured channel automatically

const logger = require('../utils/logger');
const analytics = require('./analytics');
const subscriptionsRepo = require('../db/repositories/subscriptions');
const settingsRepo = require('../db/repositories/settings');
const { EmbedBuilder } = require('discord.js');
const { COLORS, EMOJI } = require('../utils/embeds');

const log = logger.child('AutoAlerts');

/**
 * Check interval in milliseconds (6 hours)
 */
const CHECK_INTERVAL = 6 * 60 * 60 * 1000;

/**
 * Stores the interval ID for cleanup
 */
let intervalId = null;

/**
 * Discord client reference
 */
let discordClient = null;

/**
 * Starts the auto-alerts service
 * @param {Client} client - Discord client
 */
function start(client) {
    discordClient = client;

    log.info('Starting auto-alerts service (every 6 hours)');

    // Run immediately on start (after 1 minute delay)
    setTimeout(() => {
        runAutoAlerts();
    }, 60 * 1000);

    // Then run periodically
    intervalId = setInterval(() => {
        runAutoAlerts();
    }, CHECK_INTERVAL);
}

/**
 * Stops the auto-alerts service
 */
function stop() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        log.info('Auto-alerts service stopped');
    }
}

/**
 * Runs auto-alerts for all Growth plan guilds
 */
async function runAutoAlerts() {
    if (!discordClient) {
        log.warn('Discord client not available for auto-alerts');
        return;
    }

    log.info('Running auto-alerts check...');

    try {
        // Get all guilds the bot is in
        const guilds = discordClient.guilds.cache;

        let sent = 0;
        let skipped = 0;

        for (const [guildId, guild] of guilds) {
            try {
                // Check if guild has Growth plan
                const plan = await subscriptionsRepo.getPlan(guildId);

                if (plan !== 'growth') {
                    skipped++;
                    continue;
                }

                // Check if guild has alerts channel configured
                const settings = await settingsRepo.getSettings(guildId);
                const alertsChannelId = settings?.alerts_channel_id;

                if (!alertsChannelId) {
                    skipped++;
                    continue;
                }

                // Get the channel
                const channel = guild.channels.cache.get(alertsChannelId);

                if (!channel || !channel.isTextBased()) {
                    log.warn(`Alerts channel not found or not text-based for ${guild.name}`);
                    continue;
                }

                // Generate alerts
                const alerts = await analytics.generateAlerts(guildId);

                if (!alerts || alerts.length === 0) {
                    // No alerts, skip
                    continue;
                }

                // Send alerts embed
                const embed = createAutoAlertEmbed(alerts, guild.name);
                await channel.send({ embeds: [embed] });

                sent++;
                log.success(`Auto-alerts sent to ${guild.name}: ${alerts.length} alert(s)`);

            } catch (error) {
                log.error(`Failed to process auto-alerts for guild ${guildId}`, 'AutoAlerts', error);
            }
        }

        log.info(`Auto-alerts complete: ${sent} sent, ${skipped} skipped`);

    } catch (error) {
        log.error('Auto-alerts check failed', 'AutoAlerts', error);
    }
}

/**
 * Creates an embed for auto-alerts
 * @param {Array} alerts - Array of alert objects
 * @param {string} guildName - Guild name
 * @returns {EmbedBuilder} Configured embed
 */
function createAutoAlertEmbed(alerts, guildName) {
    const embed = new EmbedBuilder()
        .setTitle(`${EMOJI.WARNING} Alertas Automáticos`)
        .setColor(COLORS.WARNING)
        .setDescription(`Foram detectados **${alerts.length} alerta(s)** no servidor **${guildName}**.`)
        .setTimestamp()
        .setFooter({
            text: 'GuildLens • Auto-Alerts (Growth)',
        });

    // Group alerts by level
    const criticalAlerts = alerts.filter(a => a.level === 'CRITICAL');
    const warningAlerts = alerts.filter(a => a.level === 'WARNING');
    const infoAlerts = alerts.filter(a => a.level === 'INFO');

    if (criticalAlerts.length > 0) {
        const text = criticalAlerts.map(a => `${EMOJI.WARNING} **${a.title}**\n${a.description}`).join('\n\n');
        embed.addFields({
            name: '🔴 Críticos',
            value: text.substring(0, 1024),
            inline: false,
        });
    }

    if (warningAlerts.length > 0) {
        const text = warningAlerts.map(a => `${EMOJI.ALERT} **${a.title}**\n${a.description}`).join('\n\n');
        embed.addFields({
            name: '🟡 Avisos',
            value: text.substring(0, 1024),
            inline: false,
        });
    }

    if (infoAlerts.length > 0) {
        const text = infoAlerts.map(a => `${EMOJI.INFO} **${a.title}**\n${a.description}`).join('\n\n');
        embed.addFields({
            name: '🔵 Informativos',
            value: text.substring(0, 1024),
            inline: false,
        });
    }

    embed.addFields({
        name: '💡 Próximos Passos',
        value: 'Use `/guildlens-actions` para ver recomendações de como agir.',
        inline: false,
    });

    return embed;
}

/**
 * Manually trigger alerts for a specific guild
 * @param {string} guildId - Guild ID
 * @param {string} channelId - Channel to send to
 * @returns {Promise<boolean>} True if sent
 */
async function sendAlertsToChannel(guildId, channelId) {
    if (!discordClient) {
        return false;
    }

    try {
        const guild = discordClient.guilds.cache.get(guildId);
        if (!guild) return false;

        const channel = guild.channels.cache.get(channelId);
        if (!channel || !channel.isTextBased()) return false;

        const alerts = await analytics.generateAlerts(guildId);
        if (!alerts || alerts.length === 0) return false;

        const embed = createAutoAlertEmbed(alerts, guild.name);
        await channel.send({ embeds: [embed] });

        return true;
    } catch (error) {
        log.error(`Failed to send alerts to channel ${channelId}`, 'AutoAlerts', error);
        return false;
    }
}

module.exports = {
    start,
    stop,
    runAutoAlerts,
    sendAlertsToChannel,
};
