// FILE: src/utils/embeds.js
// Discord embed builders for consistent styling across GuildLens commands

const { EmbedBuilder } = require('discord.js');
const { COLORS, EMOJI, HEALTH_THRESHOLDS } = require('../config/constants');

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
 */
function createHealthEmbed(data) {
    const color = getHealthColor(data.score);
    const trendEmoji = data.trend === 'up' ? EMOJI.TREND_UP : data.trend === 'down' ? EMOJI.TREND_DOWN : EMOJI.STABLE;

    // Create visual progress bar
    const progressBar = createProgressBar(data.score, 10);
    const scoreLabel = getHealthLabel(data.score);

    const embed = new EmbedBuilder()
        .setColor(color)
        .setAuthor({ name: 'Health Report', iconURL: null })
        .setTitle(`${scoreLabel}`)
        .setDescription(
            `**Score: ${data.score}/100**\n` +
            `${progressBar}\n\n` +
            `${data.interpretation}`
        )
        .addFields(
            {
                name: 'Atividade (7 dias)',
                value: `${data.messagesLast7Days.toLocaleString('pt-BR')} mensagens`,
                inline: true,
            },
            {
                name: 'Usuários Ativos',
                value: `${data.activeUsersLast7Days.toLocaleString('pt-BR')}`,
                inline: true,
            },
            {
                name: `Tendência ${trendEmoji}`,
                value: formatTrend(data.trend, data.trendPercentage),
                inline: true,
            }
        )
        .setFooter({ text: 'GuildLens' })
        .setTimestamp();

    return embed;
}

/**
 * Creates a visual progress bar
 */
function createProgressBar(value, length = 10) {
    const filled = Math.round((value / 100) * length);
    const empty = length - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Creates an insights embed with activity data
 */
function createInsightsEmbed(data) {
    const topChannelsText = data.topChannels.length > 0
        ? data.topChannels.map((ch, i) => {
            const medal = i === 0 ? EMOJI.RANK_1 : i === 1 ? EMOJI.RANK_2 : EMOJI.RANK_3;
            return `${medal} <#${ch.channelId}> — ${ch.count.toLocaleString('pt-BR')} msgs`;
        }).join('\n')
        : 'Sem dados suficientes';

    const peakHoursText = data.peakHours.length > 0
        ? data.peakHours.map((ph, i) => {
            const medal = i === 0 ? EMOJI.RANK_1 : i === 1 ? EMOJI.RANK_2 : EMOJI.RANK_3;
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
                name: `${EMOJI.CLOCK} Horários de Pico`,
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
 */
function createActionsEmbed(actions) {
    const hasActions = actions && actions.length > 0;

    const embed = new EmbedBuilder()
        .setTitle(`${EMOJI.BULB} Ações Recomendadas`)
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
 */
function getHealthColor(score) {
    if (score >= HEALTH_THRESHOLDS.EXCELLENT) return COLORS.HEALTH_EXCELLENT;
    if (score >= HEALTH_THRESHOLDS.GOOD) return COLORS.HEALTH_GOOD;
    if (score >= HEALTH_THRESHOLDS.WARNING) return COLORS.HEALTH_WARNING;
    return COLORS.HEALTH_CRITICAL;
}

/**
 * Gets a human-readable label for a health score
 */
function getHealthLabel(score) {
    if (score >= HEALTH_THRESHOLDS.EXCELLENT) return '🟢 Excelente';
    if (score >= HEALTH_THRESHOLDS.GOOD) return '🟢 Bom';
    if (score >= HEALTH_THRESHOLDS.WARNING) return '🟡 Atenção';
    return '🔴 Crítico';
}

/**
 * Formats a trend for display
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
