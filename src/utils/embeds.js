// FILE: src/utils/embeds.js
// Discord embed builders for consistent styling across GuildLens commands

const { EmbedBuilder } = require('discord.js');

/**
 * Brand colors for GuildLens embeds
 * Official GuildLens Color Palette
 */
const COLORS = {
    PRIMARY: 0x22D3EE,      // Cyan - main brand color
    SECONDARY: 0xA855F7,    // Purple - accents
    SUCCESS: 0x22C55E,      // Green - growth, OK
    WARNING: 0xFB923C,      // Orange - alerts, risk
    ERROR: 0xEF4444,        // Red - errors, critical
    DANGER: 0xEF4444,       // Red - same as error
    INFO: 0x22D3EE,         // Cyan - info
    NEUTRAL: 0x9CA3AF,      // Gray - neutral text
    GOLD: 0xFFD700,         // Gold - premium/pricing
    PREMIUM: 0xA855F7,      // Purple - premium features
    HEALTH_EXCELLENT: 0x22C55E,    // Green
    HEALTH_GOOD: 0x84CC16,         // Lime
    HEALTH_WARNING: 0xFB923C,      // Orange
    HEALTH_CRITICAL: 0xEF4444,     // Red
};

/**
 * Emoji constants for consistent iconography
 */
const EMOJI = {
    HEALTH: '🏥',
    CHART: '📊',
    ALERT: '⚠️',
    CHECK: '✅',
    CROSS: '❌',
    UP: '📈',
    DOWN: '📉',
    STABLE: '➡️',
    CHANNEL: '#️⃣',
    USER: '👤',
    USERS: '👥',
    TIME: '🕐',
    CALENDAR: '📅',
    FIRE: '🔥',
    ICE: '🧊',
    STAR: '⭐',
    LIGHTBULB: '💡',
    MEGAPHONE: '📣',
    SETTINGS: '⚙️',
    WARNING: '🚨',
    INFO: 'ℹ️',
    SPARKLE: '✨',
    TROPHY: '🏆',
    WAVE: '👋',
    QUESTION: '❓',
    ROCKET: '🚀',
};

/**
 * Creates a base embed with GuildLens branding
 * @param {string} title - Embed title
 * @param {string} description - Embed description
 * @param {number} [color] - Embed color (defaults to PRIMARY)
 * @returns {EmbedBuilder} Configured embed builder
 */
function createBaseEmbed(title, description, color = COLORS.PRIMARY) {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp()
        .setFooter({
            text: 'GuildLens • Community Strategy',
            iconURL: null,
        });
}

/**
 * Creates a health score embed with color-coded status
 * @param {Object} data - Health data object
 * @param {number} data.score - Health score (0-100)
 * @param {number} data.messagesLast7Days - Messages in last 7 days
 * @param {number} data.messagesLast30Days - Messages in last 30 days
 * @param {number} data.activeUsersLast7Days - Active users count
 * @param {number} data.avgMessagesPerDay - Average messages per day
 * @param {string} data.trend - Trend direction ('up', 'down', 'stable')
 * @param {number} data.trendPercentage - Trend percentage change
 * @param {string} data.interpretation - Human-readable interpretation
 * @returns {EmbedBuilder} Configured health embed
 */
function createHealthEmbed(data) {
    const color = getHealthColor(data.score);
    const trendEmoji = data.trend === 'up' ? EMOJI.UP : data.trend === 'down' ? EMOJI.DOWN : EMOJI.STABLE;

    const embed = new EmbedBuilder()
        .setTitle(`${EMOJI.HEALTH} Saúde do Servidor`)
        .setColor(color)
        .setDescription(data.interpretation)
        .addFields(
            {
                name: `${EMOJI.CHART} Health Score`,
                value: `**${data.score}**/100 ${getHealthLabel(data.score)}`,
                inline: true,
            },
            {
                name: `${trendEmoji} Tendência`,
                value: formatTrend(data.trend, data.trendPercentage),
                inline: true,
            },
            {
                name: '\u200B',
                value: '\u200B',
                inline: true,
            },
            {
                name: `${EMOJI.CALENDAR} Últimos 7 dias`,
                value: `${data.messagesLast7Days.toLocaleString('pt-BR')} mensagens`,
                inline: true,
            },
            {
                name: `${EMOJI.USERS} Usuários ativos`,
                value: `${data.activeUsersLast7Days.toLocaleString('pt-BR')} membros`,
                inline: true,
            },
            {
                name: `${EMOJI.TIME} Média/dia`,
                value: `${data.avgMessagesPerDay.toFixed(1)} msgs/dia`,
                inline: true,
            }
        )
        .setTimestamp()
        .setFooter({
            text: 'GuildLens • Health Report',
        });

    return embed;
}

/**
 * Creates an insights embed with activity data
 * @param {Object} data - Insights data object
 * @param {Array} data.topChannels - Top 3 active channels
 * @param {Array} data.peakHours - Top 3 peak time slots
 * @param {number} data.newAuthors - Number of new authors
 * @param {number} data.totalMessages - Total messages in period
 * @param {number} data.totalAuthors - Total unique authors
 * @returns {EmbedBuilder} Configured insights embed
 */
