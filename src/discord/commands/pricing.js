// FILE: src/discord/commands/pricing.js
// Slash command: /guildlens-pricing - Show pricing plans

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const { COLORS, EMOJI } = require('../../utils/embeds');
const subscriptionsRepo = require('../../db/repositories/subscriptions');

const log = logger.child('PricingCommand');

/**
 * Command data for registration
 */
const data = new SlashCommandBuilder()
    .setName('guildlens-pricing')
    .setDescription('Mostra os planos e preços do GuildLens')
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
            .setTitle(`${EMOJI.STAR} Planos GuildLens`)
            .setColor(COLORS.PRIMARY)
            .setDescription(
                'Escolha o plano ideal para sua comunidade.\n' +
                `Seu plano atual: **${subscriptionsRepo.PlanLimits[currentPlan].name}**`
            )
            .addFields(
                {
                    name: '🆓 FREE — Gratuito',
                    value:
                        '• Até 500 membros\n' +
                        '• Health Score básico\n' +
                        '• Insights dos últimos 7 dias\n' +
                        '• Watermark nas respostas\n' +
                        '• ~~Alertas avançados~~\n' +
                        '• ~~Ações recomendadas~~\n\n' +
                        '**Perfeito para testar o bot!**',
                    inline: false,
                },
                {
                    name: '⭐ PRO — R$ 49/mês',
                    value:
                        '• Membros ilimitados\n' +
                        '• Health Score completo\n' +
                        '• Insights de até 90 dias\n' +
                        '• ✅ Alertas avançados (`/guildlens-alerts`)\n' +
                        '• ✅ Ações recomendadas (`/guildlens-actions`)\n' +
                        '• Suporte no servidor oficial\n' +
                        '• Sem watermark\n\n' +
                        '**Ideal para comunidades sérias!**',
                    inline: false,
                },
                {
                    name: '🚀 GROWTH — R$ 129/mês',
                    value:
                        '• Tudo do Pro\n' +
                        '• Até 5 servidores\n' +
                        '• Histórico de 365 dias\n' +
                        '• ✅ Exportar dados (CSV)\n' +
                        '• ✅ Alertas automáticos em canal\n' +
                        '• ✅ Suporte prioritário\n' +
                        '• Relatórios mensais\n\n' +
                        '**Para agências e grandes comunidades!**',
                    inline: false,
                },
                {
                    name: '💳 Como Assinar?',
                    value:
                        'Entre no servidor oficial do GuildLens e fale com nossa equipe!\n' +
                        'Aceitamos Pix e cartão de crédito.\n\n' +
                        '🔗 [Servidor Oficial](https://discord.gg/guildlens) (em breve)',
                    inline: false,
                }
            )
            .setTimestamp()
            .setFooter({
                text: 'GuildLens • Preços válidos para Brasil',
            });

        await interaction.reply({
            embeds: [embed],
        });

        log.success(`Pricing shown in ${interaction.guild.name}`);

    } catch (error) {
        log.error('Failed to show pricing', 'Pricing', error);
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
