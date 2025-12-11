// FILE: src/discord/commands/premium.js
// Slash command: /guildlens-premium

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const logger = require('../../utils/logger');
const { safeReply } = require('../../utils/commandUtils');
const { PLANS } = require('../../config/plans');
const subscriptionsRepo = require('../../db/repositories/subscriptions');
const OFFICIAL = require('../../utils/official');

const log = logger.child('PremiumCommand');

const data = new SlashCommandBuilder()
    .setName('guildlens-premium')
    .setDescription('Ver planos e preços')
    .setDMPermission(false);

async function execute(interaction) {
    log.info(`Premium command in ${interaction.guild.name}`);

    try {
        const currentPlan = await subscriptionsRepo.getPlan(interaction.guildId);
        const planName = PLANS[currentPlan]?.name || 'Free';

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('GuildLens Premium')
            .setDescription(`Seu plano atual: **${planName}**`)
            .addFields(
                {
                    name: `${PLANS.FREE.emoji} FREE`,
                    value:
                        `**${PLANS.FREE.priceDisplay}**\n` +
                        `• ${PLANS.FREE.limits.members} membros\n` +
                        `• ${PLANS.FREE.limits.historyDays} dias histórico\n` +
                        `• Health básico`,
                    inline: true
                },
                {
                    name: `${PLANS.PRO.emoji} PRO`,
                    value:
                        `**${PLANS.PRO.priceDisplay}**\n` +
                        `• ${PLANS.PRO.limits.members.toLocaleString('pt-BR')} membros\n` +
                        `• ${PLANS.PRO.limits.historyDays} dias histórico\n` +
                        `• Health + Insights\n` +
                        `• Alertas + Ações`,
                    inline: true
                },
                {
                    name: `${PLANS.GROWTH.emoji} GROWTH`,
                    value:
                        `**${PLANS.GROWTH.priceDisplay}**\n` +
                        `• Membros ilimitados\n` +
                        `• ${PLANS.GROWTH.limits.historyDays} dias histórico\n` +
                        `• ${PLANS.GROWTH.limits.servers} servidores\n` +
                        `• Export JSON + CSV`,
                    inline: true
                }
            )
            .setFooter({ text: 'Para assinar, abra um ticket no servidor oficial' });

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
