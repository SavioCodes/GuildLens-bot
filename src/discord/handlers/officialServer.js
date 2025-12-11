/**
 * Handler for Official Server Automation
 * "God Mode" - Manages permissions, welcomes, and structure.
 */

const { EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const logger = require('../../utils/logger');
const OFFICIAL = require('../../utils/official');
const { COLORS } = require('../../utils/embeds');

const log = logger.child('OfficialServer');

const GREETINGS = [
    'Bem-vindo(a) ao time!',
    'A casa é sua (mas limpe os pés)',
    'Que bom te ver por aqui!',
    'Chegou quem faltava!',
    'Preparado para crescer sua comunidade?',
    'Um novo challenger apareceu!',
];

/**
 * Handles new member joining the Official Server
 */
async function handleOfficialMemberAdd(member) {
    if (member.guild.id !== OFFICIAL.GUILD_ID) return;

    log.info(`New member in official server: ${member.user.tag}`);

    // Grant 'Membro' role automatically
    try {
        await member.roles.add(OFFICIAL.ROLES.MEMBER);
    } catch (error) {
        log.error('Failed to assign Member role', error);
    }

    // Send Welcome Message
    const welcomeChannel = member.guild.channels.cache.get(OFFICIAL.CHANNELS.BEM_VINDO);
    if (welcomeChannel) {
        const randomGreeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];

        const embed = new EmbedBuilder()
            .setColor(COLORS.PRIMARY)
            .setTitle(`👋 ${randomGreeting}`)
            .setDescription(
                `Olá <@${member.user.id}>! Seja bem-vindo(a) ao **Servidor Oficial do GuildLens**.\n\n` +
                `Aqui você encontra suporte, dicas e uma comunidade focada em crescimento.\n\n` +
                `🚀 **Primeiros Passos:**\n` +
                `> 📖 Leia as <#${OFFICIAL.CHANNELS.REGRAS}> para evitar B.O.\n` +
                `> 💎 Veja os <#${OFFICIAL.CHANNELS.PLANOS}> para funcionalidades Premium.\n` +
                `> 🤖 Configure seu bot com <#${OFFICIAL.CHANNELS.COMO_USAR}>.\n\n` +
                `Precisa de ajuda? Abra um ticket em <#${OFFICIAL.CHANNELS.CRIAR_TICKET}>!`
            )
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .setFooter({
                text: `Membro #${member.guild.memberCount} • GuildLens Official`,
                iconURL: member.guild.iconURL({ dynamic: true })
            })
            .setTimestamp();

        try {
            await welcomeChannel.send({ content: `> Oie, <@${member.user.id}>!`, embeds: [embed] });
        } catch (error) {
            log.error('Failed to send welcome message', error);
        }
    }
}

/**
 * Enforces permissions for the Official Server
 * This effectively acts as "God Mode" resetting perms to the desired state.
 * Optimized with Promise.all and configuration mapping.
 */
