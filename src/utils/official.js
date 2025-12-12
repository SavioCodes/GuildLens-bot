/**
 * Constants for the Official GuildLens Server
 * [DEPRECATED WRAPPER] - Delegates to src/config/*
 * Kept for backward compatibility during refactor.
 */

const DISCORD_IDS = require('../config/discordIds');
const PIX_CONFIG = require('../config/pix');

const OFFICIAL = {
    GUILD_ID: DISCORD_IDS.GUILD_ID,
    OWNER_ID: DISCORD_IDS.OWNER_ID,
    ROLES: DISCORD_IDS.ROLES,
    CHANNELS: DISCORD_IDS.CHANNELS,
    PERMISSIONS: DISCORD_IDS.PERMISSIONS,

    // Legacy PIX Config structure (mimics old behavior)
    _PIX_CONFIG: {
        get key() { return process.env.PIX_KEY },
        get name() { return process.env.PIX_NAME },
        get bank() { return process.env.PIX_BANK }
    },

    INVITE_LINK: DISCORD_IDS.LINKS.INVITE,

    // Helper to get secured PIX info (Delegates to new Service)
    getPixInfo: PIX_CONFIG.getKey,

    /**
     * Check if a member has high role permissions
     * @param {GuildMember} member 
     * @returns {boolean}
     */
    isHighRole: (member) => {
        if (!member || !member.roles) return false;
        const highRoles = [DISCORD_IDS.ROLES.FOUNDER, DISCORD_IDS.ROLES.STAFF, DISCORD_IDS.ROLES.DEVELOPER];
        return highRoles.some(roleId => member.roles.cache.has(roleId));
    },

    /**
     * Check if a member is admin
     * @param {GuildMember} member 
     * @returns {boolean}
     */
    isAdmin: (member) => {
        if (!member || !member.roles) return false;
        const adminRoles = [DISCORD_IDS.ROLES.FOUNDER, DISCORD_IDS.ROLES.DEVELOPER];
        return adminRoles.some(roleId => member.roles.cache.has(roleId));
    },

    // DEPRECATED BUT KEPT FOR COMPATIBILITY
    VERIFIED_ROLE_ID: DISCORD_IDS.ROLES.VERIFIED,
    UNVERIFIED_ROLE_ID: DISCORD_IDS.ROLES.UNVERIFIED,
    LINKS: {
        TICKET: `https://discord.com/channels/${DISCORD_IDS.GUILD_ID}/${DISCORD_IDS.CHANNELS.CRIAR_TICKET}`,
        SERVER: DISCORD_IDS.LINKS.SERVER,
        SUPPORT_SERVER: DISCORD_IDS.LINKS.SUPPORT
    },
    PRIVATE_CHANNELS: []
};

module.exports = OFFICIAL;


