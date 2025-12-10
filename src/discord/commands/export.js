// FILE: src/discord/commands/export.js
// Slash command: /guildlens-export - Export data to CSV (Growth plan only)

const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const { createWarningEmbed } = require('../../utils/embeds');
const messagesRepo = require('../../db/repositories/messages');
const statsRepo = require('../../db/repositories/stats');
const { enforceFeature, getPlanForWatermark } = require('../../utils/planEnforcement');
const { handleCommandError } = require('../../utils/errorHandler');
const { getDateRange } = require('../../utils/time');

const log = logger.child('ExportCommand');

/**
 * Command data for registration
 */
const data = new SlashCommandBuilder()
    .setName('guildlens-export')
    .setDescription('Exporta dados do servidor em CSV (Plano Growth)')
    .setDMPermission(false)
    .addSubcommand(subcommand =>
        subcommand
            .setName('mensagens')
            .setDescription('Exporta resumo de mensagens por canal')
            .addIntegerOption(option =>
                option
                    .setName('dias')
                    .setDescription('Número de dias (padrão: 30)')
                    .setMinValue(1)
                    .setMaxValue(365)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('stats')
            .setDescription('Exporta estatísticas diárias')
            .addIntegerOption(option =>
                option
                    .setName('dias')
                    .setDescription('Número de dias (padrão: 30)')
                    .setMinValue(1)
                    .setMaxValue(365)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('canais')
            .setDescription('Exporta atividade por canal')
            .addIntegerOption(option =>
                option
                    .setName('dias')
                    .setDescription('Número de dias (padrão: 30)')
                    .setMinValue(1)
                    .setMaxValue(365)
            )
    );

/**
 * Executes the export command
 * @param {Interaction} interaction - Discord interaction
 */
async function execute(interaction) {
    const guildId = interaction.guildId;
    const guildName = interaction.guild.name;
    const subcommand = interaction.options.getSubcommand();

    log.info(`Export command: ${subcommand} in ${guildName}`);

    // Defer reply since export might take a moment
    await interaction.deferReply({ flags: 64 });

    // Check if user has Growth plan
    const allowed = await enforceFeature(interaction, 'export');
    if (!allowed) {
        return; // Already responded with upgrade prompt
    }

    try {
        const days = interaction.options.getInteger('dias') || 30;

        let csvContent;
        let filename;

        switch (subcommand) {
            case 'mensagens':
                csvContent = await exportMessages(guildId, days);
                filename = `guildlens_mensagens_${days}d.csv`;
                break;
            case 'stats':
                csvContent = await exportStats(guildId, days);
                filename = `guildlens_stats_${days}d.csv`;
                break;
            case 'canais':
                csvContent = await exportChannels(guildId, days);
                filename = `guildlens_canais_${days}d.csv`;
                break;
            default:
                await interaction.editReply({
                    content: '❌ Subcomando inválido.',
                });
                return;
        }

        if (!csvContent || csvContent.split('\n').length <= 1) {
            await interaction.editReply({
                embeds: [createWarningEmbed(
                    'Sem Dados para Exportar',
                    `Não há dados suficientes nos últimos ${days} dias para gerar o relatório.\n\n` +
                    'O bot precisa coletar mais dados de atividade do servidor.'
                )],
            });
            return;
        }

        // Create attachment
        const buffer = Buffer.from(csvContent, 'utf-8');
        const attachment = new AttachmentBuilder(buffer, { name: filename });

        await interaction.editReply({
            content: `✅ **Exportação concluída!**\n\n📊 Dados dos últimos **${days} dias**\n📄 Arquivo: \`${filename}\``,
            files: [attachment],
        });

        log.success(`Export ${subcommand} completed for ${guildName}: ${filename}`);

    } catch (error) {
        log.error(`Failed to export ${subcommand} for ${guildName}`, 'Export', error);
        await handleCommandError(error, interaction, 'guildlens-export');
    }
}

/**
 * Exports message summary by date
 */
async function exportMessages(guildId, days) {
    const { startDate, endDate } = getDateRange(days);

    const data = await messagesRepo.getMessageCountByPeriod(guildId, startDate, endDate);

    if (!data || data.length === 0) {
        return '';
    }

    // CSV header
    let csv = 'Data,Mensagens\n';

    // Add rows
    for (const row of data) {
        const date = new Date(row.date).toLocaleDateString('pt-BR');
        csv += `${date},${row.count}\n`;
    }

    return csv;
}

/**
 * Exports daily stats
 */
async function exportStats(guildId, days) {
    const stats = await statsRepo.getStatsSummary(guildId, days);

    if (!stats || stats.length === 0) {
        return '';
    }

    // CSV header
    let csv = 'Data,Mensagens,Membros Ativos\n';

    // Add rows
    for (const row of stats) {
        const date = new Date(row.date).toLocaleDateString('pt-BR');
        csv += `${date},${row.messages_count},${row.active_members_count}\n`;
    }

    return csv;
}

/**
 * Exports channel activity
 */
async function exportChannels(guildId, days) {
    const { startDate, endDate } = getDateRange(days);

    const data = await messagesRepo.getChannelActivity(guildId, startDate, endDate);

    if (!data || data.length === 0) {
        return '';
    }

    // CSV header
    let csv = 'Canal ID,Mensagens,Porcentagem\n';

    // Calculate total
    const total = data.reduce((sum, ch) => sum + parseInt(ch.count), 0);

    // Add rows
    for (const row of data) {
        const percentage = ((row.count / total) * 100).toFixed(2);
        csv += `${row.channelId || row.channel_id},${row.count},${percentage}%\n`;
    }

    return csv;
}

module.exports = {
    data,
    execute,
};
