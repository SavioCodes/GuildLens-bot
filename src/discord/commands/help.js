// FILE: src/discord/commands/help.js
// Slash command: /guildlens-help - usage guide

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { COLORS, EMOJI } = require('../../utils/embeds');
const { handleCommandError } = require('../../utils/errorHandler');
const OFFICIAL = require('../../utils/official');

/**
 * Command data for registration
 */
const data = new SlashCommandBuilder()
    .setName('guildlens-help')
    .setDescription('Mostra todos os comandos e como usar o GuildLens');

/**
 * Executes the help command
 * @param {Interaction} interaction - Discord interaction
 */
async function execute(interaction) {
    try {
        const embed = new EmbedBuilder()
            .setTitle(`${EMOJI.INFO} Central de Ajuda do GuildLens`)
            .setDescription('Aqui está um guia rápido de como aproveitar o máximo do seu bot de métricas! 🦅')
            .setColor(COLORS.PRIMARY)
            .addFields(
                {
                    name: '🚀 Começando',
                    value: '`/guildlens-setup start` - Configure os canais de métricas.\n`/guildlens-premium` - Veja os planos disponíveis.'
                },
                {
                    name: '📊 Análise e Métricas',
                    value: '`/guildlens-health` - Check-up completo do servidor.\n`/guildlens-insights` - Ideias para crescer.\n`/guildlens-export` - Baixe seus dados.'
                },
                {
                    name: '🛡️ Moderação e Alertas',
                    value: '`/guildlens-alerts` - Configure alertas de segurança.\n`/guildlens-actions` - Kick/Ban em massa (Cuidado!).'
                },
                {
                    name: '🤝 Comunidade',
                    value: '`/guildlens-community suggest` - Envie ideias para o dev.\n`/guildlens-community report-bug` - Avise sobre erros.'
                }
            )
            .setFooter({ text: 'Dúvidas? Entre no nosso servidor de suporte!' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Entrar no Suporte')
                    .setStyle(ButtonStyle.Link)
                    .setURL(OFFICIAL.LINKS.SUPPORT_SERVER),
                new ButtonBuilder()
                    .setLabel('Documentação')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://github.com/SavioCodes/GuildLens-bot') // Or a legit doc link if it exists
            );

        await interaction.reply({ embeds: [embed], components: [row] });

    } catch (error) {
        await handleCommandError(error, interaction, 'guildlens-help');
    }
}

module.exports = {
    data,
    execute,
};
