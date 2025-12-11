/**
 * Ticket System Service - Sales Optimized
 * Handles ticket creation, plan selection, and private PIX delivery
 */

const {
    ChannelType,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder
} = require('discord.js');
const OFFICIAL = require('../../utils/official');
const logger = require('../../utils/logger');
const { COLORS, EMOJI } = require('../../utils/embeds');

const log = logger.child('TicketHandler');

// CONSTANTS
const TICKET_CATEGORY_NAME = '📞 Tickets';
const LOG_CHANNEL_ID = OFFICIAL.CHANNELS.AVISO_TICKET;

// Plan Definitions (Competitive Pricing)
const PLANS = {
    PRO: {
        name: '⭐ PRO',
        price: 'R$ 19,90/mês',
        emoji: '⭐',
        color: COLORS.PRIMARY,
        benefits: [
            'Membros ilimitados',
            'Health Score completo',
            'Insights de até 90 dias',
            'Alertas avançados',
            'Ações recomendadas',
            'Sem watermark'
        ]
    },
    GROWTH: {
        name: '🚀 GROWTH',
        price: 'R$ 39,90/mês',
        emoji: '🚀',
        color: COLORS.GOLD,
        benefits: [
            'Tudo do Pro',
            'Até 5 servidores',
            'Histórico de 365 dias',
            'Exportar dados (CSV)',
            'Alertas automáticos',
            'Suporte prioritário',
            'Relatórios mensais'
        ]
    }
};

/**
 * Handles the "Open Ticket" button click
 * @param {ButtonInteraction} interaction 
 */
async function handleOpenTicket(interaction) {
    const { guild, user } = interaction;

    if (guild.id !== OFFICIAL.GUILD_ID) {
        return interaction.reply({ content: 'Este sistema só funciona no servidor oficial.', ephemeral: true });
    }

    // Check for existing ticket
    const cleanUsername = user.username.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 20);
    const channelName = `ticket-${cleanUsername}`;

    const existingChannel = guild.channels.cache.find(c => c.name === channelName);
    if (existingChannel) {
        return interaction.reply({
            content: `❌ Você já tem um ticket aberto: <#${existingChannel.id}>`,
            ephemeral: true
        });
    }

    try {
        await interaction.deferReply({ ephemeral: true });

        // Find or Create Category (with proper permissions)
        let parentCategory = guild.channels.cache.find(
            c => c.name === TICKET_CATEGORY_NAME && c.type === ChannelType.GuildCategory
        );

        if (!parentCategory) {
            parentCategory = await guild.channels.create({
                name: TICKET_CATEGORY_NAME,
                type: ChannelType.GuildCategory,
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: OFFICIAL.ROLES.STAFF, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageMessages] },
                    { id: OFFICIAL.ROLES.FOUNDER, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels] },
                    { id: guild.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.SendMessages] }
                ]
            });
        }

        // Create Ticket Channel
        const ticketChannel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: parentCategory.id,
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                { id: OFFICIAL.ROLES.STAFF, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages] },
                { id: OFFICIAL.ROLES.FOUNDER, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] },
                { id: guild.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] }
            ]
        });

        // Send Welcome + Plan Selection
        const welcomeEmbed = new EmbedBuilder()
            .setTitle(`🎫 Ticket de ${user.username}`)
            .setDescription(
                `Olá <@${user.id}>! Seja bem-vindo ao suporte.\n\n` +
                `**O que você precisa hoje?**\n\n` +
                `Se você quer **comprar um plano**, escolha abaixo.\n` +
                `Se é uma **dúvida ou problema**, aguarde que a Staff já vem! ⏳`
            )
            .setColor(COLORS.PRIMARY)
            .setTimestamp();

        const planButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('select_plan_PRO')
                .setLabel('Quero o PRO (R$ 19,90)')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('⭐'),
            new ButtonBuilder()
                .setCustomId('select_plan_GROWTH')
                .setLabel('Quero o GROWTH (R$ 39,90)')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🚀'),
            new ButtonBuilder()
                .setCustomId('ticket_help_only')
                .setLabel('Só tenho dúvidas')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('❓')
        );

        const closeButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel('Fechar Ticket')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔒')
        );

        await ticketChannel.send({
            content: `||<@${user.id}> <@&${OFFICIAL.ROLES.STAFF}>||`,
            embeds: [welcomeEmbed],
            components: [planButtons, closeButton]
        });

        await interaction.editReply({ content: `✅ Ticket criado: <#${ticketChannel.id}>` });

        // Notify Owner via DM
        try {
            const owner = await guild.client.users.fetch(OFFICIAL.OWNER_ID);
            await owner.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('🎫 Novo Ticket Aberto')
                        .setDescription(`**Usuário:** ${user.tag}\n**Canal:** <#${ticketChannel.id}>`)
                        .setColor(COLORS.PRIMARY)
                        .setTimestamp()
                ]
            });
        } catch (dmErr) {
            log.warn('Failed to DM owner about new ticket');
        }

        log.info(`Ticket created for ${user.tag} (${ticketChannel.id})`);

    } catch (error) {
        log.error('Failed to create ticket', error);
        await interaction.editReply({ content: '❌ Erro ao criar ticket. Tente novamente.' });
    }
}