async function enforceOfficialPermissions(guild) {
    if (guild.id !== OFFICIAL.GUILD_ID) return;

    log.info('Enforcing Official Server Permissions (Optimized)...');

    const { ROLES, CHANNELS } = OFFICIAL;
    const everyone = guild.id;

    // Permissions Helper
    const allow = (perms) => ({ allow: perms });
    const deny = (perms) => ({ deny: perms });
    const allowDeny = (allowPerms, denyPerms) => ({ allow: allowPerms, deny: denyPerms });

    // Configurations
    const CONFIG = [
        {
            name: 'Public Read-Only',
            channels: [
                CHANNELS.AVISOS, CHANNELS.REGRAS, CHANNELS.BEM_VINDO,
                CHANNELS.COMO_USAR, CHANNELS.PLANOS, CHANNELS.FAQ,
                CHANNELS.CHANGELOG
            ],
            overwrites: [
                { id: everyone, ...allowDeny([PermissionFlagsBits.ViewChannel], [PermissionFlagsBits.SendMessages]) },
                { id: ROLES.MEMBER, ...allowDeny([PermissionFlagsBits.ViewChannel], [PermissionFlagsBits.SendMessages]) },
                { id: ROLES.VERIFIED, ...allowDeny([PermissionFlagsBits.ViewChannel], [PermissionFlagsBits.SendMessages]) },
                { id: ROLES.STAFF, ...allow([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages]) }
            ]
        },
        {
            name: 'Public Read-Write',
            channels: [
                CHANNELS.GERAL, CHANNELS.MIDIA, CHANNELS.OFF_TOPIC, CHANNELS.SEU_SERVIDOR,
                CHANNELS.DUVIDAS, CHANNELS.SUGESTOES, CHANNELS.BUGS, CHANNELS.SHOWCASE
            ],
            overwrites: [
                { id: everyone, ...allowDeny([PermissionFlagsBits.ViewChannel], [PermissionFlagsBits.SendMessages]) },
                { id: ROLES.MEMBER, ...allow([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles]) },
                { id: ROLES.VERIFIED, ...allow([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles]) },
                { id: ROLES.STAFF, ...allow([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages]) }
            ]
        },
        {
            name: 'Pro Area',
            channels: [CHANNELS.LOUNGE_PRO, CHANNELS.EARLY_ACCESS],
            overwrites: [
                { id: everyone, ...deny([PermissionFlagsBits.ViewChannel]) },
                { id: ROLES.PRO, ...allow([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]) },
                { id: ROLES.GROWTH, ...allow([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]) },
                { id: ROLES.STAFF, ...allow([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]) }
            ]
        },
        {
            name: 'Growth Area',
            channels: [CHANNELS.LOUNGE_GROWTH, CHANNELS.NETWORKING, CHANNELS.SUPORTE_VIP],
            overwrites: [
                { id: everyone, ...deny([PermissionFlagsBits.ViewChannel]) },
                { id: ROLES.GROWTH, ...allow([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]) },
                { id: ROLES.STAFF, ...allow([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]) }
            ]
        },
        {
            name: 'Staff Area',
            channels: [CHANNELS.EQUIPE, CHANNELS.METRICAS],
            overwrites: [
                { id: everyone, ...deny([PermissionFlagsBits.ViewChannel]) },
                { id: ROLES.STAFF, ...allow([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]) },
                { id: ROLES.FOUNDER, ...allow([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels]) },
                { id: ROLES.DEVELOPER, ...allow([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]) }
            ]
        }
    ];

    const promises = [];

    // Process all configs in parallel
    for (const group of CONFIG) {
        for (const channelId of group.channels) {
            const channel = guild.channels.cache.get(channelId);
            if (!channel) {
                log.warn(`Channel not found: ${channelId} (${group.name})`);
                continue;
            }

            promises.push(
                channel.permissionOverwrites.set(group.overwrites)
                    .then(() => log.debug(`Updated permissions for ${channel.name}`))
                    .catch(err => log.error(`Failed to update ${channel.name}`, err))
            );
        }
    }

    try {
        await Promise.all(promises);
        log.success(`Enforced permissions on ${promises.length} channels.`);
    } catch (error) {
        log.error('Failed to enforce permissions (batch)', error);
        throw error;
    }
}

/**
 * Updates Voice Channel Stats (Members, Pros, etc)
 * "God Mode" feature to keep counters visible
 */
