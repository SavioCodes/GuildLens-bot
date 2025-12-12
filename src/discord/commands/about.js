// FILE: src/discord/commands/about.js
// Slash command: /guildlens-about - Bot information and credits

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { safeReply } = require('../../utils/commandUtils');
const { COLORS } = require('../../config/constants');
const OFFICIAL = require('../../utils/official');

const data = new SlashCommandBuilder()
    .setName('guildlens-about')
    .setDescription('ℹ️ Informações sobre o GuildLens')
    .setDMPermission(false);

async function execute(interaction) {
    const client = interaction.client;
    const uptime = formatUptime(client.uptime);

    const embed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle('🛡️ GuildLens')
        .setDescription(
            'Bot de **analytics especializado para Discord** que ajuda você a entender e melhorar o engajamento do seu servidor.\n\n' +
            '🎯 **Missão:** Transformar dados em insights acionáveis para crescer sua comunidade.'
        )
        .addFields(
            {
                name: '✨ Recursos Principais',
                value: [
                    '📊 **Health Score** — Nota de saúde de 0 a 100',
                    '📈 **Insights** — Padrões e tendências de atividade',
                    '🔔 **Alertas** — Notificações de quedas/picos',
                    '📋 **Exportação** — Dados em CSV e JSON',
                    '🏆 **Leaderboard** — Ranking de membros ativos'
                ].join('\n'),
                inline: false
            },
            {
                name: '📊 Estatísticas do Bot',
                value: [
                    `🌐 **Servidores:** ${client.guilds.cache.size.toLocaleString('pt-BR')}`,
                    `👥 **Usuários:** ${client.users.cache.size.toLocaleString('pt-BR')}`,
                    `⏱️ **Uptime:** ${uptime}`
                ].join('\n'),
                inline: true
            },
            {
                name: '🔧 Informações',
                value: [
                    `📌 **Versão:** 1.0.0`,
                    `⚡ **Ping:** ${client.ws.ping}ms`,
                    `🔒 **Shards:** 1`
                ].join('\n'),
                inline: true
            }
        )
        .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
        .setFooter({ text: '💻 Desenvolvido por Sávio Brito • Made with ❤️' })
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setLabel('🏠 Servidor Oficial')
                .setStyle(ButtonStyle.Link)
                .setURL(OFFICIAL.LINKS.SERVER),
            new ButtonBuilder()
                .setLabel('➕ Adicionar Bot')
                .setStyle(ButtonStyle.Link)
                .setURL(`https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`),
            new ButtonBuilder()
                .setLabel('⭐ Avaliar')
                .setStyle(ButtonStyle.Link)
                .setURL(OFFICIAL.LINKS.SERVER) // Could be replaced with top.gg link
        );

    await safeReply(interaction, { embeds: [embed], components: [row] });
}

/**
 * Formats uptime in a human-readable format
 * @param {number} ms - Uptime in milliseconds
 * @returns {string} Formatted uptime
 */
function formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

module.exports = { data, execute };
