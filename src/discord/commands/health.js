// FILE: src/discord/commands/health.js
// Slash command: /guildlens-health - Server Health Score Analysis

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const logger = require('../../utils/logger');
const { createHealthEmbed, createWarningEmbed } = require('../../utils/embeds');
const { safeReply, safeDefer, checkCooldown, error, requireGuild, formatNumber } = require('../../utils/commandUtils');
const analytics = require('../../services/analytics');
const { addWatermark, getPlanForWatermark } = require('../../utils/planEnforcement');

const log = logger.child('HealthCommand');

const data = new SlashCommandBuilder()
    .setName('guildlens-health')
    .setDescription('💊 Ver nota de saúde do servidor (0-100)')
    .setDMPermission(false)
    .addBooleanOption(option =>
        option.setName('detalhado')
            .setDescription('Mostrar análise detalhada com recomendações')
            .setRequired(false)
    );

async function execute(interaction) {
    // Validate guild context
    if (!await requireGuild(interaction)) return;

    const guildId = interaction.guildId;
    const guildName = interaction.guild.name;
    const detailed = interaction.options.getBoolean('detalhado') || false;

    // Cooldown: 10 seconds
    const remaining = checkCooldown(interaction.user.id, 'health', 10);
    if (remaining) {
        return safeReply(interaction, {
            embeds: [error('Aguarde', `Tente novamente em **${remaining}s**.`)],
            flags: 64
        });
    }

    log.info(`Health command in ${guildName} (detailed: ${detailed})`);
    await safeDefer(interaction);

    try {
        const healthData = await analytics.calculateHealthScore(guildId);

        // Handle no data case
        if (!healthData || healthData.totalMessages === 0) {
            const warningEmbed = createWarningEmbed(
                'Coletando Dados',
                '📊 O bot ainda está coletando dados do servidor.\n\n' +
                '**O que fazer:**\n' +
                '• Continue usando o servidor normalmente\n' +
                '• Volte em algumas horas\n' +
                '• Use `/guildlens-stats` para ver dados básicos'
            );
            return interaction.editReply({ embeds: [warningEmbed] });
        }

        // Create health embed
        let embed = createHealthEmbed(healthData);

        // Add detailed analysis if requested
        if (detailed && healthData.score !== undefined) {
            const analysis = getHealthAnalysis(healthData.score);
            embed.addFields({
                name: '📋 Análise Detalhada',
                value: analysis,
                inline: false
            });

            // Add recommendations
            const recommendations = getHealthRecommendations(healthData);
            if (recommendations.length > 0) {
                embed.addFields({
                    name: '💡 Recomendações',
                    value: recommendations.slice(0, 3).join('\n'),
                    inline: false
                });
            }
        }

        // Add watermark based on plan
        const plan = await getPlanForWatermark(guildId);
        embed = addWatermark(embed, plan);

        // Add action button if score is low
        const components = [];
        if (healthData.score < 50) {
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('health_tips')
                        .setLabel('💡 Ver Dicas')
                        .setStyle(ButtonStyle.Primary)
                );
            components.push(row);
        }

        await interaction.editReply({
            embeds: [embed],
            components: components.length > 0 ? components : undefined
        });

        log.success(`Health: ${healthData.score} in ${guildName}`);

    } catch (err) {
        log.error(`Health failed in ${guildName}`, err);
        await interaction.editReply({
            embeds: [error('Erro ao Calcular', 'Não foi possível calcular a saúde do servidor.\nTente novamente em alguns instantes.')]
        });
    }
}

/**
 * Get health analysis text based on score
 */
function getHealthAnalysis(score) {
    if (score >= 90) {
        return '🏆 **Excelente!** Seu servidor está extremamente saudável. A comunidade está engajada e ativa.';
    } else if (score >= 70) {
        return '✅ **Muito Bom!** O servidor está saudável com uma boa base de membros ativos.';
    } else if (score >= 50) {
        return '📊 **Regular.** O servidor tem atividade moderada. Há espaço para melhorias.';
    } else if (score >= 30) {
        return '⚠️ **Atenção.** A atividade está abaixo do esperado. Considere implementar ações de engajamento.';
    } else {
        return '🔴 **Crítico.** O servidor precisa de atenção urgente. Recomendamos ações imediatas.';
    }
}

/**
 * Get health recommendations based on data
 */
function getHealthRecommendations(healthData) {
    const recommendations = [];

    if (healthData.score < 50) {
        recommendations.push('• Crie eventos ou discussões para engajar membros');
    }
    if (healthData.avgMessagesPerDay && healthData.avgMessagesPerDay < 10) {
        recommendations.push('• Incentive conversas com perguntas diárias');
    }
    if (healthData.uniqueAuthors && healthData.uniqueAuthors < 5) {
        recommendations.push('• Diversifique os canais de conteúdo');
    }
    if (healthData.trend === 'down') {
        recommendations.push('• Analise o que mudou recentemente no servidor');
    }

    return recommendations;
}

module.exports = { data, execute };
