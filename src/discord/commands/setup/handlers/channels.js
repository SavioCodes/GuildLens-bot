// FILE: src/discord/commands/setup/handlers/channels.js
// Handler for channels configuration subcommand

const logger = require('../../../../utils/logger');
const { createSetupEmbed, createErrorEmbed } = require('../../../../utils/embeds');
const settingsRepo = require('../../../../db/repositories/settings');
const { handleCommandError } = require('../../../../utils/errorHandler');

const log = logger.child('SetupChannels');

/**
 * Handles the channel configuration subcommand
 * @param {Interaction} interaction - Discord interaction
 * @param {string} guildId - Guild ID
 * @returns {Promise<void>}
 */
async function handleChannelsSetup(interaction, guildId) {
    const mode = interaction.options.getString('modo');

    try {
        let monitoredChannels = [];

        if (mode === 'specific') {
            // Collect all specified channels
            for (let i = 1; i <= 5; i++) {
                const channel = interaction.options.getChannel(`canal${i}`);
                if (channel) {
                    monitoredChannels.push(channel.id);
                }
            }

            if (monitoredChannels.length === 0) {
                await interaction.reply({
                    embeds: [createErrorEmbed(
                        'Nenhum Canal Selecionado',
                        'Você selecionou "Canais específicos" mas não informou nenhum canal. ' +
                        'Por favor, inclua pelo menos um canal ou selecione "Todos os canais de texto".'
                    )],
                    flags: 64,
                });
                return;
            }
        }
        // If mode is 'all', monitoredChannels stays empty (meaning all channels)

        await settingsRepo.setMonitoredChannels(guildId, monitoredChannels.length > 0 ? monitoredChannels : null);

        // Get current settings to show in confirmation
        const settings = await settingsRepo.getSettings(guildId);

        await interaction.reply({
            embeds: [createSetupEmbed({
                monitoredChannels: settings?.monitored_channels || [],
                language: settings?.language || 'pt-BR',
                staffRoleId: settings?.staff_role_id,
            })],
        });

        log.success(`Channels configured for ${interaction.guild.name}: ${mode === 'all' ? 'ALL' : monitoredChannels.length + ' channels'}`);

    } catch (error) {
        log.error('Failed to configure channels', error);
        await handleCommandError(error, interaction, 'guildlens-setup canais');
    }
}

module.exports = { handleChannelsSetup };
