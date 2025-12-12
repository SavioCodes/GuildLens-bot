// FILE: src/discord/commands/export.js
// Slash command: /guildlens-export

const { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const { safeReply, safeDefer, checkCooldown, error, success } = require('../../utils/commandUtils');
const messagesRepo = require('../../db/repositories/messages');
const { enforceFeature } = require('../../utils/planEnforcement');

const log = logger.child('ExportCommand');

const data = new SlashCommandBuilder()
    .setName('guildlens-export')
    .setDescription('📁 Exportar dados do servidor em JSON ou CSV')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addStringOption(opt => opt
        .setName('tipo')
        .setDescription('Tipo de dados para exportar')
        .setRequired(true)
        .addChoices(
            { name: '💬 Mensagens', value: 'messages' },
            { name: '📺 Canais', value: 'channels' },
            { name: '📊 Estatísticas', value: 'stats' }
        )
    )
    .addStringOption(opt => opt
        .setName('formato')
        .setDescription('Formato do arquivo')
        .addChoices(
            { name: '📄 JSON', value: 'json' },
            { name: '📋 CSV', value: 'csv' }
        )
    )
    .addIntegerOption(opt => opt
        .setName('dias')
        .setDescription('Quantidade de dias (1-30)')
        .setMinValue(1)
        .setMaxValue(30)
    );

async function execute(interaction) {
    const guildId = interaction.guildId;
    const guildName = interaction.guild.name;
    const tipo = interaction.options.getString('tipo');
    const formato = interaction.options.getString('formato') || 'json';
    const dias = interaction.options.getInteger('dias') || 7;

    // Cooldown: 30 seconds
    const remaining = checkCooldown(interaction.user.id, 'export', 30);
    if (remaining) {
        return safeReply(interaction, {
            embeds: [error('Aguarde', `Tente novamente em ${remaining}s.`)],
            flags: 64
        });
    }

    log.info(`Export ${tipo} in ${guildName}`);
    await safeDefer(interaction, true);

    try {
        // Check plan (export feature)
        const allowed = await enforceFeature(interaction, 'export');
        if (!allowed) return; // enforceFeature already replies

        let data;
        let filename;

        switch (tipo) {
            case 'messages': {
                data = await messagesRepo.getRecentMessages(guildId, dias);
                filename = `messages_${guildId}_${dias}d`;
                break;
            }
            case 'channels': {
                data = interaction.guild.channels.cache.map(ch => ({
                    id: ch.id,
                    name: ch.name,
                    type: ch.type,
                    position: ch.position
                }));
                filename = `channels_${guildId}`;
                break;
            }
            case 'stats': {
                const stats = await messagesRepo.getMessageStats(guildId, dias);
                data = stats;
                filename = `stats_${guildId}_${dias}d`;
                break;
            }
        }

        let content;
        let ext;

        if (formato === 'csv' && Array.isArray(data) && data.length > 0) {
            const headers = Object.keys(data[0]).join(',');
            const rows = data.map(row => Object.values(row).join(','));
            content = [headers, ...rows].join('\n');
            ext = 'csv';
        } else {
            content = JSON.stringify(data, null, 2);
            ext = 'json';
        }

        const attachment = new AttachmentBuilder(
            Buffer.from(content, 'utf-8'),
            { name: `${filename}.${ext}` }
        );

        await interaction.editReply({
            embeds: [success('Exportado', `Dados de ${tipo} exportados.`)],
            files: [attachment]
        });
        log.success(`Export ${tipo} completed in ${guildName}`);

    } catch (err) {
        log.error(`Export failed in ${guildName}`, err);
        await interaction.editReply({ embeds: [error('Erro', 'Falha ao exportar dados.')] });
    }
}

module.exports = { data, execute };
