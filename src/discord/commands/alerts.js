// FILE: src/discord/commands/alerts.js
// Slash command: /guildlens-alerts

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const { safeReply, safeDefer, checkCooldown, error, success, CMD_COLORS } = require('../../utils/commandUtils');
const settingsRepo = require('../../db/repositories/settings');
const { enforceFeature } = require('../../utils/planEnforcement');

const log = logger.child('AlertsCommand');

const data = new SlashCommandBuilder()
    .setName('guildlens-alerts')
    .setDescription('🔔 Configurar alertas automáticos de atividade')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand(sub => sub
        .setName('status')
        .setDescription('📊 Ver configuração atual de alertas')
    )
    .addSubcommand(sub => sub
        .setName('enable')
        .setDescription('✅ Ativar notificações de alertas')
    )
    .addSubcommand(sub => sub
        .setName('disable')
        .setDescription('❌ Desativar notificações de alertas')
    )
    .addSubcommand(sub => sub
        .setName('channel')
        .setDescription('📢 Definir canal para receber alertas')
        .addChannelOption(opt => opt
            .setName('canal')
            .setDescription('Canal para enviar alertas')
            .setRequired(true)
        )
    );

// ...

async function execute(interaction) {
    const guildId = interaction.guildId;
    const guildName = interaction.guild.name;
    const subcommand = interaction.options.getSubcommand(false) || 'status';

    // Cooldown: 5 seconds
    const remaining = checkCooldown(interaction.user.id, 'alerts', 5);
    if (remaining) {
        return safeReply(interaction, {
            embeds: [error('Aguarde', `Tente novamente em ${remaining}s.`)],
            flags: 64
        });
    }

    log.info(`Alerts ${subcommand} in ${guildName}`);
    await safeDefer(interaction, true);

    try {
        // Check plan (alerts feature)
        const allowed = await enforceFeature(interaction, 'alerts');
        if (!allowed) return; // enforceFeature already replies

        const settings = await settingsRepo.getSettings(guildId);

        switch (subcommand) {
            case 'status': {
                const embed = new EmbedBuilder()
                    .setColor(CMD_COLORS.INFO)
                    .setTitle('Configuração de Alertas')
                    .addFields(
                        { name: 'Status', value: settings?.alerts_enabled ? '✅ Ativo' : '❌ Inativo', inline: true },
                        { name: 'Canal', value: settings?.alerts_channel ? `<#${settings.alerts_channel}>` : 'Não definido', inline: true }
                    );
                await interaction.editReply({ embeds: [embed] });
                break;
            }

            case 'enable': {
                await settingsRepo.updateSettings(guildId, { alerts_enabled: true });
                await interaction.editReply({ embeds: [success('Ativado', 'Alertas habilitados.')] });
                log.success(`Alerts enabled in ${guildName}`);
                break;
            }

            case 'disable': {
                await settingsRepo.updateSettings(guildId, { alerts_enabled: false });
                await interaction.editReply({ embeds: [success('Desativado', 'Alertas desabilitados.')] });
                log.success(`Alerts disabled in ${guildName}`);
                break;
            }

            case 'channel': {
                const channel = interaction.options.getChannel('canal');
                if (!channel.isTextBased()) {
                    return interaction.editReply({ embeds: [error('Erro', 'Selecione um canal de texto.')] });
                }
                await settingsRepo.updateSettings(guildId, { alerts_channel: channel.id });
                await interaction.editReply({ embeds: [success('Canal Definido', `Alertas serão enviados em ${channel}.`)] });
                log.success(`Alerts channel set to #${channel.name} in ${guildName}`);
                break;
            }
        }

    } catch (err) {
        log.error(`Alerts failed in ${guildName}`, err);
        await interaction.editReply({ embeds: [error('Erro', 'Falha ao configurar alertas.')] });
    }
}

module.exports = { data, execute };
