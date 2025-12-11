// FILE: src/discord/commands/premium.js
// Slash command: /guildlens-premium

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const logger = require('../../utils/logger');
const { safeReply, CMD_COLORS } = require('../../utils/commandUtils');
const subscriptionsRepo = require('../../db/repositories/subscriptions');
const OFFICIAL = require('../../utils/official');

const log = logger.child('PremiumCommand');

const data = new SlashCommandBuilder()
    .setName('guildlens-premium')
    .setDescription('Ver planos disponíveis')
    .setDMPermission(false);

async function execute(interaction) {
    log.info(`Premium command in ${interaction.guild.name}`);

    try {
        const currentPlan = await subscriptionsRepo.getPlan(interaction.guildId);
        const planName = subscriptionsRepo.PlanLimits[currentPlan]?.name || 'Free';

        const embed = new EmbedBuilder()
            .setColor(CMD_COLORS.PREMIUM)
            .setTitle('Planos GuildLens')
            .setDescription(`Seu plano atual: **${planName}**`)
            .addFields(
                {
                    name: '⭐ PRO — R$ 19,90/mês',
                    value: '• Membros ilimitados\n• Health Score completo\n• Insights de 90 dias\n• Sem watermark',
                    inline: true
                },
                {
                    name: '🚀 GROWTH — R$ 39,90/mês',
                    value: '• Tudo do PRO\n• Até 5 servidores\n• Histórico de 365 dias\n• Suporte VIP',
                    inline: true
                }
            )
            .setFooter({ text: 'Abra um ticket para assinar' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Abrir Ticket')
                    .setStyle(ButtonStyle.Link)
                    .setURL(OFFICIAL.LINKS.TICKET)
            );

        await safeReply(interaction, { embeds: [embed], components: [row] });
        log.success(`Premium shown in ${interaction.guild.name}`);

    } catch (err) {
        log.error('Premium command failed', err);
        await safeReply(interaction, { content: '❌ Erro ao carregar planos.', flags: 64 });
    }
}

module.exports = { data, execute };
