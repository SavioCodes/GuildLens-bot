/**
 * Admin Global Service
 * Handles Broadcasts and Maintenance Mode.
 */

const { EmbedBuilder } = require('discord.js');
const maintenanceState = require('../../../utils/maintenanceState');
const { COLORS } = require('../../../utils/embeds');
const logger = require('../../../utils/logger');

const log = logger.child('AdminGlobal');

const AdminGlobal = {
    async broadcast(interaction) {
        const message = interaction.options.getString('mensagem');
        if (message.length < 5) return interaction.reply({ content: '❌ Mensagem muito curta.', flags: 64 });

        await interaction.deferReply({ flags: 64 });

        let sent = 0;
        let failed = 0;
        const guilds = interaction.client.guilds.cache;

        for (const [id, guild] of guilds) {
            const channel = guild.systemChannel || guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(guild.members.me).has('SendMessages'));

            if (channel) {
                try {
                    const embed = new EmbedBuilder()
                        .setTitle('📢 Comunicado Oficial GuildLens')
                        .setDescription(message)
                        .setColor(COLORS.WARNING)
                        .setFooter({ text: 'Mensagem enviada pelo Desenvolvedor' })
                        .setTimestamp();

                    await channel.send({ embeds: [embed] });
                    sent++;
                } catch (e) {
                    failed++;
                }
            } else {
                failed++;
            }
        }

        await interaction.editReply({
            content: `📢 **Broadcast Finalizado**\n✅ Enviado: ${sent}\n❌ Falhou: ${failed}`,
            embeds: []
        });
    },

    async maintenance(interaction) {
        const state = interaction.options.getString('estado');
        const reason = interaction.options.getString('motivo');

        if (state === 'on') {
            maintenanceState.setMaintenance(true, reason || 'Manutenção programada');
            log.warn(`Maintenance Mode ENABLED by ${interaction.user.tag}`);
            await interaction.reply({ content: `🔒 **Modo Manutenção ATIVADO**\nMotivo: ${reason || 'Padrão'}\n\nO bot agora vai ignorar comandos de usuários comuns.`, flags: 64 });
        } else {
            maintenanceState.setMaintenance(false);
            log.warn(`Maintenance Mode DISABLED by ${interaction.user.tag}`);
            await interaction.reply({ content: '🔓 **Modo Manutenção DESATIVADO**\nO bot está aberto para todos.', flags: 64 });
        }
    }
};

module.exports = AdminGlobal;
