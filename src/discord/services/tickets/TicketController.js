/**
 * Ticket Controller
 * Main entry point for all ticket interactions.
 * Orchestrates calls to State, Views, and Recovery.
 */

const { ChannelType, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const logger = require('../../../utils/logger');
const TicketState = require('./TicketState');
const TicketViews = require('./TicketViews');
const TicketRecovery = require('./TicketRecovery');

const CONSTANTS = require('../../../config/constants');
const DISCORD_IDS = require('../../../config/discordIds');
const PIX = require('../../../config/pix');
const { PLANS } = require('../../../config/plans');
const { isHighRole } = require('../../../utils/official'); // Importing from official (compatibility) or we could impl helper

const log = logger.child('TicketController');

const TicketController = {

    /**
     * Create a new ticket
     */
    async createTicket(interaction) {
        const { guild, user } = interaction;

        // 1. Abuse Check
        const existingTicket = TicketState.existsForUser(user.id);
        if (existingTicket) {
            const channel = guild.channels.cache.get(existingTicket.channelId);
            if (channel) {
                return interaction.reply({
                    content: `❌ **Você já tem um ticket aberto!**\nUse: <#${channel.id}>`,
                    ephemeral: true
                });
            } else {
                TicketState.delete(existingTicket.channelId); // Clean stale
            }
        }

        try {
            await interaction.deferReply({ ephemeral: true });

            // Name & Category
            const cleanUsername = user.username.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 20);
            const channelName = `ticket-${cleanUsername}`;

            let category = guild.channels.cache.find(c => c.name === CONSTANTS.TICKETS.CATEGORY_NAME && c.type === ChannelType.GuildCategory);

            if (!category) {
                category = await guild.channels.create({
                    name: CONSTANTS.TICKETS.CATEGORY_NAME,
                    type: ChannelType.GuildCategory,
                    permissionOverwrites: [
                        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: DISCORD_IDS.ROLES.STAFF, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.SendMessages] },
                        { id: DISCORD_IDS.ROLES.FOUNDER, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.SendMessages] },
                        { id: interaction.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.SendMessages] }
                    ]
                });
            }

            // Create Channel
            const ticketChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: category.id,
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                    { id: DISCORD_IDS.ROLES.STAFF, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.SendMessages] },
                    { id: DISCORD_IDS.ROLES.FOUNDER, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.SendMessages] },
                    { id: interaction.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.SendMessages] }
                ]
            });

            // Initialize State
            TicketState.set(ticketChannel.id, {
                channelId: ticketChannel.id,
                userId: user.id,
                type: 'SELECTION',
                state: 'INITIAL_SELECTION',
                createdAt: Date.now(),
                plan: null
            });

            // Render
            await TicketViews.renderPanel(ticketChannel);
            const welcomeMsg = TicketViews.welcomeEmbed(user);
            await ticketChannel.send({ content: `||<@${user.id}>||`, ...welcomeMsg });

            await interaction.editReply({ content: `✅ Ticket criado: <#${ticketChannel.id}>` });
            log.success(`Ticket created for ${user.tag}`);

        } catch (error) {
            log.error('Failed to create ticket', error);
            await interaction.editReply('❌ Erro ao criar ticket.');
        }
    },

    /**
     * Handle Selections (Support/Sales)
     */
    async handleSelection(interaction, type) {
        let ticket = TicketState.get(interaction.channel.id);
        if (!ticket) ticket = await TicketRecovery.recover(interaction.channel);
        if (!ticket) return interaction.reply({ content: '❌ Erro de estado. Reabra o ticket.', ephemeral: true });

        if (type === 'SUPPORT') {
            ticket.type = 'SUPPORT';
            ticket.state = TicketState.STATES.OPEN_SUPPORT;
            TicketState.set(interaction.channel.id, ticket);
            await TicketViews.renderPanel(interaction.channel);

            const view = TicketViews.supportEmbed();
            await interaction.update(view);

            _notifyStaff(interaction.guild, '🛠️ Novo Suporte', `<@${interaction.user.id}> precisa de ajuda!`, interaction.channel.id);

        } else if (type === 'SALES') {
            ticket.type = 'SALES';
            ticket.state = TicketState.STATES.OPEN_SALES_SELECT_PLAN;
            TicketState.set(interaction.channel.id, ticket);
            await TicketViews.renderPanel(interaction.channel);

            const view = TicketViews.salesEmbed();
            await interaction.update(view);
        }
    },

    /**
     * Handle Plan Selection
     */
    async handlePlanSelection(interaction, planKey) {
        const plan = PLANS[planKey];
        if (!plan) return;

        let ticket = TicketState.get(interaction.channel.id);
        if (!ticket) ticket = await TicketRecovery.recover(interaction.channel);

        if (ticket) {
            ticket.plan = planKey;
            ticket.state = TicketState.STATES.WAITING_PAYMENT_PROOF;
            TicketState.set(interaction.channel.id, ticket);
            await TicketViews.renderPanel(interaction.channel);
        }

        const pixInfo = PIX.getKey();
        const view = TicketViews.paymentEmbed(plan, pixInfo);
        await interaction.update(view);
    },

    /**
     * Back to Menu
     */
    async resetToMenu(interaction) {
        let ticket = TicketState.get(interaction.channel.id);
        if (ticket) {
            ticket.state = 'INITIAL_SELECTION';
            ticket.type = 'SELECTION';
            ticket.plan = null;
            TicketState.set(interaction.channel.id, ticket);
            await TicketViews.renderPanel(interaction.channel);
        }

        const view = TicketViews.welcomeEmbed(interaction.user);
        // interaction.update expects updates to EXISTING message components/embeds
        // Welcome embed in View usually returns content + embeds + components
        // But here we are updating the message that triggered the button
        await interaction.update({ embeds: view.embeds, components: view.components });
    },

    /**
     * Handle Message (Proof Detection)
     */
    async handleMessage(message) {
        if (message.author.bot) return;
        if (!message.channel.name?.startsWith('ticket-')) return;

        let ticket = TicketState.get(message.channel.id);
        if (!ticket) ticket = await TicketRecovery.recover(message.channel);
        if (!ticket) return;

        const isWaitingProof = ticket.state === TicketState.STATES.WAITING_PAYMENT_PROOF;
        const hasAttachment = message.attachments.size > 0;

        if (hasAttachment && isWaitingProof) {
            ticket.state = TicketState.STATES.WAITING_STAFF_APPROVAL;
            TicketState.set(message.channel.id, ticket);
            await TicketViews.renderPanel(message.channel);

            const embed = new EmbedBuilder()
                .setTitle('📸 Comprovante Identificado')
                .setDescription('Aguarde a aprovação da staff.')
                .setColor(CONSTANTS.COLORS.WARNING);

            await message.channel.send({ embeds: [embed] });
            _notifyStaff(message.guild, '💰 Comprovante Enviado', `Verifique <#${message.channel.id}>`, message.channel.id);
        }
    },

    /**
     * Staff Actions (Approve/Reject)
     */
    async handleStaffAction(interaction, action) {
        // Permission Check
        if (!isHighRole(interaction.member)) {
            return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
        }

        let ticket = TicketState.get(interaction.channel.id);
        // Recovery trigger on button click
        if (!ticket) {
            ticket = await TicketRecovery.recover(interaction.channel);
            // Force state if recovered to allow action
            if (ticket) {
                ticket.state = TicketState.STATES.WAITING_STAFF_APPROVAL;
            }
        }

        if (!ticket || ticket.state !== TicketState.STATES.WAITING_STAFF_APPROVAL) {
            return interaction.reply({ content: '⚠️ Estado inválido para esta ação.', ephemeral: true });
        }

        if (action === 'APPROVE') {
            ticket.state = TicketState.STATES.APPROVED_ONBOARDING_SENT;
            TicketState.set(interaction.channel.id, ticket);
            await TicketViews.renderPanel(interaction.channel);

            const view = TicketViews.approvedEmbed();
            await interaction.reply({ embeds: [view] });
            log.success(`Payment approved by ${interaction.user.tag}`);

        } else if (action === 'REJECT') {
            ticket.state = TicketState.STATES.REJECTED;
            TicketState.set(interaction.channel.id, ticket);
            await TicketViews.renderPanel(interaction.channel);

            const view = TicketViews.rejectedEmbed();
            await interaction.reply({ embeds: [view] });
            log.info(`Payment rejected by ${interaction.user.tag}`);
        }
    },

    /**
     * Close Ticket
     */
    async closeTicket(interaction) {
        const { channel } = interaction;
        if (!channel.name.startsWith('ticket-')) return;

        await interaction.reply('🔒 Fechando ticket...');

        try {
            const ticket = TicketState.get(channel.id);
            if (ticket) {
                ticket.state = TicketState.STATES.CLOSED;
                TicketState.delete(channel.id);
            }

            // Transcript
            const messages = await channel.messages.fetch({ limit: 50 });
            const transcript = messages.reverse().map(m => `[${m.createdAt.toISOString()}] ${m.author.tag}: ${m.content}`).join('\n');
            const buffer = Buffer.from(transcript, 'utf-8');
            const attachment = new AttachmentBuilder(buffer, { name: `transcript-${channel.name}.txt` });

            const logChannel = interaction.guild.channels.cache.get(DISCORD_IDS.CHANNELS.LOG_TICKET);
            if (logChannel) {
                const logEmbed = TicketViews.logEmbed('🔴 Ticket Fechado', `Fechado por ${interaction.user.tag}`, channel.name);
                await logChannel.send({ embeds: [logEmbed], files: [attachment] });
            }

            setTimeout(() => channel.delete().catch(() => { }), CONSTANTS.TICKETS.CLOSE_DELAY_MS);

        } catch (e) {
            log.error('Error closing ticket', e);
        }
    },

    /**
     * Auto Clean Stale
     */
    async cleanStaleTickets(guild) {
        log.info('Checking for stale tickets...');
        const now = Date.now();
        const allTickets = TicketState.getAll();

        for (const [channelId, data] of allTickets) {
            if (data.state !== TicketState.STATES.CLOSED && (now - data.createdAt > CONSTANTS.TICKETS.STALE_THRESHOLD_MS)) {
                const channel = guild.channels.cache.get(channelId);
                if (channel) {
                    try {
                        await channel.send('🔒 **Fechado automaticamente por inatividade.**');
                        data.state = TicketState.STATES.CLOSED;
                        TicketState.delete(channelId);

                        setTimeout(() => channel.delete().catch(() => { }), CONSTANTS.TICKETS.CLOSE_DELAY_MS);
                        log.info(`Auto-closed stale ticket: ${channel.name}`);
                    } catch (e) {
                        log.error(`Failed to auto-close ${channelId}`, e);
                    }
                } else {
                    TicketState.delete(channelId);
                }
            }
        }
    }
};

// Internal Helper
function _notifyStaff(guild, title, desc, channelId) {
    const channel = guild.channels.cache.get(DISCORD_IDS.CHANNELS.LOG_TICKET);
    if (channel) {
        const embed = TicketViews.logEmbed(title, desc, channelId);
        channel.send({ embeds: [embed] }).catch(() => { });
    }
}

module.exports = TicketController;
