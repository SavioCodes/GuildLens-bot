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
 * Ultra-premium welcome experience
 */
async function handleOfficialMemberAdd(member) {
    if (member.guild.id !== OFFICIAL.GUILD_ID) return;

    log.info(`🎉 New member in official server: ${member.user.tag}`);

    const guild = member.guild;
    const memberNumber = guild.memberCount;

    // 1. Grant 'Membro' role automatically
    try {
        await member.roles.add(OFFICIAL.ROLES.MEMBER);
        log.debug(`Assigned MEMBER role to ${member.user.tag}`);
    } catch (error) {
        log.error('Failed to assign Member role', error);
    }

    // 2. Send Premium Welcome Message to channel
    const welcomeChannel = guild.channels.cache.get(OFFICIAL.CHANNELS.BEM_VINDO);
    if (welcomeChannel) {
        const randomGreeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];

        // Account age calculation
        const accountAge = Math.floor((Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24));
        const accountStatus = accountAge < 7 ? '⚠️ Nova' : accountAge < 30 ? '📅 Recente' : '✅ Estabelecida';

        const welcomeEmbed = new EmbedBuilder()
            .setColor(0x22D3EE)
            .setAuthor({
                name: randomGreeting,
                iconURL: guild.iconURL({ size: 64 })
            })
            .setTitle(`👋 Bem-vindo(a), ${member.user.displayName}!`)
            .setDescription(
                `<@${member.id}> acabou de entrar na comunidade!\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
            )
            .addFields(
                {
                    name: '🚀 Primeiros Passos',
                    value:
                        `> 📖 Leia as <#${OFFICIAL.CHANNELS.REGRAS}> e verifique-se\n` +
                        `> 💬 Apresente-se no <#${OFFICIAL.CHANNELS.GERAL}>\n` +
                        `> 💎 Veja os planos em <#${OFFICIAL.CHANNELS.PLANOS}>`,
                    inline: false
                },
                {
                    name: '📊 Informações',
                    value:
                        `\`\`\`yaml\n` +
                        `Membro: #${memberNumber}\n` +
                        `Conta: ${accountStatus} (${accountAge} dias)\n` +
                        `\`\`\``,
                    inline: true
                },
                {
                    name: '🎯 Sobre Você',
                    value:
                        `\`\`\`yaml\n` +
                        `ID: ${member.id}\n` +
                        `Tag: ${member.user.tag}\n` +
                        `\`\`\``,
                    inline: true
                }
            )
            .setThumbnail(member.user.displayAvatarURL({ size: 512, dynamic: true }))
            .setImage('https://raw.githubusercontent.com/SavioCodes/GuildLens-bot/main/assets/welcome_banner.png')
            .setFooter({
                text: `GuildLens Official • ${new Date().toLocaleDateString('pt-BR')}`,
                iconURL: guild.iconURL({ size: 64 })
            })
            .setTimestamp();

        try {
            await welcomeChannel.send({
                content: `🎉 **Novo membro!** Dê as boas-vindas a <@${member.id}>!`,
                embeds: [welcomeEmbed]
            });
        } catch (error) {
            log.error('Failed to send welcome message', error);
        }
    }

    // 3. Send DM Welcome with bot info
    try {
        const dmEmbed = new EmbedBuilder()
            .setColor(0x22D3EE)
            .setTitle('🎉 Bem-vindo ao GuildLens Official!')
            .setDescription(
                `Olá **${member.user.displayName}**!\n\n` +
                `Você acabou de entrar no servidor oficial do **GuildLens** — ` +
                `o bot de analytics mais completo para Discord!\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
            )
            .addFields(
                {
                    name: '📊 O Que é o GuildLens?',
                    value:
                        '> Um bot que analisa a atividade do seu servidor\n' +
                        '> Gera relatórios de saúde da comunidade\n' +
                        '> Identifica membros ativos e inativos\n' +
                        '> Exporta dados em vários formatos',
                    inline: false
                },
                {
                    name: '💎 Planos Disponíveis',
                    value:
                        '```yaml\n' +
                        'Gratuito: Recursos básicos\n' +
                        'PRO:      R$ 19,90/mês - Analytics avançado\n' +
                        'GROWTH:   R$ 39,90/mês - Tudo + Suporte VIP\n' +
                        '```',
                    inline: false
                },
                {
                    name: '🔗 Links Importantes',
                    value:
                        `> 📖 [Leia as Regras](https://discord.com/channels/${OFFICIAL.GUILD_ID}/${OFFICIAL.CHANNELS.REGRAS})\n` +
                        `> 💎 [Ver Planos](https://discord.com/channels/${OFFICIAL.GUILD_ID}/${OFFICIAL.CHANNELS.PLANOS})\n` +
                        `> 🎫 [Abrir Ticket](https://discord.com/channels/${OFFICIAL.GUILD_ID}/${OFFICIAL.CHANNELS.CRIAR_TICKET})`,
                    inline: false
                }
            )
            .setThumbnail(member.client.user.displayAvatarURL({ size: 256 }))
            .setFooter({ text: 'GuildLens • Seu parceiro de analytics' });

        await member.send({ embeds: [dmEmbed] });
        log.debug(`DM sent to ${member.user.tag}`);
    } catch (error) {
        // DM might be closed, that's okay
        log.debug(`Could not DM ${member.user.tag} (DMs closed)`);
    }

    log.success(`✅ Welcome sequence completed for ${member.user.tag}`);
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

