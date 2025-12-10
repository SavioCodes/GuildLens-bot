// FILE: src/services/recommendations.js
// Rule-based recommendation engine for GuildLens - generates actionable suggestions

const logger = require('../utils/logger');
const analytics = require('./analytics');
const messagesRepo = require('../db/repositories/messages');
const { getDateRange } = require('../utils/time');

const log = logger.child('Recommendations');

/**
 * Action templates for different situations
 * Each template has a condition check and action generator
 */
const ACTION_TEMPLATES = [
    {
        id: 'general_activity_drop',
        priority: 1,
        check: (metrics) => metrics.trend === 'down' && metrics.trendPercentage >= 20,
        generate: (metrics) => ({
            title: '🎯 Enquete de Engajamento',
            description: `A atividade caiu ${metrics.trendPercentage.toFixed(0)}%. ` +
                'Uma enquete pode ajudar a entender o que a comunidade quer ver mais.',
            example: '📊 **O que vocês gostariam de ver mais no servidor?**\n\n' +
                '1️⃣ Eventos e competições\n' +
                '2️⃣ Discussões temáticas\n' +
                '3️⃣ Conteúdo exclusivo\n' +
                '4️⃣ Mais canais específicos\n\n' +
                'Reaja para votar! Sua opinião importa! 💬',
            targetChannel: '#geral',
        }),
    },
    {
        id: 'low_weekend_activity',
        priority: 2,
        check: (metrics) => {
            if (!metrics.peakHours || metrics.peakHours.length === 0) return false;
            // Check if weekend hours are significantly lower
            return metrics.score < 60;
        },
        generate: (metrics) => ({
            title: '🎮 Evento de Fim de Semana',
            description: 'Eventos programados para fins de semana podem aumentar a atividade regular.',
            example: '🎉 **EVENTO: Game Night de Sábado!**\n\n' +
                '📅 Este sábado às 20h\n' +
                '🎮 Vamos jogar juntos!\n\n' +
                'Quem tá dentro? Reaja com 🎮\n\n' +
                'Tragam seus amigos! Quanto mais, melhor! 🚀',
            targetChannel: '#eventos',
        }),
    },
    {
        id: 'quiet_channel',
        priority: 2,
        check: (metrics) => metrics.quietChannels && metrics.quietChannels.length > 0,
        generate: (metrics) => {
            const channel = metrics.quietChannels[0];
            return {
                title: `💬 Revitalizar Canal`,
                description: `O canal <#${channel.channelId}> está quieto. ` +
                    'Que tal iniciar uma discussão interessante?',
                example: '💭 **Pergunta do Dia:**\n\n' +
                    'Se você pudesse dominar qualquer habilidade instantaneamente, qual seria?\n\n' +
                    'Conta pra gente nos comentários! 👇',
                targetChannel: `<#${channel.channelId}>`,
            };
        },
    },
    {
        id: 'new_members_inactive',
        priority: 1,
        check: (metrics) => metrics.newAuthors !== undefined && metrics.newAuthors <= 2 && metrics.totalMessages > 30,
        generate: () => ({
            title: '👋 Boas-vindas aos Novatos',
            description: 'Poucos novos membros estão participando. ' +
                'Um canal de apresentações pode ajudar a quebrar o gelo.',
            example: '👋 **BEM-VINDOS AO SERVIDOR!**\n\n' +
                'Para quem acabou de chegar:\n\n' +
                '1️⃣ Leiam as regras em #regras\n' +
                '2️⃣ Se apresentem aqui! Contem:\n' +
                '   • Como descobriram o servidor\n' +
                '   • O que esperam encontrar aqui\n' +
                '   • Um fato curioso sobre vocês\n\n' +
                'A comunidade está pronta para receber vocês! 🤝',
            targetChannel: '#apresentacoes',
        }),
    },
    {
        id: 'peak_hour_event',
        priority: 3,
        check: (metrics) => metrics.peakHours && metrics.peakHours.length > 0,
        generate: (metrics) => {
            const topHour = metrics.peakHours[0];
            return {
                title: '⏰ Aproveitar Horário de Pico',
                description: `O horário mais ativo é **${topHour.label}**. ` +
                    'Agende anúncios e eventos para esse período.',
                example: '📣 **LEMBRETE:**\n\n' +
                    `Os horários mais ativos do servidor são das ${topHour.label}!\n\n` +
                    '✅ Postem conteúdo nesse horário para maior alcance\n' +
                    '✅ Agendem eventos e lives para esse período\n' +
                    '✅ Fiquem de olho para participar das conversas!\n\n' +
                    'Aproveitem! 🚀',
                targetChannel: '#anuncios',
            };
        },
    },
    {
        id: 'celebrate_top_channel',
        priority: 4,
        check: (metrics) => metrics.topChannels && metrics.topChannels.length > 0 && metrics.topChannels[0].count >= 50,
        generate: (metrics) => {
            const topChannel = metrics.topChannels[0];
            return {
                title: '🏆 Celebrar Canal Ativo',
                description: `<#${topChannel.channelId}> é o canal mais ativo com ${topChannel.count} mensagens! ` +
                    'Reconheça a comunidade.',
                example: '🏆 **DESTAQUE DA SEMANA:**\n\n' +
                    `O canal <#${topChannel.channelId}> foi o mais ativo esta semana!\n\n` +
                    `📊 ${topChannel.count} mensagens\n\n` +
                    'Parabéns a todos que participaram! Vocês fazem esse servidor acontecer! 💪\n\n' +
                    'Continue a conversa e vamos bater o recorde na próxima semana! 🎯',
                targetChannel: '#anuncios',
            };
        },
    },
    {
        id: 'encourage_sharing',
        priority: 4,
        check: (metrics) => metrics.activeUsersLast7Days !== undefined && metrics.activeUsersLast7Days < 10,
        generate: () => ({
            title: '📢 Incentivar Compartilhamento',
            description: 'Com poucos membros ativos, incentivar o compartilhamento pode trazer novos participantes.',
            example: '🌟 **AJUDE O SERVIDOR A CRESCER!**\n\n' +
                'Conhece alguém que curtiria estar aqui?\n\n' +
                '📤 Compartilhe o link do servidor:\n' +
                '`[LINK_DO_SERVIDOR]`\n\n' +
                'Quanto mais gente, mais diversão! 🎉\n' +
                'Obrigado por fazer parte da nossa comunidade! 💜',
            targetChannel: '#geral',
        }),
    },
    {
        id: 'weekly_recap',
        priority: 5,
        check: (metrics) => metrics.totalMessages !== undefined && metrics.totalMessages > 20,
        generate: (metrics) => ({
            title: '📰 Resumo Semanal',
            description: 'Um resumo semanal mantém todos informados e engajados.',
            example: '📰 **RESUMO DA SEMANA:**\n\n' +
                `💬 **${metrics.totalMessages || 0}** mensagens\n` +
                `👥 **${metrics.totalAuthors || 0}** membros ativos\n` +
                `📈 Tendência: ${metrics.trend === 'up' ? 'Subindo! 🚀' : metrics.trend === 'down' ? 'Precisamos de vocês! 📣' : 'Estável ➡️'}\n\n` +
                '**Destaques:**\n' +
                '• [Adicione eventos importantes]\n' +
                '• [Mencione conquistas da comunidade]\n' +
                '• [Agradeça participações especiais]\n\n' +
                'Obrigado a todos! Vamos fazer a próxima semana ainda melhor! 💪',
            targetChannel: '#anuncios',
        }),
    },
];

