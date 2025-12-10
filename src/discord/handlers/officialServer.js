/**
 * Handler for Official Server Automation
 * "God Mode" - Manages permissions, welcomes, and structure.
 */

const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
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
        log.error('Failed to assign Member role', 'Official', error);
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
            log.error('Failed to send welcome message', 'Official', error);
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
                    .catch(err => log.error(`Failed to update ${channel.name}`, 'Official', err))
            );
        }
    }

    try {
        await Promise.all(promises);
        log.success(`Enforced permissions on ${promises.length} channels.`);
    } catch (error) {
        log.error('Failed to enforce permissions (batch)', 'Official', error);
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
            log.error('Failed to update metrics topic', 'Official', error);
        }
    }
}

module.exports = {
    handleOfficialMemberAdd,
    enforceOfficialPermissions,
    updateOfficialStats
};
