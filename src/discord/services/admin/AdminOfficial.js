/**
 * Admin Official Service
 * Handles Official Server specific tasks (Permissions, Content Sync, Ticket Panel).
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { enforceOfficialPermissions, updateOfficialStats } = require('../../handlers/officialServer');
const OFFICIAL = require('../../../utils/official');
const { COLORS, EMOJI } = require('../../../utils/embeds');
const logger = require('../../../utils/logger');

const log = logger.child('AdminOfficial');

const AdminOfficial = {
    async fixPermissions(interaction) {
        if (interaction.guildId !== OFFICIAL.GUILD_ID) {
            return interaction.reply({ content: '❌ Este comando só funciona no Servidor Oficial.', flags: 64 });
        }

        await interaction.deferReply({ flags: 64 });

        try {
            await enforceOfficialPermissions(interaction.guild);
            await updateOfficialStats(interaction.guild);

            await interaction.editReply({ content: `${EMOJI.CHECK} Permissões aplicadas e stats atualizados!` });
            log.success(`Permissions fixed by ${interaction.user.tag}`);
        } catch (error) {
            await interaction.editReply({ content: `❌ Falha: ${error.message}` });
        }
    },

    async setupTickets(interaction) {
        if (interaction.guildId !== OFFICIAL.GUILD_ID) return interaction.reply({ content: '❌ Apenas oficial.', flags: 64 });

        const channelId = OFFICIAL.CHANNELS.CRIAR_TICKET;
        const channel = interaction.guild.channels.cache.get(channelId);

        if (!channel) return interaction.reply({ content: `❌ Canal de tickets não encontrado (${channelId}).`, flags: 64 });

        await interaction.deferReply({ flags: 64 });

        try {
            const embed = new EmbedBuilder()
                .setTitle('📞 Central de Suporte')
                .setDescription(
                    'Precisa de ajuda ou quer ativar seu VIP?\n\n' +
                    '**Como funciona:**\n' +
                    '1️⃣ Clique no botão abaixo para abrir um ticket.\n' +
                    '2️⃣ Um canal privado será criado para você.\n' +
                    '3️⃣ Envie sua dúvida ou comprovante do PIX.\n\n' +
                    '⚠️ **Atenção:** Abra apenas um ticket por vez.'
                )
                .setColor(COLORS.PRIMARY)
                .setFooter({ text: 'Equipe GuildLens', iconURL: interaction.guild.iconURL() })
                // .setImage('placeholder') // Removed request for safety/simplicity
                ;

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('open_ticket').setLabel('Abrir Ticket').setStyle(ButtonStyle.Success).setEmoji('📩')
            );

            await channel.send({ embeds: [embed], components: [row] });
            await interaction.editReply({ content: `✅ Painel enviado para <#${channelId}>.` });

        } catch (error) {
            log.error('Failed to deploy ticket panel', error);
            await interaction.editReply({ content: '❌ Erro ao enviar painel.' });
        }
    },

    async refreshContent(interaction) {
        // This requires contentManager.js
        // To avoid circular dependency hell, we can accept client or just dynamic require
        // Actually contentManager was just created and is in services.
        const contentManager = require('../../services/contentManager'); // Adjust path
        // Path is src/discord/services/contentManager.js
        // AdminOfficial is src/discord/services/admin/AdminOfficial.js
        // So ../contentManager

        if (interaction.guildId !== OFFICIAL.GUILD_ID) return interaction.reply({ content: '❌ Apenas oficial.', flags: 64 });

        const choice = interaction.options.getString('canal');
        await interaction.deferReply({ ephemeral: true });

        try {
            await contentManager.initializeContent(interaction.client);
            // initializeContent does Como Usar + FAQ. 
            // The original admin logic manually cleared channels. 
            // contentManager is smarter (upserts).
            // Let's rely on contentManager to simplify.

            await interaction.editReply(`✅ Conteúdo atualizado (Modo Inteligente via contentManager).`);

        } catch (e) {
            await interaction.editReply(`❌ Erro: ${e.message}`);
        }
    }
};

module.exports = AdminOfficial;
