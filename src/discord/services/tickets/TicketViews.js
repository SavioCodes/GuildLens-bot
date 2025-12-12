/**
 * Ticket Views
 * Handles Embeds and UI components for tickets.
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { COLORS } = require('../../../config/constants');
const { PLANS } = require('../../../config/plans');
const DISCORD_IDS = require('../../../config/discordIds');
const TicketState = require('./TicketState');

const TicketViews = {
    renderPanel: async (channel, forceNew = false) => {
        const data = TicketState.get(channel.id);
        if (!data) return;

        const user = await channel.guild.members.fetch(data.userId).catch(() => null);
        const userTag = user ? user.user.tag : 'Desconhecido';

        const embed = new EmbedBuilder()
            .setTitle('🛡️ Painel de Controle (Staff)')
            .setColor(_getPanelColor(data.state))
            .addFields(
                { name: '👤 Usuário', value: `<@${data.userId}>\n\`${userTag}\``, inline: true },
                { name: '📌 Tipo', value: data.type || 'N/A', inline: true },
                { name: '💰 Plano', value: data.plan || '—', inline: true },
                { name: '🔥 Estado', value: `\`${data.state}\``, inline: true },
                { name: '⏳ Aberto há', value: `<t:${Math.floor(data.createdAt / 1000)}:R>`, inline: true }
            )
            .setTimestamp();

        // STAFF ACTIONS
        const row = new ActionRowBuilder();
        let hasActions = false;

        if (data.state === TicketState.STATES.WAITING_STAFF_APPROVAL) {
            row.addComponents(
                new ButtonBuilder().setCustomId('approve_payment').setLabel('✅ Aprovar').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('reject_payment').setLabel('❌ Recusar').setStyle(ButtonStyle.Danger)
            );
            hasActions = true;
        } else {
            row.addComponents(
                new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 Fechar Ticket').setStyle(ButtonStyle.Secondary)
            );
            hasActions = true;
        }

        // Attempt update or send new
        if (data.panelMessageId && !forceNew) {
            try {
                const msg = await channel.messages.fetch(data.panelMessageId);
                if (msg) {
                    await msg.edit({ embeds: [embed], components: hasActions ? [row] : [] });
                    return;
                }
            } catch (e) { /* Deleted */ }
        }

        const msg = await channel.send({ embeds: [embed], components: hasActions ? [row] : [] });
        await msg.pin().catch(() => { });

        data.panelMessageId = msg.id;
        TicketState.set(channel.id, data);
    },

    welcomeEmbed: (user) => {
        const embed = new EmbedBuilder()
            .setTitle(`🎫 Atendimento de ${user.username}`)
            .setDescription(
                `Olá <@${user.id}>! Bem-vindo ao suporte GuildLens.\n\n` +
                `**Como podemos te ajudar hoje?**\n` +
                `Selecione uma das opções abaixo para iniciarmos.`
            )
            .setColor(COLORS.PRIMARY)
            .setThumbnail(user.displayAvatarURL());

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_type_support').setLabel('🛠️ Suporte / Dúvidas').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('ticket_type_sales').setLabel('💎 Quero ser Premium').setStyle(ButtonStyle.Success).setEmoji('🚀'),
            new ButtonBuilder().setCustomId('close_ticket').setLabel('Fechar').setStyle(ButtonStyle.Danger)
        );

        return { embeds: [embed], components: [buttons] };
    },

    supportEmbed: () => {
        const embed = new EmbedBuilder()
            .setTitle('🛠️ Suporte & Dúvidas')
            .setDescription(
                '**Aguarde um atendente.**\n\n' +
                'Para agilizar, por favor:\n' +
                '• Descreva seu problema detalhadamente.\n' +
                '• Envie prints, vídeos ou IDs se necessário.\n\n' +
                '⏳ *Nossa equipe responderá o mais rápido possível (Seg-Sex, 09h-18h).*'
            )
            .setColor(COLORS.INFO);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_back_menu').setLabel('⬅️ Voltar').setStyle(ButtonStyle.Secondary)
        );

        return { embeds: [embed], components: [row] };
    },

    salesEmbed: () => {
        const promoEmbed = new EmbedBuilder()
            .setTitle('💎 Escolha o Plano Ideal')
            .setDescription('Desbloqueie todo o potencial do seu servidor com o GuildLens Premium.')
            .setColor(0xFF6B6B);

        const plansEmbed = new EmbedBuilder()
            .setColor(COLORS.PRIMARY)
            .addFields(
                {
                    name: `${PLANS.PRO.emoji} ${PLANS.PRO.name} — **R$ ${(PLANS.PRO.price).toFixed(2).replace('.', ',')}**`,
                    value: `✅ Membros: ${PLANS.PRO.limits.members}\n✅ Insights: ${PLANS.PRO.features.insights ? 'Sim' : 'Não'}\n✅ Alertas: ${PLANS.PRO.features.autoAlerts ? 'Sim' : 'Não'}`,
                    inline: true
                },
                {
                    name: `${PLANS.GROWTH.emoji} ${PLANS.GROWTH.name} — **R$ ${(PLANS.GROWTH.price).toFixed(2).replace('.', ',')}**`,
                    value: `✅ Tudo do PRO\n✅ ${PLANS.GROWTH.limits.servers} Servidores\n✅ CSV + Membros Ilimitados (Growth)`,
                    inline: true
                }
            )
            .setFooter({ text: 'Pagamento via PIX • Ativação Imediata' });

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('select_plan_PRO').setLabel(`Selecionar PRO`).setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('select_plan_GROWTH').setLabel(`Selecionar GROWTH`).setStyle(ButtonStyle.Success).setEmoji('🚀'),
            new ButtonBuilder().setCustomId('ticket_back_menu').setLabel('⬅️ Voltar').setStyle(ButtonStyle.Secondary)
        );

        return { embeds: [promoEmbed, plansEmbed], components: [buttons] };
    },

    paymentEmbed: (plan, pixInfo) => {
        const pixContent = pixInfo
            ? `**Chave PIX (${pixInfo.name}):**\n\`\`\`${pixInfo.key}\`\`\`\n**Banco:** ${pixInfo.bank}`
            : '⚠️ **ERRO:** Chave PIX não configurada.';

        const embed = new EmbedBuilder()
            .setTitle(`${plan.emoji} Plano ${plan.name} Selecionado`)
            .setDescription(
                `Você escolheu o plano **${plan.name}** por **${plan.priceDisplay}**.\n\n` +
                `**👇 PRÓXIMO PASSO:**\n` +
                `1. Faça o pagamento usando os dados abaixo.\n` +
                `2. **Envie o COMPROVANTE (print)** aqui neste chat.\n\n` +
                pixContent
            )
            .setColor(COLORS.PRIMARY) // Generic color as plan color not in config yet, safe default
            .setFooter({ text: 'Aguardando comprovante...' });

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_back_menu').setLabel('⬅️ Escolher Outro Plano').setStyle(ButtonStyle.Secondary)
        );

        return { embeds: [embed], components: [buttons] };
    },

    logEmbed: (title, description, channelId) => {
        return new EmbedBuilder()
            .setTitle(title)
            .setDescription(`${description}\n<#${channelId}>`)
            .setColor(COLORS.WARNING)
            .setTimestamp();
    },

    approvedEmbed: () => {
        return new EmbedBuilder()
            .setTitle('🎉 Pagamento Aprovado!')
            .setDescription(
                `Bem-vindo(a) ao **GuildLens Premium**! 🚀\n` +
                `Seu acesso foi liberado com sucesso.\n\n` +
                `**👇 GUIA RÁPIDO:**\n` +
                `1. **Adicione o Bot:** [Clique Aqui](${DISCORD_IDS.LINKS.INVITE})\n` +
                `2. **Configure:** Use \`/guildlens-setup\` no seu servidor.\n` +
                `3. **Aproveite:** Use \`/guildlens-insights\` para ver dados.\n\n` +
                `⭐ **Gostou?** Deixe uma avaliação em <#${DISCORD_IDS.CHANNELS.AVALIACOES}>!`
            )
            .setColor(COLORS.SUCCESS);
    },

    rejectedEmbed: () => {
        return new EmbedBuilder()
            .setTitle('❌ Pagamento Não Confirmado')
            .setDescription(
                `Não conseguimos confirmar seu pagamento. Isso pode ocorrer se:\n` +
                `• O valor estiver incorreto.\n` +
                `• O comprovante for inválido/ilegível.\n` +
                `• O Pix estiver agendado.\n\n` +
                `Por favor, envie um novo comprovante válido ou tire suas dúvidas aqui.`
            )
            .setColor(COLORS.ERROR);
    }
};

function _getPanelColor(state) {
    switch (state) {
        case TicketState.STATES.WAITING_STAFF_APPROVAL: return COLORS.WARNING;
        case TicketState.STATES.APPROVED_ONBOARDING_SENT: return COLORS.SUCCESS;
        case TicketState.STATES.REJECTED: return COLORS.ERROR;
        default: return COLORS.PRIMARY;
    }
}

module.exports = TicketViews;
