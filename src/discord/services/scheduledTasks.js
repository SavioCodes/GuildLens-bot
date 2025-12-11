/**
 * Scheduled Tasks for Official Server
 * Daily stats, inactivity warnings, automated announcements
 */

const { EmbedBuilder } = require('discord.js');
const OFFICIAL = require('../../utils/official');
const logger = require('../../utils/logger');

const log = logger.child('ScheduledTasks');

// Store last activity for members
const memberActivity = new Map();

/**
 * Tracks member activity (call this from messageCreate)
 * @param {string} memberId 
 */
function trackActivity(memberId) {
    memberActivity.set(memberId, Date.now());
}

/**
 * Gets time since last activity
 * @param {string} memberId 
 * @returns {number} Days since last activity, or -1 if never seen
 */
function getDaysSinceActivity(memberId) {
    const lastSeen = memberActivity.get(memberId);
    if (!lastSeen) return -1;
    return Math.floor((Date.now() - lastSeen) / (1000 * 60 * 60 * 24));
}

/**
 * Posts daily stats summary to metrics channel
 * @param {Guild} guild 
 */
async function postDailyStats(guild) {
    if (guild.id !== OFFICIAL.GUILD_ID) return;

    const metricsChannel = guild.channels.cache.get(OFFICIAL.CHANNELS.METRICAS);
    if (!metricsChannel) return;

    const now = new Date();
    const dayOfWeek = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][now.getDay()];

    // Count members by role
    const totalMembers = guild.memberCount;
    const verifiedCount = guild.members.cache.filter(m => m.roles.cache.has(OFFICIAL.ROLES.VERIFIED)).size;
    const proCount = guild.members.cache.filter(m => m.roles.cache.has(OFFICIAL.ROLES.PRO)).size;
    const growthCount = guild.members.cache.filter(m => m.roles.cache.has(OFFICIAL.ROLES.GROWTH)).size;
    const boostCount = guild.premiumSubscriptionCount || 0;

    const embed = new EmbedBuilder()
        .setColor(0x22D3EE)
        .setTitle('📊 Relatório Diário')
        .setDescription(`**${dayOfWeek}, ${now.toLocaleDateString('pt-BR')}**`)
        .addFields(
            { name: '👥 Total de Membros', value: `\`${totalMembers}\``, inline: true },
            { name: '✅ Verificados', value: `\`${verifiedCount}\``, inline: true },
            { name: '🚀 Boosts', value: `\`${boostCount}\``, inline: true },
            { name: '⭐ Assinantes PRO', value: `\`${proCount}\``, inline: true },
            { name: '💎 Assinantes GROWTH', value: `\`${growthCount}\``, inline: true },
            { name: '📈 Taxa de Verificação', value: `\`${((verifiedCount / totalMembers) * 100).toFixed(1)}%\``, inline: true }
        )
        .setFooter({ text: 'Atualizado automaticamente às 00:00' })
        .setTimestamp();

    await metricsChannel.send({ embeds: [embed] });
    log.info('Posted daily stats report');
}

/**
 * Motivational messages for the community
 */
const DAILY_TIPS = [
    '💡 **Dica do dia:** Use `/guildlens-health` para ver a saúde da sua comunidade!',
    '🚀 **Dica do dia:** Membros inativos podem ser reengajados com mensagens personalizadas.',
    '📊 **Dica do dia:** Acompanhe as métricas semanais para identificar tendências.',
    '💎 **Dica do dia:** Com o plano PRO você tem insights de até 90 dias!',
    '🎯 **Dica do dia:** Comunidades ativas têm 3x mais retenção de membros.',
    '⭐ **Dica do dia:** Responda rapidamente às dúvidas para aumentar engajamento.',
    '🔥 **Dica do dia:** Crie eventos recorrentes para manter a comunidade ativa.',
];

/**
 * Posts a random daily tip to geral
 * @param {Guild} guild 
 */
async function postDailyTip(guild) {
    if (guild.id !== OFFICIAL.GUILD_ID) return;

    const geralChannel = guild.channels.cache.get(OFFICIAL.CHANNELS.GERAL);
    if (!geralChannel) return;

    const randomTip = DAILY_TIPS[Math.floor(Math.random() * DAILY_TIPS.length)];

    await geralChannel.send({ content: randomTip });
    log.debug('Posted daily tip');
}

/**
 * Starts scheduled tasks (call from ready event)
 * @param {Client} client 
 */
function startScheduledTasks(client) {
    log.info('⏰ Starting scheduled tasks...');

    const guild = client.guilds.cache.get(OFFICIAL.GUILD_ID);
    if (!guild) {
        log.warn('Official guild not found, skipping scheduled tasks');
        return;
    }

    // Daily stats at midnight (check every hour)
    setInterval(async () => {
        const now = new Date();
        if (now.getHours() === 0 && now.getMinutes() < 5) {
            try {
                await postDailyStats(guild);
            } catch (error) {
                log.error('Failed to post daily stats', error);
            }
        }
    }, 60 * 60 * 1000); // Check every hour

    // Daily tip at 10:00 AM (check every hour)
    setInterval(async () => {
        const now = new Date();
        if (now.getHours() === 10 && now.getMinutes() < 5) {
            try {
                await postDailyTip(guild);
            } catch (error) {
                log.error('Failed to post daily tip', error);
            }
        }
    }, 60 * 60 * 1000); // Check every hour

    log.success('⏰ Scheduled tasks started');
}

module.exports = {
    trackActivity,
    getDaysSinceActivity,
    postDailyStats,
    postDailyTip,
    startScheduledTasks,
    DAILY_TIPS
};
