// FILE: src/discord/commands/help.js
// Slash command: /guildlens-help - Complete command reference

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { safeReply } = require('../../utils/commandUtils');
const { COLORS } = require('../../config/constants');
const OFFICIAL = require('../../utils/official');

const data = new SlashCommandBuilder()
    .setName('guildlens-help')
    .setDescription('📖 Ver todos os comandos disponíveis')
    .setDMPermission(false);

async function execute(interaction) {
    const embed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle('📖 Comandos do GuildLens')
        .setDescription('Lista completa de comandos disponíveis para análise do seu servidor.')
        .addFields(
            {
                name: '📊 Análise',
                value: [
                    '`/guildlens-health` — Nota de saúde (0-100)',
                    '`/guildlens-insights` — Tendências e padrões',
                    '`/guildlens-stats` — Estatísticas gerais',
                    '`/guildlens-leaderboard` — Ranking de membros'
                ].join('\n'),
                inline: false
            },
            {
                name: '🔔 Monitoramento',
                value: [
                    '`/guildlens-alerts` — Configurar alertas',
                    '`/guildlens-actions` — Recomendações de ações',
                    '`/guildlens-community` — Análise da comunidade'
                ].join('\n'),
                inline: false
            },
            {
                name: '⚙️ Configuração',
                value: [
                    '`/guildlens-setup` — Configurar o bot',
                    '`/guildlens-export` — Exportar dados (CSV/JSON)'
                ].join('\n'),
                inline: false
            },
            {
                name: '💎 Premium',
                value: [
                    '`/guildlens-premium` — Ver planos e preços',
                    '`/guildlens-about` — Sobre o bot'
                ].join('\n'),
                inline: false
            }
        )
        .setFooter({ text: 'GuildLens • Use /guildlens-premium para ver benefícios' })
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setLabel('📚 Servidor de Suporte')
                .setStyle(ButtonStyle.Link)
                .setURL(OFFICIAL.LINKS.SERVER),
            new ButtonBuilder()
                .setLabel('➕ Adicionar Bot')
                .setStyle(ButtonStyle.Link)
                .setURL(`https://discord.com/oauth2/authorize?client_id=${interaction.client.user.id}&permissions=8&scope=bot%20applications.commands`)
        );

    await safeReply(interaction, { embeds: [embed], components: [row] });
}

module.exports = { data, execute };
