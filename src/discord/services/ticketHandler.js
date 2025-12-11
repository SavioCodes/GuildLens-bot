/**
 * Ticket System Service - Smart Sales with Transcript
 * Professional sales experience with conversation logging and AI autonomy
 */

const {
    ChannelType,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    AttachmentBuilder
} = require('discord.js');
const OFFICIAL = require('../../utils/official');
const logger = require('../../utils/logger');
const { COLORS } = require('../../utils/embeds');

const log = logger.child('TicketHandler');

// CONSTANTS
const TICKET_CATEGORY_NAME = '📞 Tickets';
const LOG_CHANNEL_ID = OFFICIAL.CHANNELS.AVISO_TICKET;
const FOLLOW_UP_DELAY = 10 * 60 * 1000; // 10 minutes

// Active tickets tracking for follow-ups
const activeTickets = new Map();

// Plan Definitions
const PLANS = {
    PRO: {
        name: 'PRO',
        price: 'R$ 19,90',
        originalPrice: 'R$ 49,90',
        period: '/mês',
        emoji: '⭐',
        color: 0x22D3EE,
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
        color: 0xFFD700,
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

// Common questions and auto-responses
const AUTO_RESPONSES = {
    patterns: [
        {
            keywords: ['funciona', 'como funciona', 'o que faz', 'pra que serve'],
            response: '**Como o GuildLens funciona?**\n\n' +
                '🔍 O bot analisa as atividades do seu servidor e gera métricas como:\n' +
                '• Health Score (saúde da comunidade)\n' +
                '• Insights de engajamento\n' +
                '• Alertas de quedas ou problemas\n' +
                '• Ações recomendadas para crescer\n\n' +
                'Quer conhecer os planos? Clique nos botões acima! 👆'
        },
        {
            keywords: ['demora', 'quanto tempo', 'ativação', 'ativa'],
            response: '⚡ **Ativação Rápida!**\n\n' +
                'Após enviar o comprovante, a ativação é feita em **minutos**!\n' +
                'Em horário comercial, geralmente em menos de 30 min.'
        },
        {
            keywords: ['seguro', 'confiável', 'golpe', 'confia'],
            response: '🔒 **100% Seguro!**\n\n' +
                '• Pagamento via PIX (transferência instantânea)\n' +
                '• Ativação manual pela equipe\n' +
                '• Suporte direto no Discord\n' +
                '• Bot verificado ativo em dezenas de servidores'
        },
        {
            keywords: ['pix', 'chave', 'pagamento', 'pagar'],
            response: '💳 **Pronto para Pagar?**\n\n' +
                'Escolha seu plano clicando nos botões acima e você receberá a chave PIX automaticamente!\n' +
                '👆 Clique em **⭐ PRO** ou **🚀 GROWTH**'
        }
    ]
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

        await ticketChannel.send({ content: `||<@${user.id}>||` });
        await ticketChannel.send({ embeds: [welcomeEmbed, promoEmbed, plansEmbed], components: [planButtons, closeButton] });

        await interaction.editReply({ content: `✅ Ticket criado: <#${ticketChannel.id}>` });

        // Track for follow-up
        activeTickets.set(ticketChannel.id, {
            userId: user.id,
            createdAt: Date.now(),
            planSelected: false,
            reminded: false
        });

        // Schedule follow-up
        scheduleFollowUp(ticketChannel, user);

        // Notify Owner
        notifyOwner(guild.client, 'Ticket', `**${user.tag}** abriu um ticket.`, ticketChannel.id);

        log.success(`Ticket created: ${user.tag}`);

    } catch (error) {
        log.error('Failed to create ticket', error);
        await interaction.editReply({ content: '❌ Erro ao criar ticket. Tente novamente.' });
    }
}

/**
 * Schedule a follow-up message if user doesn't select a plan
 */
function scheduleFollowUp(channel, user) {
    setTimeout(async () => {
        const ticketData = activeTickets.get(channel.id);
        if (!ticketData || ticketData.planSelected || ticketData.reminded) return;

        try {
            ticketData.reminded = true;

            const reminderEmbed = new EmbedBuilder()
                .setTitle('👋 Ainda está por aí?')
                .setDescription(
                    `Oi <@${user.id}>! Vi que você ainda não escolheu um plano.\n\n` +
                    `🤔 **Tem alguma dúvida?** Pode perguntar!\n` +
                    `💡 Lembre-se: a promoção de **70% OFF** é por tempo limitado.\n\n` +
                    `Clique em um dos botões acima para continuar! 👆`
                )
                .setColor(0xFB923C);

            await channel.send({ embeds: [reminderEmbed] });
        } catch (e) {
            // Channel might have been deleted
        }
    }, FOLLOW_UP_DELAY);
}

/**
 * Handles plan selection
 */
async function handlePlanSelection(interaction, planKey) {
    const plan = PLANS[planKey];
    if (!plan) return;

    // Mark as plan selected
    const ticketData = activeTickets.get(interaction.channel.id);
    if (ticketData) ticketData.planSelected = true;

    const PIX_KEY = process.env.PIX_KEY || 'NÃO CONFIGURADA';
    const PIX_NAME = process.env.PIX_NAME || 'Sávio Brito';
    const PIX_TYPE = process.env.PIX_TYPE || 'Chave Aleatória';

    const confirmEmbed = new EmbedBuilder()
        .setTitle(`${plan.emoji} Excelente Escolha!`)
        .setDescription(
            `Você escolheu o plano **${plan.name}**!\n\n` +
            `**💰 Valor:** ~~${plan.originalPrice}~~ → **${plan.price}${plan.period}**\n` +
            `**🏷️ Desconto:** ${plan.discount}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
        )
        .setColor(plan.color);

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

    const instructionsEmbed = new EmbedBuilder()
        .setTitle('📋 Próximos Passos')
        .setDescription(
            '**1.** Copie a chave PIX acima\n' +
            '**2.** Faça o pagamento no seu banco\n' +
            '**3.** Envie o **comprovante** (foto/print) aqui\n' +
            '**4.** Aguarde a ativação (geralmente em minutos!)\n\n' +
            '⏳ **A equipe já foi notificada!**'
        )
        .setColor(COLORS.PRIMARY)
        .setFooter({ text: 'GuildLens • Pagamento seguro via PIX' });

    await interaction.reply({ embeds: [confirmEmbed, pixEmbed, instructionsEmbed] });

    // Ping Staff
    await interaction.channel.send({
        content: `🔔 <@&${OFFICIAL.ROLES.FOUNDER}> <@&${OFFICIAL.ROLES.STAFF}>\n` +
            `**${interaction.user.tag}** quer o plano **${plan.name}** (${plan.price})!`
    });

    // Notify Owner
    notifyOwner(interaction.client, 'VENDA',
        `**${interaction.user.tag}** quer o plano **${plan.name}** (${plan.price})`,
        interaction.channel.id);

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
            '• Mencione o nome do seu servidor\n' +
            '• Envie prints se tiver erros\n\n' +
            '🤖 *Eu também respondo perguntas comuns automaticamente!*'
        )
        .setColor(COLORS.INFO);

    await interaction.reply({ embeds: [embed] });
}

/**
 * Check for auto-responses based on message content
 */
function checkAutoResponse(content) {
    const lowerContent = content.toLowerCase();

    for (const pattern of AUTO_RESPONSES.patterns) {
        for (const keyword of pattern.keywords) {
            if (lowerContent.includes(keyword)) {
                return pattern.response;
            }
        }
    }
    return null;
}

/**
 * Detect if message contains payment proof (image/attachment)
 */
function detectPaymentProof(message) {
    const hasAttachment = message.attachments.size > 0;
    const hasImage = message.attachments.some(a =>
        a.contentType?.startsWith('image/') ||
        a.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
    );
    const mentionsPayment = message.content.toLowerCase().match(/(comprovante|pix|pagamento|paguei|transferi)/);

    return hasImage || (hasAttachment && mentionsPayment);
}

/**
 * Handle messages in ticket channels (smart responses)
 */
async function handleTicketMessage(message) {
    if (message.author.bot) return;
    if (!message.channel.name?.startsWith('ticket-')) return;
    if (message.guild?.id !== OFFICIAL.GUILD_ID) return;

    // Check for payment proof
    if (detectPaymentProof(message)) {
        const alertEmbed = new EmbedBuilder()
            .setTitle('📸 Possível Comprovante Detectado!')
            .setDescription(
                `<@${message.author.id}> enviou o que parece ser um **comprovante**!\n\n` +
                `<@&${OFFICIAL.ROLES.FOUNDER}> <@&${OFFICIAL.ROLES.STAFF}> — Verifique e ative o plano!`
            )
            .setColor(0x22C55E)
            .setTimestamp();

        await message.channel.send({ embeds: [alertEmbed] });

        // Notify owner
        notifyOwner(message.client, 'COMPROVANTE',
            `**${message.author.tag}** enviou um possível comprovante!`,
            message.channel.id);
        return;
    }

    // Check for auto-response
    const autoReply = checkAutoResponse(message.content);
    if (autoReply) {
        const embed = new EmbedBuilder()
            .setDescription(autoReply)
            .setColor(COLORS.INFO)
            .setFooter({ text: '🤖 Resposta automática' });

        await message.reply({ embeds: [embed] });
    }
}

/**
 * Handles ticket close with transcript
 */
async function handleCloseTicket(interaction) {
    const { channel, user, guild } = interaction;

    if (!channel.name.startsWith('ticket-')) {
        return interaction.reply({ content: 'Este comando só funciona em tickets.', ephemeral: true });
    }

    try {
        await interaction.reply({ content: '📄 Gerando transcrição...' });

        // Generate transcript
        const transcript = await generateTranscript(channel);

        // Send to logs channel
        const logsChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
        if (logsChannel) {
            const ticketOwner = channel.name.replace('ticket-', '');

            const logEmbed = new EmbedBuilder()
                .setTitle('🎫 Ticket Fechado')
                .setDescription(
                    `**Canal:** ${channel.name}\n` +
                    `**Fechado por:** ${user.tag}\n` +
                    `**Total de mensagens:** ${transcript.messageCount}`
                )
                .setColor(COLORS.WARNING)
                .setTimestamp();

            // Create transcript file
            const transcriptBuffer = Buffer.from(transcript.content, 'utf-8');
            const attachment = new AttachmentBuilder(transcriptBuffer, {
                name: `transcript-${channel.name}-${Date.now()}.txt`
            });

            await logsChannel.send({ embeds: [logEmbed], files: [attachment] });
        }

        // Cleanup
        activeTickets.delete(channel.id);

        await channel.send({ content: '🔒 Ticket fechado. Deletando em 10 segundos...' });

        setTimeout(() => {
            channel.delete().catch(e => log.error('Failed to delete ticket', e));
        }, 10000);

    } catch (error) {
        log.error('Error closing ticket', error);
        await interaction.followUp({ content: '❌ Erro ao fechar ticket.' });
    }
}

/**
 * Generate transcript of all messages in channel
 */
async function generateTranscript(channel) {
    let allMessages = [];
    let lastId = null;

    // Fetch all messages (up to 500)
    while (allMessages.length < 500) {
        const options = { limit: 100 };
        if (lastId) options.before = lastId;

        const messages = await channel.messages.fetch(options);
        if (messages.size === 0) break;

        allMessages = allMessages.concat([...messages.values()]);
        lastId = messages.last().id;

        if (messages.size < 100) break;
    }

    // Reverse to chronological order
    allMessages.reverse();

    // Format transcript
    const lines = [
        `========================================`,
        `TRANSCRIÇÃO DO TICKET: ${channel.name}`,
        `Data: ${new Date().toLocaleString('pt-BR')}`,
        `Total de mensagens: ${allMessages.length}`,
        `========================================`,
        ``
    ];

    for (const msg of allMessages) {
        const time = msg.createdAt.toLocaleString('pt-BR');
        const author = msg.author.tag;
        const content = msg.content || '[Sem texto]';
        const attachments = msg.attachments.size > 0
            ? `\n  📎 Anexos: ${msg.attachments.map(a => a.url).join(', ')}`
            : '';
        const embeds = msg.embeds.length > 0
            ? `\n  📋 [Embed: ${msg.embeds[0].title || 'Sem título'}]`
            : '';

        lines.push(`[${time}] ${author}:`);
        lines.push(`  ${content}${attachments}${embeds}`);
        lines.push(``);
    }

    lines.push(`========================================`);
    lines.push(`FIM DA TRANSCRIÇÃO`);
    lines.push(`========================================`);

    return {
        content: lines.join('\n'),
        messageCount: allMessages.length
    };
}

/**
 * Notify owner via DM
 */
async function notifyOwner(client, type, message, channelId) {
    try {
        const owner = await client.users.fetch(OFFICIAL.OWNER_ID);
        await owner.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle(`🔔 ${type}`)
                    .setDescription(`${message}\n<#${channelId}>`)
                    .setColor(COLORS.PRIMARY)
                    .setTimestamp()
            ]
        });
    } catch (e) { /* DM failed */ }
}

module.exports = {
    handleOpenTicket,
    handlePlanSelection,
    handleHelpOnly,
    handleCloseTicket,
    handleTicketMessage,
    PLANS
};
