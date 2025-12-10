// FILE: src/discord/handlers/guildCreate.js
// Handler for the Discord 'guildCreate' event (bot joins a new server)

const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const logger = require('../../utils/logger');
const guildsRepo = require('../../db/repositories/guilds');
const settingsRepo = require('../../db/repositories/settings');
const { COLORS } = require('../../utils/embeds');
const OFFICIAL = require('../../utils/official');

const log = logger.child('GuildCreate');

/**
 * Handles the guildCreate event when the bot joins a new server
 * @param {Guild} guild - Discord.js Guild object
 */
async function handleGuildCreate(guild) {
    log.info(`Joined new guild: ${guild.name} (${guild.id})`);
    log.info(`Members: ${guild.memberCount}`);

    try {
        // Register the guild in the database
        await guildsRepo.upsertGuild(guild.id, guild.name);

        // Initialize default settings
        await settingsRepo.ensureSettings(guild.id);

        log.success(`Guild registered successfully: ${guild.name}`);

        // [POLISH] Smart Welcome Message
        await sendWelcomeMessage(guild);

    } catch (error) {
        log.error(`Failed to register guild ${guild.name}`, 'GuildCreate', error);
    }
}

/**
 * Finds a suitable channel and sends the welcome message
 * @param {Guild} guild 
 */
async function sendWelcomeMessage(guild) {
    try {
        // Try to find System Channel (default welcome channel)
        let channel = guild.systemChannel;

        // If no system channel, find first text channel we can write to
        if (!channel) {
            channel = guild.channels.cache.find(c =>
                c.type === ChannelType.GuildText &&
                c.permissionsFor(guild.members.me).has(PermissionFlagsBits.SendMessages) &&
                c.permissionsFor(guild.members.me).has(PermissionFlagsBits.ViewChannel)
            );
        }

        if (!channel) {
            log.warn(`Could not find a channel to send welcome message in ${guild.name}`);
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('🦅 Obrigado por adicionar o GuildLens!')
            .setDescription(
                'Eu sou seu novo assistente de métricas e crescimento.\n' +
                'Estou aqui para ajudar você a entender e expandir sua comunidade.'
            )
            .setColor(COLORS.PRIMARY)
            .addFields(
                { name: '🚀 Como começar?', value: 'Use o comando `/guildlens-setup` para configurar seus canais de estatísticas.' },
                { name: '📊 O que eu falço?', value: 'Analiso mensagens, atividade de voz e membros para te dar insights valiosos.' },
                { name: '🆘 Precisa de ajuda?', value: 'Use `/guildlens-help` ou entre no nosso servidor de suporte.' }
            )
            .setThumbnail(guild.client.user.displayAvatarURL())
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Entrar no Suporte')
                    .setStyle(ButtonStyle.Link)
                    .setURL(OFFICIAL.LINKS.SERVER),
                new ButtonBuilder()
                    .setLabel('Ver Planos')
                    .setStyle(ButtonStyle.Primary)
                    .setCustomId('premium_info_btn') // Handled by interactionCreate if we add button handler, or just link to command
                    .setDisabled(true) // Disabled for now as we don't need button handler complexity yet, use command
            );

        // Actually, let's just point to commands for now to keep it simple and robust
        const rowSimple = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Entrar no Suporte Oficial')
                    .setStyle(ButtonStyle.Link)
                    .setURL(OFFICIAL.LINKS.SERVER)
            );

        await channel.send({ embeds: [embed], components: [rowSimple] });
        log.info(`Sent welcome message to ${channel.name} in ${guild.name}`);

    } catch (error) {
        log.error('Failed to send welcome message', 'GuildCreate', error);
    }
}

/**
 * Handles the guildDelete event when the bot is removed from a server
 * @param {Guild} guild - Discord.js Guild object
 */
async function handleGuildDelete(guild) {
    log.info(`Left guild: ${guild.name} (${guild.id})`);

    try {
        // Keep the data in the database for now (in case the bot is re-added)
        log.info(`Guild data retained for: ${guild.name}`);
    } catch (error) {
        log.error(`Error handling guild leave for ${guild.name}`, 'GuildDelete', error);
    }
}

/**
 * Handles the guildUpdate event when a guild's info changes
 * @param {Guild} oldGuild - Old guild state
 * @param {Guild} newGuild - New guild state
 */
async function handleGuildUpdate(oldGuild, newGuild) {
    // Only react to name changes
    if (oldGuild.name !== newGuild.name) {
        log.info(`Guild renamed: ${oldGuild.name} -> ${newGuild.name}`);

        try {
            await guildsRepo.updateGuildName(newGuild.id, newGuild.name);
            log.success(`Guild name updated in database`);
        } catch (error) {
            log.error(`Failed to update guild name`, 'GuildUpdate', error);
        }
    }
}

module.exports = {
    handleGuildCreate,
    handleGuildDelete,
    handleGuildUpdate,
};