/**
 * Handles plan selection buttons
 * @param {ButtonInteraction} interaction 
 * @param {string} planKey - 'PRO' or 'GROWTH'
 */
async function handlePlanSelection(interaction, planKey) {
    const plan = PLANS[planKey];
    if (!plan) return;

    const PIX_KEY = process.env.PIX_KEY;
    const PIX_NAME = process.env.PIX_NAME || 'Sávio Brito';

    const embed = new EmbedBuilder()
        .setTitle(`${plan.emoji} Você escolheu: ${plan.name}`)
        .setColor(plan.color)
        .setDescription(
            `**Preço:** ${plan.price}\n\n` +
            `**Benefícios:**\n${plan.benefits.map(b => `✅ ${b}`).join('\n')}\n\n` +
            `---\n\n` +
            `**💳 Dados para Pagamento (PIX)**\n\n` +
            `📋 **Chave PIX (Aleatória):**\n\`\`\`${PIX_KEY}\`\`\`\n` +
            `👤 **Nome:** ${PIX_NAME}\n\n` +
            `---\n\n` +
            `**Próximos passos:**\n` +
            `1. Faça o PIX no valor de **${plan.price.replace('/mês', '')}**\n` +
            `2. Envie o **comprovante** aqui neste canal\n` +
            `3. Aguarde a ativação (geralmente em minutos!)\n\n` +
            `⏳ A Staff já foi notificada e responderá em breve.`
        )
        .setFooter({ text: 'GuildLens • Pagamento via PIX' })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Ping Founder and Staff
    await interaction.channel.send({
        content: `🔔 <@&${OFFICIAL.ROLES.FOUNDER}> <@&${OFFICIAL.ROLES.STAFF}> — **${interaction.user.tag}** quer o plano **${plan.name}**!`
    });

    // DM Owner
    try {
        const owner = await interaction.client.users.fetch(OFFICIAL.OWNER_ID);
        await owner.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle('💰 Interesse em Compra!')
                    .setDescription(
                        `**Usuário:** ${interaction.user.tag}\n` +
                        `**Plano:** ${plan.name} (${plan.price})\n` +
                        `**Canal:** <#${interaction.channel.id}>`
                    )
                    .setColor(COLORS.SUCCESS)
                    .setTimestamp()
            ]
        });
    } catch (err) {
        log.warn('Failed to DM owner about plan interest');
    }

    log.success(`${interaction.user.tag} selected plan ${planKey}`);
}

/**
 * Handles "Just have questions" button
 * @param {ButtonInteraction} interaction 
 */
async function handleHelpOnly(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('❓ Pronto para ajudar!')
        .setDescription(
            'Sem problemas! Descreva sua dúvida ou problema aqui.\n\n' +
            'A Staff responderá o mais rápido possível. ⏳'
        )
        .setColor(COLORS.INFO)
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

/**
 * Handles the "Close Ticket" button click
 * @param {ButtonInteraction} interaction 
 */
async function handleCloseTicket(interaction) {
    const { channel, user, guild } = interaction;

    if (!channel.name.startsWith('ticket-')) {
        return interaction.reply({ content: 'Este comando só funciona em canais de ticket.', ephemeral: true });
    }

    try {
        await interaction.reply({ content: '🔒 Ticket será fechado em 5 segundos...' });

        // Log close
        const logsChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
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
            channel.delete().catch(err => log.error('Failed to delete ticket', err));
        }, 5000);

    } catch (error) {
        log.error('Error closing ticket', error);
    }
}

module.exports = {
    handleOpenTicket,
    handlePlanSelection,
    handleHelpOnly,
    handleCloseTicket,
    PLANS
};
