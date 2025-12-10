// FILE: src/discord/commands/setup/handlers/language.js
// Handler for language configuration subcommand

const logger = require('../../../../utils/logger');
const { createSetupEmbed } = require('../../../../utils/embeds');
const settingsRepo = require('../../../../db/repositories/settings');
const { handleCommandError } = require('../../../../utils/errorHandler');

const log = logger.child('SetupLanguage');

/**
 * Handles the language configuration subcommand
 * @param {Interaction} interaction - Discord interaction
 * @param {string} guildId - Guild ID
 * @returns {Promise<void>}
 */
async function handleLanguageSetup(interaction, guildId) {
    const language = interaction.options.getString('idioma');

    try {
        await settingsRepo.setLanguage(guildId, language);

        const settings = await settingsRepo.getSettings(guildId);

        await interaction.reply({
            embeds: [createSetupEmbed({
                monitoredChannels: settings?.monitored_channels || [],
                language: settings?.language || 'pt-BR',
                staffRoleId: settings?.staff_role_id,
            })],
        });

        log.success(`Language configured for ${interaction.guild.name}: ${language}`);

    } catch (error) {
        log.error('Failed to configure language', 'Setup', error);
        await handleCommandError(error, interaction, 'guildlens-setup idioma');
    }
}

module.exports = { handleLanguageSetup };