async function updateOfficialStats(guild) {
    if (guild.id !== OFFICIAL.GUILD_ID) return;

    // Define stats channels (Voice channels you edit the name of)
    // You'll need to create these voice channels and put their IDs in OFFICIAL.CHANNELS if not present,
    // Or we can just log for now. Since the user didn't give specific IDs for Stat Channels,
    // I will look for channels named like "👥 Membros: X" or create them?
    // For safety, I'll assume they might exist or skips.

    // Since we don't have IDs for stats channels in the prompt, let's just make sure "Métricas" category has them?
    // The user gave "📊・métricas 1448438111582552145" which is a CATEGORY/CHANNEL.
    // If it's a text channel, we can update the topic? 
    // It's under "STAFF", likely a text channel.

    const metricasChannel = guild.channels.cache.get(OFFICIAL.CHANNELS.METRICAS);
    if (metricasChannel && metricasChannel.isTextBased()) {
        try {
            const memberCount = guild.memberCount;
            const bots = guild.members.cache.filter(m => m.user.bot).size;
            const humans = memberCount - bots;

            // Update channel topic
            const topic = `📊 Membros: ${humans} | 🤖 Bots: ${bots} | 📅 ${new Date().toLocaleDateString('pt-BR')}`;
            if (metricasChannel.topic !== topic) {
                await metricasChannel.setTopic(topic);
                log.debug('Updated Metrics topic');
            }
        } catch (error) {
            log.error('Failed to update metrics topic', error);
        }
    }
}

const guardian = require('../services/guardian');

/**
 * Starts the Guardian watchdog for the official server
 * Runs initial checks (content restoration, etc)
 */
async function startGuardian(guild) {
    if (guild.id !== OFFICIAL.GUILD_ID) return;

    log.info('🛡️ Starting Guardian Protocol...');

    // 1. Check & Restore Content
    await guardian.restoreChannelContent(guild);

    // 3. Setup Content (Ticket Panel, Rules, Plans)
    await setupOfficialContent(guild);

    // 4. Sync Roles (Retroactive Fix)
    await syncOfficialRoles(guild);
}

/**
 * Automatically posts default content if missing
 */
