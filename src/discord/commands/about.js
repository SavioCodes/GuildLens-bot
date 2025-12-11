// FILE: src/discord/commands/about.js
// Slash command: /guildlens-about

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { info, safeReply } = require('../../utils/commandUtils');
const OFFICIAL = require('../../utils/official');

const data = new SlashCommandBuilder()
    .setName('guildlens-about')
    .setDescription('Informações sobre o GuildLens')
    .setDMPermission(false);

async function execute(interaction) {
    const embed = info('GuildLens',
        'Bot de analytics para servidores Discord.\n\n' +
        '**Recursos:**\n' +
        '• Health Score — Saúde do servidor\n' +
        '• Insights — Análise de atividade\n' +
        '• Alertas — Notificações automáticas\n' +
        '• Exportação — Dados em CSV/JSON\n\n' +
        `**Versão:** 1.0.0\n` +
        `**Servidores:** ${interaction.client.guilds.cache.size}`
    )
        .setThumbnail(interaction.client.user.displayAvatarURL({ size: 128 }))
        .setFooter({ text: 'Desenvolvido por Sávio Brito' });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setLabel('Servidor Oficial')
                .setStyle(ButtonStyle.Link)
                .setURL(OFFICIAL.LINKS.SERVER),
            new ButtonBuilder()
                .setLabel('Adicionar Bot')
                .setStyle(ButtonStyle.Link)
                .setURL(`https://discord.com/oauth2/authorize?client_id=${interaction.client.user.id}&permissions=8&scope=bot%20applications.commands`)
        );

    await safeReply(interaction, { embeds: [embed], components: [row] });
}

module.exports = { data, execute };
