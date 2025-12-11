/**
 * Constants for the Official GuildLens Server
 */

const OFFICIAL = {
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
        BOT: '1448433641314189332'
    },

    // Roles with elevated permissions (can see private channels)
    HIGH_ROLES: [
        '1448321271078060084', // FOUNDER
        '1448432406829862922', // DEVELOPER
        '1448432571854885005', // STAFF
    ],

    // Roles that can manage server
    ADMIN_ROLES: [
        '1448321271078060084', // FOUNDER
        '1448432406829862922', // DEVELOPER
    ],

    CHANNELS: {
        // Início
        AVISOS: '1448094383932182581',
        REGRAS: '1448434255158837289',
        BEM_VINDO: '1448434293524271294',
        COMO_USAR: '1448437248927207465',
        PLANOS: '1448437304946327552',
        FAQ: '1448437323891998720',

        // Verificação
        CAT_VERIFICACAO: '1448713482076815654',
        VERIFICACAO: '1448764568049549465',

        // Comunidade
        GERAL: '1448437423720890568',
        MIDIA: '1448437440359694537',
        OFF_TOPIC: '1448437457652809862',
        SEU_SERVIDOR: '1448437477604982824',

        // GuildLens
        DUVIDAS: '1448437598833086534',
        SUGESTOES: '1448437626410635355',
        BUGS: '1448437643783176262',      // PRIVATE - HIGH_ROLES only
        SHOWCASE: '1448437661193998557',
        CHANGELOG: '1448437676872306798',

        // Pro
        LOUNGE_PRO: '1448437740957077504',
        EARLY_ACCESS: '1448437758405115964',

        // Growth
        LOUNGE_GROWTH: '1448437959618461766',
        NETWORKING: '1448437976920227872',
        SUPORTE_VIP: '1448437990094405795',

        // Suporte
        CRIAR_TICKET: '1448438039478009856',

        // Staff
        CAT_STAFF: '1448438072336318685',    // Staff category
        EQUIPE: '1448438090258710539',
        METRICAS: '1448438111582552145',

        // Segredo logs e coisas (Secret)
        CAT_SECRET: '1448453888662573188',
        LOGS: '1448454025115734047',         // #logs
        LOGS_SECRET: '1448468068400369706',  // #logs-secret
        AVISO_TICKET: '1448468208184070266'
    },

    // Channels that should be restricted to HIGH_ROLES
    PRIVATE_CHANNELS: [
        '1448437643783176262', // BUGS
        '1448438090258710539', // EQUIPE
        '1448438111582552145', // METRICAS
        '1448454025115734047', // LOGS
        '1448468068400369706', // LOGS_SECRET
        '1448468208184070266', // AVISO_TICKET
    ],

    LINKS: {
        TICKET: 'https://discord.com/channels/1448094379632885782/1448438039478009856',
        SERVER: 'https://discord.gg/tVrGPC7Z',
        SUPPORT_SERVER: 'https://discord.gg/tVrGPC7Z'
    },

    INVITE_LINK: 'https://discord.gg/tVrGPC7Z'
};

/**
 * Check if a member has high role permissions
 * @param {GuildMember} member 
 * @returns {boolean}
 */
OFFICIAL.isHighRole = (member) => {
    return OFFICIAL.HIGH_ROLES.some(roleId => member.roles.cache.has(roleId));
};

/**
 * Check if a member is admin
 * @param {GuildMember} member 
 * @returns {boolean}
 */
OFFICIAL.isAdmin = (member) => {
    return OFFICIAL.ADMIN_ROLES.some(roleId => member.roles.cache.has(roleId));
};

module.exports = OFFICIAL;

