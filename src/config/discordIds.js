/**
 * Centralized Discord IDs and Permissions
 * Single source of truth for all Guild IDs.
 */

const { PermissionFlagsBits } = require('discord.js');

const DISCORD_IDS = {
    GUILD_ID: '1448094379632885782',
    OWNER_ID: '976586934455513159',

    ROLES: {
        FOUNDER: '1448321271078060084',
        DEVELOPER: '1448432406829862922',
        STAFF: '1448432571854885005',
        GROWTH: '1448432800557699153',
        PRO: '1448433229735395488',
        VERIFIED: '1448433384517931109',
        MEMBER: '1448433475471540330',
        BOT: '1448433641314189332',
        UNVERIFIED: '1448795568682827848'
    },

    CHANNELS: {
        // --- PUBLIC READ-ONLY ZONE ---
        AVISOS: '1448094383932182581',
        REGRAS: '1448434255158837289',
        BEM_VINDO: '1448434293524271294',
        COMO_USAR: '1448437248927207465',
        PLANOS: '1448437304946327552',
        FAQ: '1448437323891998720',
        CHANGELOG: '1448437676872306798',

        // --- VERIFICATION ZONE ---
        CAT_VERIFICACAO: '1448713482076815654',
        VERIFICACAO: '1448764568049549465',

        // --- COMMUNITY ZONE ---
        GERAL: '1448437423720890568',
        MIDIA: '1448437440359694537',
        OFF_TOPIC: '1448437457652809862',
        SEU_SERVIDOR: '1448437477604982824',
        SUGESTOES: '1448437626410635355',
        SHOWCASE: '1448437661193998557',

        // --- COMMAND ZONE (STRICT) ---
        COMMANDS_CATEGORY: '1448785017772834826',
        COMMANDS_CHANNEL: '1448785517566099628',
        DUVIDAS: '1448437598833086534',

        // --- TICKET ZONE (PRIVATE) ---
        CRIAR_TICKET: '1448438039478009856',
        LOG_TICKET: '1448468208184070266', // Previously AVISO_TICKET

        // --- VIP ZONES ---
        LOUNGE_PRO: '1448437740957077504',
        EARLY_ACCESS: '1448437758405115964',
        LOUNGE_GROWTH: '1448437959618461766',
        NETWORKING: '1448437976920227872',
        SUPORTE_VIP: '1448437990094405795',

        // --- STAFF & LOGS (RESTRICTED) ---
        CAT_STAFF: '1448438072336318685',
        EQUIPE: '1448438090258710539',
        METRICAS: '1448438111582552145',
        BUGS: '1448437643783176262',
        CAT_SECRET: '1448453888662573188',
        LOGS: '1448454025115734047',
        LOGS_SECRET: '1448468068400369706',

        // --- AVALIAÇÕES ---
        CAT_AVALIACOES: '1448789915457421464',
        AVALIACOES: '1448790225902895166',
    },

    LINKS: {
        INVITE: 'https://discord.gg/tVrGPC7Z',
        SERVER: 'https://discord.gg/tVrGPC7Z',
        SUPPORT: 'https://discord.gg/tVrGPC7Z'
    },

    // --- PERMISSION ZONES ---
    PERMISSIONS: {
        PUBLIC_READ: {
            description: 'Public Read-Only (Rules, Info)',
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
            deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions]
        },
        COMMUNITY_CHAT: {
            description: 'Community Chat (General)',
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles],
            deny: []
        },
        COMMANDS: {
            description: 'Command Execution Zone',
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.UseApplicationCommands],
            deny: []
        },
        VERIFICATION_ZONE: {
            description: 'Entry Point (Non-Verified)',
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
            deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions]
        },
        TICKET_LOGS: {
            description: 'Private Logs (Staff Only)',
            roles: ['STAFF', 'FOUNDER', 'DEVELOPER']
        },
        STAFF_ONLY: {
            description: 'Staff Internal',
            roles: ['STAFF', 'FOUNDER', 'DEVELOPER']
        }
    }
};

module.exports = DISCORD_IDS;