/**
 * Generates action recommendations based on guild metrics
 * 
 * @param {string} guildId - Discord guild ID
 * @returns {Promise<Array>} Array of recommended actions
 */
async function generateRecommendations(guildId) {
    log.debug(`Generating recommendations for guild ${guildId}`);

    try {
        // Gather all necessary metrics
        const [healthData, insightsData, alerts] = await Promise.all([
            analytics.calculateHealthScore(guildId),
            analytics.getInsights(guildId, 7),
            analytics.generateAlerts(guildId),
        ]);

        // Identify quiet channels (channels that dropped significantly)
        const quietChannels = await identifyQuietChannels(guildId);

        // Combine all metrics into one object for rule evaluation
        const metrics = {
            ...healthData,
            ...insightsData,
            alerts,
            quietChannels,
        };

        // Evaluate all templates and collect matching actions
        const matchingActions = [];

        for (const template of ACTION_TEMPLATES) {
            try {
                if (template.check(metrics)) {
                    const action = template.generate(metrics);
                    matchingActions.push({
                        ...action,
                        id: template.id,
                        priority: template.priority,
                    });
                }
            } catch (error) {
                log.warn(`Template ${template.id} failed evaluation`, 'Recommendations');
            }
        }

        // Sort by priority and limit to top 5
        matchingActions.sort((a, b) => a.priority - b.priority);
        const recommendations = matchingActions.slice(0, 5);

        log.debug(`Generated ${recommendations.length} recommendations for guild ${guildId}`);
        return recommendations;

    } catch (error) {
        log.error(`Failed to generate recommendations for ${guildId}`, 'Recommendations', error);
        throw error;
    }
}

