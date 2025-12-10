// FILE: src/discord/commands/about.js
// Slash command: /guildlens-about - Information about the bot and developers

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const { COLORS, EMOJI } = require('../../utils/embeds');
const subscriptionsRepo = require('../../db/repositories/subscriptions');

const log = logger.child('AboutCommand');

/**
 * Bot version
 */
const VERSION = '1.0.0';

/**
 * Developer information
 */
const DEVELOPERS = [
    {
        name: 'SavioCodes',
        role: 'Founder & Lead Developer',
        discord: 'saviohunter14',
    },
];

/**
 * Command data for registration
 */
const data = new SlashCommandBuilder()
    .setName('guildlens-about')
    .setDescription('Informações sobre o GuildLens e sua equipe')
    .setDMPermission(false);

/**
 * Executes the about command
 * @param {Interaction} interaction - Discord interaction
 */
async function execute(interaction) {
    const guildId = interaction.guildId;

    log.info(`About command in ${interaction.guild.name}`);

    try {
        // Get current plan
        const plan = await subscriptionsRepo.getPlan(guildId);
        const planLimits = subscriptionsRepo.PlanLimits[plan];

        // Build developers list
        const devsText = DEVELOPERS.map((dev, i) => {
            const medal = i === 0 ? '👑' : '💻';
            return `${medal} **${dev.name}** — ${dev.role}`;
        }).join('\n');

        const embed = new EmbedBuilder()
            .setTitle(`${EMOJI.SPARKLE} Sobre o GuildLens`)
            .setColor(COLORS.PRIMARY)
            .setDescription(
                '**GuildLens** é um bot de estratégia de comunidade que analisa a atividade do seu servidor ' +
                'e fornece insights acionáveis para manter sua comunidade engajada e saudável.\n\n' +
                '🔍 **O que fazemos:**\n' +
                '• Monitoramos a atividade do servidor em tempo real\n' +
                '• Calculamos um Health Score da sua comunidade\n' +
                '• Detectamos quedas de engajamento antes que se tornem problemas\n' +
                '• Sugerimos ações concretas para aumentar a participação'
            )
            .addFields(
                {
                    name: '📊 Versão',
                    value: `v${VERSION}`,
                    inline: true,
                },
                {
                    name: '📋 Seu Plano',
                    value: `**${planLimits.name}**`,
                    inline: true,
                },
                {
                    name: '🌐 Servidores',
                    value: `${interaction.client.guilds.cache.size}`,
                    inline: true,
                },
                {
                    name: '👨‍💻 Equipe de Desenvolvimento',
                    value: devsText,
                    inline: false,
                },
                {
                    name: '🔗 Links Úteis',
                    value:
                        '• [Servidor Oficial](https://discord.gg/guildlens) (em breve)\n' +
                        '• [Documentação](https://guildlens.com/docs) (em breve)\n' +
                        '• Use `/guildlens-pricing` para ver os planos',
                    inline: false,
                }
            )
            .setThumbnail(interaction.client.user.displayAvatarURL({ size: 256 }))
            .setTimestamp()
            .setFooter({
                text: 'GuildLens • Community Strategy Bot',
            });

        await interaction.reply({
            embeds: [embed],
        });

        log.success(`About info shown in ${interaction.guild.name}`);

    } catch (error) {
        log.error('Failed to show about info', 'About', error);
        await interaction.reply({
            content: '❌ Erro ao carregar informações. Tente novamente.',
            flags: 64,
        });
    }
}

module.exports = {
    data,
    execute,
};
