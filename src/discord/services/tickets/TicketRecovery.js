/**
 * Ticket Recovery Service
 * Reconstructs state from channel metadata if bot restarts.
 */

const TicketState = require('./TicketState');
const logger = require('../../../utils/logger');
const { PermissionFlagsBits } = require('discord.js');

const TicketRecovery = {
    async recover(channel) {
        if (!channel.name.startsWith('ticket-')) return null;

        let data = TicketState.get(channel.id);
        if (data) return data;

        // Reconstruct basic state
        const userId = channel.permissionOverwrites.cache.find(
            p => p.type === 1 && p.allow.has(PermissionFlagsBits.ViewChannel) && p.id !== channel.guild.client.user.id
        )?.id;

        if (!userId) {
            logger.warn(`[TicketRecovery] Could not recover user for ${channel.name}`);
            return null;
        }

        logger.info(`[TicketRecovery] Recovering state for ${channel.name}`);

        data = {
            channelId: channel.id,
            userId: userId,
            type: 'RECOVERED',
            state: TicketState.STATES.OPEN_SUPPORT, // Default safe state
            createdAt: channel.createdTimestamp,
            plan: null
        };

        TicketState.set(channel.id, data);
        return data;
    }
};

module.exports = TicketRecovery;