async function setupOfficialContent(guild) {
    if (guild.id !== OFFICIAL.GUILD_ID) return;

    log.info('Checking official content...');

    // 1. REGRAS + VERIFICAÇÃO
    await ensureChannelContent(guild, OFFICIAL.CHANNELS.REGRAS, async (channel) => {

        // ========== EMBED 1: HEADER ==========
        const headerEmbed = new EmbedBuilder()
            .setColor(0x22D3EE)
            .setTitle('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
            .setDescription(
                '# 🏠 GuildLens Official\n\n' +
                '> *O servidor oficial da comunidade GuildLens — seu parceiro de analytics para Discord.*\n\n' +
                '**Antes de participar, leia atentamente as regras abaixo.**\n' +
                '**O descumprimento resultará em punição.**'
            )
            .setThumbnail(guild.iconURL({ size: 256 }));

        // ========== EMBED 2: CONDUTAS PROIBIDAS ==========
        const prohibitedEmbed = new EmbedBuilder()
            .setColor(0xEF4444)
            .setTitle('🚫 CONDUTAS PROIBIDAS')
            .setDescription(
                '```diff\n' +
                '- Ofensas, ameaças, bullying ou assédio\n' +
                '- Racismo, homofobia, xenofobia ou discriminação\n' +
                '- Conteúdo NSFW, Gore ou violento\n' +
                '- Spam, flood ou mensagens repetitivas\n' +
                '- Divulgação não autorizada (servidores, produtos, links)\n' +
                '- Menções abusivas (@everyone, @Staff)\n' +
                '- Golpes, scams ou vendas paralelas\n' +
                '- Vazamento de dados pessoais\n' +
                '- Burlar punições ou criar alts\n' +
                '```'
            );

        // ========== EMBED 3: REGRAS GERAIS ==========
        const rulesEmbed = new EmbedBuilder()
            .setColor(0x22C55E)
            .setTitle('📋 REGRAS GERAIS')
            .addFields(
                {
                    name: '💬 Comunicação',
                    value:
                        '```\n' +
                        '• Seja educado e respeitoso\n' +
                        '• Use português legível\n' +
                        '• Evite caps lock excessivo\n' +
                        '• Não interrompa conversas\n' +
                        '```',
                    inline: true
                },
                {
                    name: '📂 Canais',
                    value:
                        '```\n' +
                        '• Use cada canal corretamente\n' +
                        '• Ticket → Vendas e suporte\n' +
                        '• Off-topic → Conversa casual\n' +
                        '• Bugs → Reportar problemas\n' +
                        '```',
                    inline: true
                },
                {
                    name: '\u200B',
                    value: '\u200B',
                    inline: false
                },
                {
                    name: '💰 Transações',
                    value:
                        '```\n' +
                        '• Pagamentos APENAS via ticket\n' +
                        '• Método: PIX oficial\n' +
                        '• Nunca pague fora do sistema\n' +
                        '• Dúvidas? Pergunte ANTES\n' +
                        '```',
                    inline: true
                },
                {
                    name: '⚖️ Moderação',
                    value:
                        '```\n' +
                        '• Staff tem palavra final\n' +
                        '• Aviso → Mute → Kick → Ban\n' +
                        '• Appeals via ticket\n' +
                        '• Decisões são definitivas\n' +
                        '```',
                    inline: true
                }
            );

        // ========== EMBED 4: PUNIÇÕES ==========
        const punishEmbed = new EmbedBuilder()
            .setColor(0xFB923C)
            .setTitle('⚡ SISTEMA DE PUNIÇÕES')
            .setDescription(
                '| Infração | Punição |\n' +
                '|----------|--------|\n' +
                '| Leve (1ª vez) | ⚠️ Aviso |\n' +
                '| Leve (reincidência) | 🔇 Mute 1h |\n' +
                '| Média | 🔇 Mute 24h |\n' +
                '| Grave | 👢 Kick |\n' +
                '| Gravíssima | 🔨 Ban Permanente |\n\n' +
                '*Infrações graves podem resultar em ban imediato.*'
            );

        // ========== EMBED 5: VERIFICAÇÃO ==========
        const verifyEmbed = new EmbedBuilder()
            .setColor(0xA855F7)
            .setTitle('🔐 VERIFICAÇÃO OBRIGATÓRIA')
            .setDescription(
                '**Para acessar o servidor, você deve se verificar.**\n\n' +
                'Ao clicar no botão abaixo, você declara que:\n\n' +
                '✅ Leu e concorda com todas as regras\n' +
                '✅ Tem 13 anos de idade ou mais\n' +
                '✅ Não usará o servidor para atividades ilícitas\n' +
                '✅ Assume responsabilidade por suas ações\n\n' +
                '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
            )
            .setFooter({ text: '👇 Clique no botão verde para entrar na comunidade!' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('verify_member')
                    .setLabel('🎉 VERIFICAR E ENTRAR')
                    .setStyle(ButtonStyle.Success)
            );

        await channel.send({
            embeds: [headerEmbed, prohibitedEmbed, rulesEmbed, punishEmbed, verifyEmbed],
            components: [row]
        });
        log.success('Posted Premium Rules + Verification');
    });

    // 2. PLANOS
    await ensureChannelContent(guild, OFFICIAL.CHANNELS.PLANOS, async (channel) => {
        const embed = new EmbedBuilder()
            .setTitle('💎 Planos Premium GuildLens')
            .setColor(COLORS.GOLD)
            .setDescription(
                'Desbloqueie todo o potencial da sua comunidade com nossos planos.\n\n' +
                '**⭐ PLANO PRO (R$ 19,90/mês)**\n' +
                '• Membros ilimitados\n' +
                '• Health Score completo\n' +
                '• Insights de até 90 dias\n' +
                '• Alertas avançados\n' +
                '• Sem watermark\n\n' +
                '**🚀 PLANO GROWTH (R$ 39,90/mês)**\n' +
                '• Tudo do Pro\n' +
                '• Até 5 servidores\n' +
                '• Histórico de 365 dias\n' +
                '• Exportar dados (CSV)\n' +
                '• Suporte prioritário\n\n' +
                '**Como assinar?**\n' +
                'Abra um Ticket em <#' + OFFICIAL.CHANNELS.CRIAR_TICKET + '> e escolha seu plano!'
            );

        await channel.send({ embeds: [embed] });
        log.success('Posted Plans');
    });

    // 3. TICKET PANEL
    await ensureChannelContent(guild, OFFICIAL.CHANNELS.CRIAR_TICKET, async (channel) => {
        const embed = new EmbedBuilder()
            .setTitle('🎫 Central de Vendas & Suporte')
            .setDescription(
                '**Quer assinar o GuildLens?**\n' +
                'Clique no botão abaixo para abrir um ticket privado.\n\n' +
                '📋 **No ticket você pode:**\n' +
                '• Escolher seu plano (PRO ou GROWTH)\n' +
                '• Receber os dados do PIX\n' +
                '• Enviar comprovante de pagamento\n' +
                '• Tirar dúvidas com a equipe\n\n' +
                '⚡ Atendimento rápido!'
            )
            .setColor(COLORS.PRIMARY);

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('open_ticket')
                    .setLabel('🎫 Abrir Ticket')
                    .setStyle(ButtonStyle.Success)
            );

        await channel.send({ embeds: [embed], components: [row] });
        log.success('Posted Ticket Panel');
    });
}

/**
 * Helper to ensure channel has bot content
 */
async function ensureChannelContent(guild, channelId, sendCallback) {
    const channel = guild.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased()) return;

    // Check last messages
    const messages = await channel.messages.fetch({ limit: 5 });
    const botMsg = messages.find(m => m.author.id === guild.client.user.id);

    if (!botMsg) {
        // Clear non-bot messages if needed? better not delete user messages blindly
        // Just send ours if missing
        await sendCallback(channel);
    }
}

