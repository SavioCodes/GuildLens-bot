/**
 * Ticket System Service - Enhanced Sales Flow
 * Professional sales experience with better conversion optimization
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
const TICKET_CATEGORY_NAME = '📞 Tickets';
const LOG_CHANNEL_ID = OFFICIAL.CHANNELS.AVISO_TICKET;

// Plan Definitions (Competitive Pricing with Promo)
const PLANS = {
    PRO: {
        name: 'PRO',
        price: 'R$ 19,90',
        originalPrice: 'R$ 49,90',
        period: '/mês',
        emoji: '⭐',
        color: 0x22D3EE, // Cyan
        discount: '60% OFF',
        benefits: [
            '✅ Membros ilimitados',
            '✅ Health Score completo',
            '✅ Insights de até 90 dias',
            '✅ Alertas avançados',
            '✅ Ações recomendadas',
            '✅ Sem watermark',
            '✅ Suporte prioritário'
        ],
        highlight: 'Mais Popular!'
    },
    GROWTH: {
        name: 'GROWTH',
        price: 'R$ 39,90',
        originalPrice: 'R$ 129,90',
        period: '/mês',
        emoji: '🚀',
        color: 0xFFD700, // Gold
        discount: '70% OFF',
        benefits: [
            '✅ Tudo do PRO',
            '✅ Até 5 servidores',
            '✅ Histórico de 365 dias',
            '✅ Exportar dados (CSV)',
            '✅ Alertas automáticos no canal',
            '✅ Suporte VIP',
            '✅ Relatórios mensais',
            '✅ Consultoria de comunidade'
        ],
        highlight: 'Melhor Custo-Benefício!'
    }
};

/**
 * Handles the "Open Ticket" button click
 */
async function handleOpenTicket(interaction) {
    const { guild, user } = interaction;

    if (guild.id !== OFFICIAL.GUILD_ID) {
        return interaction.reply({ content: 'Este sistema só funciona no servidor oficial.', ephemeral: true });
    }

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

        // Find or Create Category
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

        // ========== WELCOME MESSAGE ==========
        const welcomeEmbed = new EmbedBuilder()
            .setTitle(`🎫 Ticket de ${user.username}`)
            .setDescription(
                `Olá <@${user.id}>! Que bom ter você aqui! 🎉\n\n` +
                `**O que você precisa hoje?**`
            )
            .setColor(COLORS.PRIMARY)
            .setThumbnail(user.displayAvatarURL({ size: 128 }))
            .setTimestamp();

        // ========== PROMO BANNER ==========
        const promoEmbed = new EmbedBuilder()
            .setTitle('🔥 PROMOÇÃO DE LANÇAMENTO')
            .setDescription(
                '**Por tempo limitado!** Garanta até **70% de desconto** nos planos Premium.\n' +
                '━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
            )
            .setColor(0xFF6B6B);

        // ========== PLANS COMPARISON ==========
        const plansEmbed = new EmbedBuilder()
            .setTitle('📊 Compare os Planos')
            .setColor(COLORS.PRIMARY)
            .addFields(
                {
                    name: `${PLANS.PRO.emoji} ${PLANS.PRO.name} — ~~${PLANS.PRO.originalPrice}~~ **${PLANS.PRO.price}${PLANS.PRO.period}**`,
                    value: PLANS.PRO.benefits.join('\n') + `\n\n🏷️ *${PLANS.PRO.highlight}*`,
                    inline: true
                },
                {
                    name: `${PLANS.GROWTH.emoji} ${PLANS.GROWTH.name} — ~~${PLANS.GROWTH.originalPrice}~~ **${PLANS.GROWTH.price}${PLANS.GROWTH.period}**`,
                    value: PLANS.GROWTH.benefits.join('\n') + `\n\n🏷️ *${PLANS.GROWTH.highlight}*`,
                    inline: true
                }
            )
            .setFooter({ text: '💳 Pagamento via PIX • Ativação instantânea' });

        // ========== BUTTONS ==========
        const planButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('select_plan_PRO')
                .setLabel(`⭐ Quero PRO (${PLANS.PRO.price})`)
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('select_plan_GROWTH')
                .setLabel(`🚀 Quero GROWTH (${PLANS.GROWTH.price})`)
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('ticket_help_only')
                .setLabel('❓ Tenho Dúvidas')
                .setStyle(ButtonStyle.Secondary)
        );

        const closeButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel('🔒 Fechar Ticket')
                .setStyle(ButtonStyle.Danger)
        );

        // Send all embeds
        await ticketChannel.send({ content: `||<@${user.id}>||` });
        await ticketChannel.send({ embeds: [welcomeEmbed, promoEmbed, plansEmbed], components: [planButtons, closeButton] });

        await interaction.editReply({ content: `✅ Ticket criado: <#${ticketChannel.id}>` });

        // ========== NOTIFY OWNER ==========
        try {
            const owner = await guild.client.users.fetch(OFFICIAL.OWNER_ID);
            await owner.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('🎫 Novo Ticket!')
                        .setDescription(`**${user.tag}** abriu um ticket.\n<#${ticketChannel.id}>`)
                        .setColor(COLORS.PRIMARY)
                        .setTimestamp()
                ]
            });
        } catch (e) { /* DM failed, ignore */ }

        log.success(`Ticket created: ${user.tag}`);

    } catch (error) {
        log.error('Failed to create ticket', error);
        await interaction.editReply({ content: '❌ Erro ao criar ticket. Tente novamente.' });
    }
}