function createInsightsEmbed(data) {
    const topChannelsText = data.topChannels.length > 0
        ? data.topChannels.map((ch, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
            return `${medal} <#${ch.channelId}> — ${ch.count.toLocaleString('pt-BR')} msgs`;
        }).join('\n')
        : 'Sem dados suficientes';

    const peakHoursText = data.peakHours.length > 0
        ? data.peakHours.map((ph, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
            return `${medal} **${ph.label}** — ${ph.count.toLocaleString('pt-BR')} msgs`;
        }).join('\n')
        : 'Sem dados suficientes';

    const embed = new EmbedBuilder()
        .setTitle(`${EMOJI.CHART} Insights do Servidor`)
        .setColor(COLORS.INFO)
        .setDescription(`Análise dos últimos **7 dias** de atividade.`)
        .addFields(
            {
                name: `${EMOJI.FIRE} Canais Mais Ativos`,
                value: topChannelsText,
                inline: false,
            },
            {
                name: `${EMOJI.TIME} Horários de Pico`,
                value: peakHoursText,
                inline: false,
            },
            {
                name: `${EMOJI.WAVE} Novos Participantes`,
                value: `**${data.newAuthors}** membros escreveram pela primeira vez`,
                inline: true,
            },
            {
                name: `${EMOJI.USERS} Total de Autores`,
                value: `**${data.totalAuthors}** membros ativos`,
                inline: true,
            }
        )
        .setTimestamp()
        .setFooter({
            text: 'GuildLens • Insights Report',
        });

    return embed;
}

/**
 * Creates an alerts embed with warnings and issues
 * @param {Array} alerts - Array of alert objects
 * @param {string} alerts[].type - Alert type ('activity', 'channel', 'activation')
 * @param {string} alerts[].level - Alert level ('INFO', 'WARNING', 'CRITICAL')
 * @param {string} alerts[].title - Alert title
 * @param {string} alerts[].description - Alert description
 * @returns {EmbedBuilder} Configured alerts embed
 */
function createAlertsEmbed(alerts) {
    const hasAlerts = alerts && alerts.length > 0;

    const embed = new EmbedBuilder()
        .setTitle(`${EMOJI.ALERT} Alertas do Servidor`)
        .setColor(hasAlerts ? COLORS.WARNING : COLORS.SUCCESS)
        .setTimestamp()
        .setFooter({
            text: 'GuildLens • Alerts Report',
        });

    if (!hasAlerts) {
        embed.setDescription(`${EMOJI.CHECK} **Tudo certo!** Nenhum alerta no momento.\n\nSeu servidor está saudável e não foram detectados riscos importantes.`);
        return embed;
    }

    embed.setDescription(`Foram encontrados **${alerts.length} alerta(s)** que merecem atenção.`);

    // Group alerts by level
    const criticalAlerts = alerts.filter(a => a.level === 'CRITICAL');
    const warningAlerts = alerts.filter(a => a.level === 'WARNING');
    const infoAlerts = alerts.filter(a => a.level === 'INFO');

    if (criticalAlerts.length > 0) {
        const text = criticalAlerts.map(a => `${EMOJI.WARNING} **${a.title}**\n${a.description}`).join('\n\n');
        embed.addFields({
            name: '🔴 Críticos',
            value: text,
            inline: false,
        });
    }

    if (warningAlerts.length > 0) {
        const text = warningAlerts.map(a => `${EMOJI.ALERT} **${a.title}**\n${a.description}`).join('\n\n');
        embed.addFields({
            name: '🟡 Avisos',
            value: text,
            inline: false,
        });
    }

    if (infoAlerts.length > 0) {
        const text = infoAlerts.map(a => `${EMOJI.INFO} **${a.title}**\n${a.description}`).join('\n\n');
        embed.addFields({
            name: '🔵 Informativos',
            value: text,
            inline: false,
        });
    }

    return embed;
}

/**
 * Creates an actions embed with recommended actions
 * @param {Array} actions - Array of action recommendation objects
 * @param {string} actions[].title - Action title
 * @param {string} actions[].description - Action description
 * @param {string} actions[].example - Example message to copy
 * @param {string} [actions[].targetChannel] - Target channel mention
 * @returns {EmbedBuilder} Configured actions embed
 */
