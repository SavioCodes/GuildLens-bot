/**
 * Ticket System Service
 * Handles creation and management of support tickets
 */

const {
    ChannelType,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const OFFICIAL = require('../../utils/official');
const logger = require('../../utils/logger');
const { COLORS } = require('../../utils/embeds');

const log = logger.child('TicketHandler');

// CONSTANTS
const TICKET_CATEGORY_NAME = '📞 Suporte';
const LOG_CHANNEL_ID = OFFICIAL.CHANNELS.LOGS_SECRET;

/**
 * Handles the "Open Ticket" button click
 * @param {ButtonInteraction} interaction 
 */
async function handleOpenTicket(interaction) {
    const { guild, user, member } = interaction;

    if (guild.id !== OFFICIAL.GUILD_ID) {
        return interaction.reply({ content: 'Este sistema só funciona no servidor oficial.', ephemeral: true });
    }

    // Check for existing ticket
    // Simplest way: Check channel names starting with ticket-username (clean)
    // Or just let them open multiple? Better to limit.
    const cleanUsername = user.username.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const channelName = `ticket-${cleanUsername}`;

    // Check if channel exists
    const existingChannel = guild.channels.cache.find(c => c.name === channelName);
    if (existingChannel) {
        return interaction.reply({
            content: `❌ Você já tem um ticket aberto: <#${existingChannel.id}>`,
            ephemeral: true
        });
    }

    try {
        await interaction.deferReply({ ephemeral: true });

        // Find or Create Category
        let category = guild.channels.cache.get(OFFICIAL.CHANNELS.AVISOS)?.parent; // Fallback helper
        // Ideally we should have a specific category ID but user didn't give one.
        // We can create one or put below "Criar Ticket". 
        // Let's create specific parent if not exists?
        // Actually, let's just make it private. Categorization is secondary.
        // Better: Find "Suporte" category request? No, I'll search by name or create.

        let parentCategory = guild.channels.cache.find(c => c.name === TICKET_CATEGORY_NAME && c.type === ChannelType.GuildCategory);
        if (!parentCategory) {
            parentCategory = await guild.channels.create({
                name: TICKET_CATEGORY_NAME,
                type: ChannelType.GuildCategory,
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: OFFICIAL.ROLES.STAFF, allow: [PermissionFlagsBits.ViewChannel] }
                ]
            });
        }

        // Create Channel
        const ticketChannel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: parentCategory.id,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: user.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles]
                },
                {
                    id: OFFICIAL.ROLES.STAFF,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages]
                },
                {
                    id: guild.client.user.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels]
                }
            ]
        });

        // Send Initial Message
        const embed = new EmbedBuilder()
            .setTitle(`🎫 Ticket de ${user.username}`)
            .setDescription(
                `Olá <@${user.id}>!\n\n` +
                `Descreva seu problema ou dúvida aqui.\n` +
                `Se for sobre **Pagamento**, envie o comprovante do PIX.\n\n` +
                `A Staff responderá em breve. ⏳`
            )
            .setColor(COLORS.SUCCESS)
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel('Fechar Ticket')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔒')
        );

        await ticketChannel.send({
            content: `||<@${user.id}> <@&${OFFICIAL.ROLES.STAFF}>||`,
            embeds: [embed],
            components: [row]
        });

        await interaction.editReply({ content: `✅ Ticket criado com sucesso: <#${ticketChannel.id}>` });

        log.info(`Ticket created for ${user.tag} (${ticketChannel.id})`);

    } catch (error) {
        log.error('Failed to create ticket', 'TicketHandler', error);
        await interaction.editReply({ content: '❌ Erro ao criar ticket. Tente novamente ou chame um admin.' });
    }
}

/**
 * Handles the "Close Ticket" button click
 * @param {ButtonInteraction} interaction 
 */
async function handleCloseTicket(interaction) {
    const { channel, user } = interaction;

    // Verify channel name
    if (!channel.name.startsWith('ticket-')) {
        return interaction.reply({ content: 'Este comando só funciona em canais de ticket.', ephemeral: true });
    }

    try {
        await interaction.reply({ content: '🔒 Ticket será fechado em 5 segundos...' });

        // Log close
        const logsChannel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
        if (logsChannel) {
            logsChannel.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('🎫 Ticket Fechado')
                        .setDescription(`**Canal:** ${channel.name}\n**Fechado por:** ${user.tag}`)
                        .setColor(COLORS.WARNING)
                        .setTimestamp()
                ]
            });
        }

        setTimeout(() => {
            channel.delete().catch(err => log.error('Failed to delete ticket', 'TicketHandler', err));
        }, 5000);

    } catch (error) {
        log.error('Error closing ticket', 'TicketHandler', error);
    }
}

module.exports = {
    handleOpenTicket,
    handleCloseTicket
};
