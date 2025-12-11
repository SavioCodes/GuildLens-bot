// FILE: src/discord/commands/export.js
// Slash command: /guildlens-export

const { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const { safeReply, safeDefer, checkCooldown, error, success } = require('../../utils/commandUtils');
const messagesRepo = require('../../db/repositories/messages');
const { checkPlanLimit } = require('../../utils/planEnforcement');

const log = logger.child('ExportCommand');

const data = new SlashCommandBuilder()
    .setName('guildlens-export')
    .setDescription('Exportar dados do servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addStringOption(opt => opt
        .setName('tipo')
        .setDescription('Tipo de dados para exportar')
        .setRequired(true)
        .addChoices(
            { name: 'Mensagens (7 dias)', value: 'messages' },
            { name: 'Canais', value: 'channels' },
            { name: 'Estatísticas', value: 'stats' }
        )
    )
    .addStringOption(opt => opt
        .setName('formato')
        .setDescription('Formato do arquivo')
        .addChoices(
            { name: 'JSON', value: 'json' },
            { name: 'CSV', value: 'csv' }
        )
    );

async function execute(interaction) {
    const guildId = interaction.guildId;
    const guildName = interaction.guild.name;
    const tipo = interaction.options.getString('tipo');
    const formato = interaction.options.getString('formato') || 'json';

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
        // Check plan
        const planCheck = await checkPlanLimit(guildId, 'EXPORT');
        if (!planCheck.allowed) {
            return interaction.editReply({
                embeds: [error('Recurso Premium', planCheck.message)]
            });
        }

        let data;
        let filename;

        switch (tipo) {
            case 'messages': {
                data = await messagesRepo.getRecentMessages(guildId, 7);
                filename = `messages_${guildId}`;
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
                const stats = await messagesRepo.getMessageStats(guildId, 7);
                data = stats;
                filename = `stats_${guildId}`;
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