/**
 * Identifies channels that have gone quiet (significant drop in activity)
 * 
 * @param {string} guildId - Discord guild ID
 * @returns {Promise<Array>} Array of quiet channel objects
 */
async function identifyQuietChannels(guildId) {
    try {
        const { current, previous } = await getComparisonData(guildId);

        // Build map of previous activity
        const prevMap = new Map(previous.map(c => [c.channelId, c.count]));

        const quietChannels = [];

        for (const [channelId, prevCount] of prevMap) {
            const currChannel = current.find(c => c.channelId === channelId);
            const currCount = currChannel?.count || 0;

            // Channel had decent activity before but is now quiet
            if (prevCount >= 10 && currCount < prevCount * 0.3) {
                quietChannels.push({
                    channelId,
                    previousCount: prevCount,
                    currentCount: currCount,
                    dropPercentage: ((prevCount - currCount) / prevCount) * 100,
                });
            }
        }

        return quietChannels.sort((a, b) => b.dropPercentage - a.dropPercentage);

    } catch (error) {
        log.warn('Failed to identify quiet channels', 'Recommendations', error);
        return [];
    }
}

/**
 * Gets channel activity comparison data
 * 
 * @param {string} guildId - Discord guild ID
 * @returns {Promise<{current: Array, previous: Array}>}
 */
async function getComparisonData(guildId) {
    const { getComparisonPeriods } = require('../utils/time');
    const periods = getComparisonPeriods(7);

    const [current, previous] = await Promise.all([
        messagesRepo.getChannelActivity(
            guildId,
            periods.current.start,
            periods.current.end
        ),
        messagesRepo.getChannelActivity(
            guildId,
            periods.previous.start,
            periods.previous.end
        ),
    ]);

    return { current, previous };
}

/**
 * Gets a single quick recommendation for a specific situation
 * Useful for contextual suggestions
 * 
 * @param {string} situation - Situation identifier ('low_activity', 'welcome', etc.)
 * @returns {Object|null} Quick recommendation or null
 */
function getQuickRecommendation(situation) {
    const quickRecommendations = {
        low_activity: {
            title: 'Iniciar uma Discussão',
            description: 'Faça uma pergunta interessante para estimular a conversa.',
            example: '💬 Se você pudesse ter um superpoder, qual seria e por quê?',
        },
        welcome: {
            title: 'Dar Boas-vindas',
            description: 'Cumprimente novos membros pessoalmente.',
            example: 'Bem-vindo(a) ao servidor! 👋 Se precisar de ajuda, é só perguntar!',
        },
        celebrate: {
            title: 'Celebrar Conquista',
            description: 'Reconheça marcos e conquistas da comunidade.',
            example: '🎉 Parabéns a todos! Alcançamos [X] membros! Obrigado por fazerem parte!',
        },
    };

    return quickRecommendations[situation] || null;
}

module.exports = {
    generateRecommendations,
    identifyQuietChannels,
    getQuickRecommendation,
};