function createActionsEmbed(actions) {
    const hasActions = actions && actions.length > 0;

    const embed = new EmbedBuilder()
        .setTitle(`${EMOJI.LIGHTBULB} Ações Recomendadas`)
        .setColor(COLORS.PRIMARY)
        .setTimestamp()
        .setFooter({
            text: 'GuildLens • Action Recommendations',
        });

    if (!hasActions) {
        embed.setDescription(`${EMOJI.SPARKLE} **Excelente!** Seu servidor está indo bem.\n\nNenhuma ação urgente é necessária no momento. Continue monitorando com \`/guildlens-health\`.`);
        return embed;
    }

    embed.setDescription(`Baseado nos dados do seu servidor, aqui estão **${actions.length} sugestão(ões)** de ações para melhorar o engajamento.`);

    actions.forEach((action, index) => {
        const fieldTitle = `${index + 1}. ${action.title}${action.targetChannel ? ` → ${action.targetChannel}` : ''}`;
        const fieldValue = `${action.description}\n\n📋 **Mensagem sugerida:**\n\`\`\`${action.example}\`\`\``;

        embed.addFields({
            name: fieldTitle,
            value: fieldValue.substring(0, 1024), // Discord field limit
            inline: false,
        });
    });

    return embed;
}

/**
 * Creates a setup confirmation embed
 * @param {Object} settings - Settings that were configured
 * @param {Array} settings.monitoredChannels - Array of channel IDs
 * @param {string} settings.language - Language code
 * @param {string|null} settings.staffRoleId - Staff role ID if set
 * @returns {EmbedBuilder} Configured setup embed
 */
function createSetupEmbed(settings) {
    const channelsList = settings.monitoredChannels.length > 0
        ? settings.monitoredChannels.map(id => `<#${id}>`).join(', ')
        : 'Todos os canais de texto';

    const staffRole = settings.staffRoleId
        ? `<@&${settings.staffRoleId}>`
        : 'Não configurado';

    const embed = new EmbedBuilder()
        .setTitle(`${EMOJI.SETTINGS} Configuração do GuildLens`)
        .setColor(COLORS.SUCCESS)
        .setDescription(`${EMOJI.CHECK} **Configuração salva com sucesso!**\n\nO GuildLens agora está monitorando seu servidor.`)
        .addFields(
            {
                name: `${EMOJI.CHANNEL} Canais Monitorados`,
                value: channelsList,
                inline: false,
            },
            {
                name: '🌐 Idioma',
                value: settings.language === 'pt-BR' ? '🇧🇷 Português (Brasil)' : settings.language,
                inline: true,
            },
            {
                name: '👑 Cargo de Staff',
                value: staffRole,
                inline: true,
            }
        )
        .setTimestamp()
        .setFooter({
            text: 'GuildLens • Setup Complete',
        });

    return embed;
}

/**
 * Creates an error embed for displaying errors to users
 * @param {string} title - Error title
 * @param {string} description - Error description
 * @returns {EmbedBuilder} Configured error embed
 */
function createErrorEmbed(title, description) {
    return new EmbedBuilder()
        .setTitle(`${EMOJI.CROSS} ${title}`)
        .setDescription(description)
        .setColor(COLORS.DANGER)
        .setTimestamp()
        .setFooter({
            text: 'GuildLens • Error',
        });
}

/**
 * Gets the appropriate color for a health score
 * @param {number} score - Health score (0-100)
 * @returns {number} Discord color integer
 */
function getHealthColor(score) {
    if (score >= 80) return COLORS.HEALTH_EXCELLENT;
    if (score >= 60) return COLORS.HEALTH_GOOD;
    if (score >= 40) return COLORS.HEALTH_WARNING;
    return COLORS.HEALTH_CRITICAL;
}

/**
 * Gets a human-readable label for a health score
 * @param {number} score - Health score (0-100)
 * @returns {string} Label with emoji
 */
function getHealthLabel(score) {
    if (score >= 80) return '🟢 Excelente';
    if (score >= 60) return '🟢 Bom';
    if (score >= 40) return '🟡 Atenção';
    return '🔴 Crítico';
}

/**
 * Formats a trend for display
 * @param {string} trend - Trend direction
 * @param {number} percentage - Percentage change
 * @returns {string} Formatted trend string
 */
function formatTrend(trend, percentage) {
    const absPercentage = Math.abs(percentage).toFixed(1);
    if (trend === 'up') {
        return `+${absPercentage}% vs semana anterior`;
    } else if (trend === 'down') {
        return `-${absPercentage}% vs semana anterior`;
    }
    return 'Estável vs semana anterior';
}

/**
 * Creates a warning embed for displaying warnings to users
 * @param {string} title - Warning title
 * @param {string} description - Warning description
 * @returns {EmbedBuilder} Configured warning embed
 */
function createWarningEmbed(title, description) {
    return new EmbedBuilder()
        .setTitle(`${EMOJI.ALERT} ${title}`)
        .setDescription(description)
        .setColor(COLORS.WARNING)
        .setTimestamp()
        .setFooter({
            text: 'GuildLens • Aviso',
        });
}

module.exports = {
    COLORS,
    EMOJI,
    createBaseEmbed,
    createHealthEmbed,
    createInsightsEmbed,
    createAlertsEmbed,
    createActionsEmbed,
    createSetupEmbed,
    createErrorEmbed,
    createWarningEmbed,
    getHealthColor,
    getHealthLabel,
    formatTrend,
};