/**
 * Handles plan selection with enhanced experience
 */
async function handlePlanSelection(interaction, planKey) {
    const plan = PLANS[planKey];
    if (!plan) return;

    const PIX_KEY = process.env.PIX_KEY || 'NÃO CONFIGURADA';
    const PIX_NAME = process.env.PIX_NAME || 'Sávio Brito';
    const PIX_TYPE = process.env.PIX_TYPE || 'Chave Aleatória';

    // ========== CONFIRMATION EMBED ==========
    const confirmEmbed = new EmbedBuilder()
        .setTitle(`${plan.emoji} Excelente Escolha!`)
        .setDescription(
            `Você escolheu o plano **${plan.name}**!\n\n` +
            `**💰 Valor:** ~~${plan.originalPrice}~~ → **${plan.price}${plan.period}**\n` +
            `**🏷️ Desconto:** ${plan.discount}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
        )
        .setColor(plan.color);

    // ========== PIX DETAILS ==========
    const pixEmbed = new EmbedBuilder()
        .setTitle('💳 Dados para Pagamento (PIX)')
        .setDescription(
            `**${PIX_TYPE}:**\n` +
            `\`\`\`${PIX_KEY}\`\`\`\n` +
            `**👤 Nome:** ${PIX_NAME}\n` +
            `**💵 Valor:** ${plan.price.replace('/mês', '')}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
        )
        .setColor(0x22C55E);

    // ========== INSTRUCTIONS ==========
    const instructionsEmbed = new EmbedBuilder()
        .setTitle('📋 Próximos Passos')
        .setDescription(
            '**1.** Copie a chave PIX acima\n' +
            '**2.** Faça o pagamento no seu banco\n' +
            '**3.** Envie o **comprovante** aqui neste canal\n' +
            '**4.** Aguarde a ativação (geralmente em minutos!)\n\n' +
            '⏳ **A equipe já foi notificada e vai responder em breve!**'
        )
        .setColor(COLORS.PRIMARY)
        .setFooter({ text: 'GuildLens • Pagamento seguro via PIX' });

    await interaction.reply({ embeds: [confirmEmbed, pixEmbed, instructionsEmbed] });

    // Ping Staff
    await interaction.channel.send({
        content: `🔔 <@&${OFFICIAL.ROLES.FOUNDER}> <@&${OFFICIAL.ROLES.STAFF}>\n` +
            `**${interaction.user.tag}** quer o plano **${plan.name}** (${plan.price})!`
    });

    // DM Owner
    try {
        const owner = await interaction.client.users.fetch(OFFICIAL.OWNER_ID);
        await owner.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle('💰 INTERESSE EM COMPRA!')
                    .setDescription(
                        `**Usuário:** ${interaction.user.tag}\n` +
                        `**Plano:** ${plan.emoji} ${plan.name}\n` +
                        `**Valor:** ${plan.price}\n` +
                        `**Canal:** <#${interaction.channel.id}>`
                    )
                    .setColor(0x22C55E)
                    .setTimestamp()
            ]
        });
    } catch (e) { /* DM failed */ }

    log.success(`${interaction.user.tag} selected ${planKey}`);
}

/**
 * Handles "Just questions" button
 */
async function handleHelpOnly(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('❓ Estamos Aqui Para Ajudar!')
        .setDescription(
            'Sem problemas! Descreva sua dúvida abaixo.\n\n' +
            '💡 **Dicas:**\n' +
            '• Seja específico sobre o problema\n' +
            '• Mencione o nome do seu servidor se necessário\n' +
            '• Envie prints se tiver erros\n\n' +
            '⏳ A Staff responderá em breve!'
        )
        .setColor(COLORS.INFO);

    await interaction.reply({ embeds: [embed] });
}

/**
 * Handles ticket close
 */
async function handleCloseTicket(interaction) {
    const { channel, user, guild } = interaction;

    if (!channel.name.startsWith('ticket-')) {
        return interaction.reply({ content: 'Este comando só funciona em tickets.', ephemeral: true });
    }

    try {
        const confirmEmbed = new EmbedBuilder()
            .setTitle('🔒 Fechando Ticket...')
            .setDescription('Este canal será deletado em 5 segundos.')
            .setColor(COLORS.WARNING);

        await interaction.reply({ embeds: [confirmEmbed] });

        // Log
        const logsChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
        if (logsChannel) {
            logsChannel.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('🎫 Ticket Fechado')
                        .setDescription(`**Canal:** ${channel.name}\n**Por:** ${user.tag}`)
                        .setColor(COLORS.WARNING)
                        .setTimestamp()
                ]
            });
        }

        setTimeout(() => {
            channel.delete().catch(e => log.error('Failed to delete ticket', e));
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
