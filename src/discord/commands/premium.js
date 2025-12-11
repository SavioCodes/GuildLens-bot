// FILE: src/discord/commands/premium.js
// Slash command: /guildlens-premium - Show pricing plans (no public PIX)

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const logger = require('../../utils/logger');
const { COLORS, EMOJI } = require('../../utils/embeds');
const subscriptionsRepo = require('../../db/repositories/subscriptions');
const OFFICIAL = require('../../utils/official');

const log = logger.child('PricingCommand');

/**
 * Command data for registration
 */
const data = new SlashCommandBuilder()
    .setName('guildlens-premium')
    .setDescription('Mostra planos, preços e como assinar')
    .setDMPermission(false);

/**
 * Executes the pricing command
 * @param {Interaction} interaction - Discord interaction
 */
async function execute(interaction) {
    const guildId = interaction.guildId;

    log.info(`Pricing command in ${interaction.guild.name}`);

    try {
        // Get current plan
        const currentPlan = await subscriptionsRepo.getPlan(guildId);

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setAuthor({ name: 'GuildLens Premium' })
            .setTitle('Planos Disponíveis')
            .setDescription(`Seu plano atual: **${subscriptionsRepo.PlanLimits[currentPlan].name}**`)
            .addFields(
                {
                    name: '⭐ PRO — R$ 19,90/mês',
                    value:
                        '• Membros ilimitados\n' +
                        '• Health Score completo\n' +
                        '• Insights de 90 dias\n' +
                        '• Sem watermark',
                    inline: true,
                },
                {
                    name: '🚀 GROWTH — R$ 39,90/mês',
                    value:
                        '• Tudo do PRO\n' +
                        '• Até 5 servidores\n' +
                        '• Histórico de 365 dias\n' +
                        '• Suporte VIP',
                    inline: true,
                }
            )
            .setFooter({ text: 'Para assinar, abra um ticket no servidor oficial.' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('🎫 Abrir Ticket para Comprar')
                    .setStyle(ButtonStyle.Link)
                    .setURL(OFFICIAL.LINKS.TICKET),
                new ButtonBuilder()
                    .setLabel('🌐 Servidor Oficial')
                    .setStyle(ButtonStyle.Link)
                    .setURL(OFFICIAL.LINKS.SERVER)
            );

        await interaction.reply({
            embeds: [embed],
            components: [row]
        });

        log.success(`Pricing shown in ${interaction.guild.name}`);

    } catch (error) {
        log.error('Failed to show pricing', error);
        await interaction.reply({
            content: '❌ Erro ao carregar preços. Tente novamente.',
            flags: 64,
        });
    }
}

module.exports = {
    data,
    execute,
};