// Monitoring interval reference
let contentMonitorInterval = null;
const CONTENT_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Starts the Guardian watchdog for the official server
 * Runs initial checks (content restoration, etc)
 */
async function startGuardian(guild) {
    if (guild.id !== OFFICIAL.GUILD_ID) return;

    log.info('🛡️ Starting Guardian Protocol...');

    // 1. Check & Restore Content
    await guardian.restoreChannelContent(guild);

    // 2. Enforce Private Channel Permissions
    await enforcePrivateChannels(guild);

    // 3. Setup Content (Ticket Panel, Rules, Plans)
    await setupOfficialContent(guild);

    // 4. Sync Roles (Retroactive Fix)
    await syncOfficialRoles(guild);

    // 5. Start Continuous Content Monitoring
    startContentMonitor(guild);

    log.success('🛡️ Guardian Protocol fully active!');
}

/**
 * Starts continuous content monitoring
 * Refreshes official content every hour
 */
function startContentMonitor(guild) {
    // Clear existing interval if any
    if (contentMonitorInterval) {
        clearInterval(contentMonitorInterval);
    }

    log.info('� Starting content monitor (every 1 hour)...');

    // Refresh every hour
    const HOURLY_INTERVAL = 60 * 60 * 1000; // 1 hour

    contentMonitorInterval = setInterval(async () => {
        try {
            log.info('🔄 Hourly content refresh starting...');
            await setupOfficialContent(guild);
            log.success('🔄 Hourly content refresh complete');
        } catch (error) {
            log.error('Content refresh failed', error);
        }
    }, HOURLY_INTERVAL);

    log.success('� Content monitor active (hourly refresh)');
}

/**
 * Checks if official content exists and restores if deleted
 */
async function checkAndRestoreContent(guild) {
    const channelsToCheck = [
        { id: OFFICIAL.CHANNELS.REGRAS, name: 'Regras' },
        { id: OFFICIAL.CHANNELS.PLANOS, name: 'Planos' },
        { id: OFFICIAL.CHANNELS.CRIAR_TICKET, name: 'Ticket Panel' },
    ];

    for (const { id, name } of channelsToCheck) {
        const channel = guild.channels.cache.get(id);
        if (!channel) continue;

        try {
            // Fetch recent messages
            const messages = await channel.messages.fetch({ limit: 10 });
            const botMessages = messages.filter(m => m.author.id === guild.client.user.id);

            // If no bot messages found, content was deleted - restore it
            if (botMessages.size === 0) {
                log.warn(`⚠️ ${name} content missing! Restoring...`);
                await setupOfficialContent(guild);
                log.success(`✅ ${name} content restored!`);
                break; // One restore call handles all channels
            }
        } catch (error) {
            log.error(`Failed to check ${name} content`, error);
        }
    }
}

/**
 * Enforces private channel permissions - locks channels to high roles only
 */
async function enforcePrivateChannels(guild) {
    log.info('🔒 Enforcing private channel permissions...');

    const everyoneRole = guild.roles.everyone;
    let locked = 0;

    for (const channelId of OFFICIAL.PRIVATE_CHANNELS) {
        const channel = guild.channels.cache.get(channelId);
        if (!channel) continue;

        try {
            // Deny @everyone from viewing
            await channel.permissionOverwrites.edit(everyoneRole, {
                [PermissionFlagsBits.ViewChannel]: false,
                [PermissionFlagsBits.SendMessages]: false,
            });

            // Allow HIGH_ROLES to view
            for (const roleId of OFFICIAL.HIGH_ROLES) {
                const role = guild.roles.cache.get(roleId);
                if (role) {
                    await channel.permissionOverwrites.edit(role, {
                        [PermissionFlagsBits.ViewChannel]: true,
                        [PermissionFlagsBits.SendMessages]: true,
                        [PermissionFlagsBits.ManageMessages]: true,
                    });
                }
            }

            // Allow bot to view
            const botRole = guild.roles.cache.get(OFFICIAL.ROLES.BOT);
            if (botRole) {
                await channel.permissionOverwrites.edit(botRole, {
                    [PermissionFlagsBits.ViewChannel]: true,
                    [PermissionFlagsBits.SendMessages]: true,
                });
            }

            locked++;
            log.debug(`Locked channel: #${channel.name}`);
        } catch (error) {
            log.error(`Failed to lock channel ${channelId}`, error);
        }
    }

    log.success(`🔒 Locked ${locked} private channels`);
}