/**
 * Watchdog for Permission Changes
 */
async function activeGuardianWatchdog(oldChannel, newChannel) {
    // Only care about permission updates in Official Server
    if (newChannel.guild.id !== OFFICIAL.GUILD_ID) return;

    // Simple check: IF permissions changed, re-enforce everything for that channel?
    // That might be too aggressive if an admin IS trying to change it.
    // Instead, let's just Log it loudly.

    // We can't easily detect WHAT changed without deep diff.
    // But we know standard config.

    if (oldChannel.permissionOverwrites.cache.size !== newChannel.permissionOverwrites.cache.size) {
        log.warn(`⚠️ Permissions changed in #${newChannel.name}. Review needed.`, 'Guardian');

        // Notify in Logs?
        const logChannel = newChannel.guild.channels.cache.get(OFFICIAL.CHANNELS.LOGS_SECRET);
        if (logChannel) {
            logChannel.send(`⚠️ **Alerta de Segurança:** Permissões alteradas em <#${newChannel.id}> por um administrador.`);
        }

        // Auto-Revert is dangerous if not careful. Let's stick to Alerting for now as requested ("deixar um aviso").
    }
}

/**
 * Syncs 'Membro' role for all users who don't have it
 * Uses cached members to avoid timeout errors
 */
async function syncOfficialRoles(guild) {
    if (guild.id !== OFFICIAL.GUILD_ID) return;

    log.info('Syncing official roles...');

    try {
        // Use existing cache instead of fetching all members (avoids timeout)
        const role = guild.roles.cache.get(OFFICIAL.ROLES.MEMBER);

        if (!role) {
            log.warn('Member role not found during sync');
            return;
        }

        const missing = guild.members.cache.filter(m => !m.user.bot && !m.roles.cache.has(role.id));

        if (missing.size > 0) {
            log.info(`Found ${missing.size} cached members without role. Fixing...`);
            let count = 0;

            for (const [_, member] of missing) {
                try {
                    await member.roles.add(role);
                    count++;
                } catch (err) {
                    log.warn(`Failed to add role to ${member.user.tag}`);
                }
            }
            log.success(`Synced roles for ${count} members.`);
        } else {
            log.debug('Role sync check passed (All good).');
        }
    } catch (error) {
        log.error('Failed to sync roles', error);
    }
}

module.exports = {
    handleOfficialMemberAdd,
    enforceOfficialPermissions,
    updateOfficialStats,
    startGuardian,
    activeGuardianWatchdog,
    syncOfficialRoles
};
