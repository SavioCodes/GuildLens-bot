// FILE: src/discord/commands/help.js
// Slash command: /guildlens-help

const { SlashCommandBuilder } = require('discord.js');
const { info, safeReply } = require('../../utils/commandUtils');
const OFFICIAL = require('../../utils/official');

const data = new SlashCommandBuilder()
    .setName('guildlens-help')
    .setDescription('Lista de comandos do GuildLens')
    .setDMPermission(false);

async function execute(interaction) {
    const embed = info('Comandos GuildLens',
        '**Análise:**\n' +
        '`/guildlens-health` — Saúde do servidor\n' +
        '`/guildlens-insights` — Insights de atividade\n' +
        '`/guildlens-stats` — Estatísticas\n' +
        '`/guildlens-export` — Exportar dados\n\n' +
        '**Outros:**\n' +
        '`/guildlens-premium` — Ver planos\n' +
        '`/guildlens-about` — Sobre o bot\n' +
        '`/guildlens-alerts` — Configurar alertas\n\n' +
        `[Servidor de Suporte](${OFFICIAL.LINKS.SERVER})`
    );

    await safeReply(interaction, { embeds: [embed] });
}

module.exports = { data, execute };