/**
 * Automatically posts default content if missing
 */
async function setupOfficialContent(guild) {
    if (guild.id !== OFFICIAL.GUILD_ID) return;

    log.info('Checking official content...');

    // 1. REGRAS (sem verificação)
    await ensureChannelContent(guild, OFFICIAL.CHANNELS.REGRAS, async (channel) => {

        const welcomeEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setAuthor({ name: 'GuildLens Official', iconURL: guild.iconURL({ size: 64 }) })
            .setTitle('Bem-vindo à Comunidade')
            .setDescription(
                'Este é o servidor oficial do **GuildLens**, o bot de analytics para Discord.\n\n' +
                'Leia as regras abaixo e depois vá para <#' + OFFICIAL.CHANNELS.VERIFICACAO + '> para liberar seu acesso.'
            )
            .setThumbnail(guild.iconURL({ size: 256 }));

        const rulesEmbed = new EmbedBuilder()
            .setColor(0x22D3EE)
            .setTitle('📋 Regras da Comunidade')
            .addFields(
                { name: '1. Respeito', value: 'Trate todos com educação. Sem ofensas, discriminação ou bullying.', inline: false },
                { name: '2. Conteúdo', value: 'Proibido NSFW, spam, flood e divulgação não autorizada.', inline: false },
                { name: '3. Canais', value: 'Use cada canal para seu propósito. Comandos apenas em <#' + OFFICIAL.CHANNELS.DUVIDAS + '>.', inline: false },
                { name: '4. Pagamentos', value: 'Transações apenas via ticket oficial. Nunca pague em DM.', inline: false },
                { name: '5. Punições', value: 'Violações resultam em: Aviso → Mute → Kick → Ban.', inline: false }
            )
            .setFooter({ text: 'Após ler, vá para #verificação liberar seu acesso.' });

        await channel.send({ embeds: [welcomeEmbed, rulesEmbed] });
        log.success('Posted rules');
    });

    // 2. VERIFICAÇÃO (canal separado)
    await ensureChannelContent(guild, OFFICIAL.CHANNELS.VERIFICACAO, async (channel) => {

        const verifyEmbed = new EmbedBuilder()
            .setColor(0x22C55E)
            .setAuthor({ name: 'Verificação de Acesso', iconURL: guild.iconURL({ size: 64 }) })
            .setTitle('✅ Verificar Conta')
            .setDescription(
                'Para acessar o servidor, clique no botão abaixo.\n\n' +
                'Ao verificar, você confirma que:\n' +
                '• Leu e concorda com as regras\n' +
                '• Tem 13 anos ou mais\n' +
                '• Não usará o servidor para fins ilegais'
            )
            .setFooter({ text: 'Após verificar, você terá acesso a todos os canais.' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('verify_member')
                    .setLabel('Verificar')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅')
            );

        await channel.send({ embeds: [verifyEmbed], components: [row] });
        log.success('Posted verification panel');
    });

    // 2. PLANOS
    await ensureChannelContent(guild, OFFICIAL.CHANNELS.PLANOS, async (channel) => {

        const plansEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setAuthor({ name: 'GuildLens Premium', iconURL: guild.iconURL({ size: 64 }) })
            .setTitle('Planos Disponíveis')
            .setDescription('Escolha o plano ideal para seu servidor.')
            .addFields(
                {
                    name: '⭐ PRO — R$ 19,90/mês',
                    value:
                        '• Membros ilimitados\n' +
                        '• Health Score completo\n' +
                        '• Insights de 90 dias\n' +
                        '• Sem watermark',
                    inline: true
                },
                {
                    name: '🚀 GROWTH — R$ 39,90/mês',
                    value:
                        '• Tudo do PRO\n' +
                        '• Até 5 servidores\n' +
                        '• Histórico de 365 dias\n' +
                        '• Suporte VIP',
                    inline: true
                }
            )
            .setFooter({ text: 'Para assinar, abra um ticket.' });

        await channel.send({ embeds: [plansEmbed] });
        log.success('Posted clean plans');
    });

    // 3. TICKET PANEL
    await ensureChannelContent(guild, OFFICIAL.CHANNELS.CRIAR_TICKET, async (channel) => {

        const ticketEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setAuthor({ name: 'Central de Atendimento', iconURL: guild.iconURL({ size: 64 }) })
            .setTitle('Precisa de ajuda?')
            .setDescription(
                'Abra um ticket para:\n\n' +
                '• **Assinar** um plano PRO ou GROWTH\n' +
                '• **Tirar dúvidas** sobre o bot\n' +
                '• **Suporte técnico** e configurações\n' +
                '• **Pagamentos** e cancelamentos'
            )
            .setFooter({ text: 'Tempo médio de resposta: 5 minutos' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('open_ticket')
                    .setLabel('Abrir Ticket')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎫')
            );

        await channel.send({ embeds: [ticketEmbed], components: [row] });
        log.success('Posted clean ticket panel');
    });
}

/**
 * Helper to ensure channel has FRESH bot content
 * Deletes old bot messages and reposts new content
 */
async function ensureChannelContent(guild, channelId, sendCallback) {
    const channel = guild.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased()) return;

    try {
        // Fetch recent messages
        const messages = await channel.messages.fetch({ limit: 20 });
        const botMessages = messages.filter(m => m.author.id === guild.client.user.id);

        // Delete old bot messages first
        for (const [, msg] of botMessages) {
            try {
                await msg.delete();
            } catch (err) {
                log.debug(`Could not delete old message: ${err.message}`);
            }
        }

        // Post fresh content
        await sendCallback(channel);
        log.debug(`Refreshed content in #${channel.name}`);
    } catch (error) {
        log.error(`Failed to ensure content in channel ${channelId}`, error);
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

/**
 * Handles member leaving the Official Server
 * Logs departure to staff channel
 */
async function handleOfficialMemberRemove(member) {
    if (member.guild.id !== OFFICIAL.GUILD_ID) return;

    log.info(`👋 Member left official server: ${member.user.tag}`);

    // Log to staff channel
    const logsChannel = member.guild.channels.cache.get(OFFICIAL.CHANNELS.LOGS);
    if (logsChannel) {
        const joinedAt = member.joinedAt
            ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>`
            : 'Desconhecido';

        const roles = member.roles.cache
            .filter(r => r.id !== member.guild.id) // Exclude @everyone
            .map(r => r.name)
            .join(', ') || 'Nenhum';

        const embed = new EmbedBuilder()
            .setColor(0xEF4444)
            .setTitle('👋 Membro Saiu')
            .setDescription(`**${member.user.tag}** saiu do servidor.`)
            .addFields(
                { name: '🆔 ID', value: `\`${member.id}\``, inline: true },
                { name: '📅 Entrou', value: joinedAt, inline: true },
                { name: '🏷️ Cargos', value: `\`\`\`${roles}\`\`\``, inline: false }
            )
            .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
            .setTimestamp();

        await logsChannel.send({ embeds: [embed] });
    }
}

/**
 * Handles server boost events
 */
async function handleServerBoost(oldMember, newMember) {
    if (newMember.guild.id !== OFFICIAL.GUILD_ID) return;

    // Check if user started boosting
    const wasBoosting = oldMember.premiumSince !== null;
    const isBoosting = newMember.premiumSince !== null;

    if (!wasBoosting && isBoosting) {
        // New boost!
        log.info(`🚀 New boost from ${newMember.user.tag}!`);

        const announceChannel = newMember.guild.channels.cache.get(OFFICIAL.CHANNELS.AVISOS);
        if (announceChannel) {
            const boostCount = newMember.guild.premiumSubscriptionCount || 0;

            const embed = new EmbedBuilder()
                .setColor(0xF47FFF)
                .setTitle('🚀 NOVO BOOST!')
                .setDescription(
                    `**${newMember.user.displayName}** impulsionou o servidor!\n\n` +
                    `> Obrigado pelo apoio! 💜\n\n` +
                    `O servidor agora tem **${boostCount} boosts**!`
                )
                .setThumbnail(newMember.user.displayAvatarURL({ size: 256, dynamic: true }))
                .setFooter({ text: 'GuildLens Official' })
                .setTimestamp();

            await announceChannel.send({
                content: `🎉 Obrigado pelo boost, <@${newMember.id}>!`,
                embeds: [embed]
            });
        }
    }
}

/**
 * Handles member role updates (boost detection wrapper)
 */
async function handleMemberUpdate(oldMember, newMember) {
    // Boost detection
    await handleServerBoost(oldMember, newMember);
}

module.exports = {
    handleOfficialMemberAdd,
    handleOfficialMemberRemove,
    handleMemberUpdate,
    enforceOfficialPermissions,
    updateOfficialStats,
    startGuardian,
    activeGuardianWatchdog,
    syncOfficialRoles
};
