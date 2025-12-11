// FILE: src/discord/commands/setup/handlers/staff.js
// Handler for staff role configuration subcommand

const logger = require('../../../../utils/logger');
const { createSetupEmbed } = require('../../../../utils/embeds');
const settingsRepo = require('../../../../db/repositories/settings');
const { handleCommandError } = require('../../../../utils/errorHandler');

const log = logger.child('SetupStaff');

/**
 * Handles the staff role configuration subcommand
 * @param {Interaction} interaction - Discord interaction
 * @param {string} guildId - Guild ID
 * @returns {Promise<void>}
 */
async function handleStaffSetup(interaction, guildId) {
    const role = interaction.options.getRole('cargo');
    const roleId = role?.id || null;

    try {
        await settingsRepo.setStaffRoleId(guildId, roleId);

        const settings = await settingsRepo.getSettings(guildId);

        await interaction.reply({
            embeds: [createSetupEmbed({
                monitoredChannels: settings?.monitored_channels || [],
                language: settings?.language || 'pt-BR',
                staffRoleId: settings?.staff_role_id,
            })],
        });

        log.success(`Staff role configured for ${interaction.guild.name}: ${roleId || 'NONE'}`);

    } catch (error) {
        log.error('Failed to configure staff role', error);
        await handleCommandError(error, interaction, 'guildlens-setup staff');
    }
}

module.exports = { handleStaffSetup };
