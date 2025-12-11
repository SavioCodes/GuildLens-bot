// FILE: src/discord/handlers/interactionCreate.js
// Handler for Discord interaction events (slash commands, buttons, context menus)

const logger = require('../../utils/logger');
const { createErrorEmbed } = require('../../utils/embeds');
const { handleCommandError } = require('../../utils/errorHandler');
const maintenanceState = require('../../utils/maintenanceState');
const { BOT_OWNER_ID } = require('../../utils/constants');

// Import services
const ticketHandler = require('../services/ticketHandler');
const userInfoCommand = require('../commands/context/userInfo');

// Import command handlers
const setupCommand = require('../commands/setup');
const healthCommand = require('../commands/health');
const insightsCommand = require('../commands/insights');
const alertsCommand = require('../commands/alerts');
const actionsCommand = require('../commands/actions');
const aboutCommand = require('../commands/about');
const premiumCommand = require('../commands/premium');
const adminCommand = require('../commands/admin');
const communityCommand = require('../commands/community');
const helpCommand = require('../commands/help');
const exportCommand = require('../commands/export');
const leaderboardCommand = require('../commands/leaderboard');
const statsCommand = require('../commands/stats');

const log = logger.child('Interaction');

/**
 * Command registry - maps command names to their handlers
 */
const commands = {
    'guildlens-setup': setupCommand,
    'guildlens-health': healthCommand,
    'guildlens-insights': insightsCommand,
    'guildlens-alerts': alertsCommand,
    'guildlens-actions': actionsCommand,
    'guildlens-about': aboutCommand,
    'guildlens-premium': premiumCommand,
    'guildlens-admin': adminCommand,
    'guildlens-community': communityCommand,
    'guildlens-help': helpCommand,
    'guildlens-export': exportCommand,
    'guildlens-leaderboard': leaderboardCommand,
    'guildlens-stats': statsCommand,
};

/**
 * Handles incoming interactions (slash commands, buttons, etc.)
 * @param {Interaction} interaction - Discord.js Interaction object
 */
async function handleInteractionCreate(interaction) {

    // [BUTTONS] Handle Button Interactions first
    if (interaction.isButton()) {
        const { customId } = interaction;

        if (customId === 'open_ticket') {
            await ticketHandler.handleOpenTicket(interaction);
            return;
        }

        if (customId === 'close_ticket') {
            await ticketHandler.handleCloseTicket(interaction);
            return;
        }

        // Plan Selection Buttons (inside tickets)
        if (customId === 'select_plan_PRO') {
            await ticketHandler.handlePlanSelection(interaction, 'PRO');
            return;
        }

        if (customId === 'select_plan_GROWTH') {
            await ticketHandler.handlePlanSelection(interaction, 'GROWTH');
            return;
        }

        if (customId === 'ticket_help_only') {
            await ticketHandler.handleHelpOnly(interaction);
            return;
        }

        // Member Verification Button
        if (customId === 'verify_member') {
            await handleVerification(interaction);
            return;
        }

        return;
    }

    // [CONTEXT MENU] Handle User Context Interactions
    if (interaction.isUserContextMenuCommand()) {
        if (interaction.commandName === 'Ver Perfil (GuildLens)') {
            try {
                await userInfoCommand.execute(interaction);
            } catch (error) {
                log.error('Context menu failed', error);
                await interaction.reply({ content: '❌ Erro ao abrir perfil.', ephemeral: true });
            }
        }
        return;
    }

    // Only handle slash commands from here
    if (!interaction.isChatInputCommand()) {
        return;
    }

    const { commandName, user, guild } = interaction;

    // [ROBUSTNESS] Maintenance Mode Check
    if (maintenanceState.isEnabled() && user.id !== BOT_OWNER_ID) {
        return interaction.reply({
            content: `🔒 **Sistema em Manutenção**\n${maintenanceState.getReason()}\n\nO bot está temporariamente bloqueado para atualizações. Tente novamente em breve.`,
            flags: 64 // Ephemeral
        });
    }

    // [POLISH] Command Cooldowns (Avoid Spam)
    if (user.id !== BOT_OWNER_ID) {
        const { checkCooldown, error } = require('../../utils/commandUtils');
        const remaining = checkCooldown(user.id, commandName, 3); // 3 seconds default

        if (remaining) {
            return interaction.reply({
                content: `⏳ **Calma aí!** Aguarde ${remaining}s para usar \`/${commandName}\` novamente.`,
                flags: 64
            });
        }
    }

    // [OFFICIAL SERVER] Restrict commands to bot-commands channel
    const OFFICIAL = require('../../utils/official');
    if (guild?.id === OFFICIAL.GUILD_ID) {
        // Channels where commands ARE allowed
        const ALLOWED_COMMAND_CHANNELS = [
            OFFICIAL.CHANNELS.DUVIDAS,  // #dúvidas - for help/support commands
        ];

        // Commands that should be allowed everywhere (tickets, verification)
        const UNRESTRICTED_COMMANDS = ['guildlens-admin'];

        const isAllowedChannel = ALLOWED_COMMAND_CHANNELS.includes(interaction.channelId);
        const isUnrestrictedCmd = UNRESTRICTED_COMMANDS.includes(commandName);
        const isStaff = OFFICIAL.isHighRole(interaction.member);

        if (!isAllowedChannel && !isUnrestrictedCmd && !isStaff) {
            return interaction.reply({
                content: `❌ **Comandos só podem ser usados no canal** <#${OFFICIAL.CHANNELS.DUVIDAS}>!\n\n` +
                    `> Use esse canal para testar comandos e tirar dúvidas.`,
                flags: 64
            });
        }
    }

    log.info(`Command received: /${commandName} by ${user.tag} in ${guild?.name || 'DM'}`);

    // Find the command handler
    const command = commands[commandName];

    if (!command) {
        log.warn(`Unknown command: ${commandName}`);
        try {
            await interaction.reply({
                embeds: [createErrorEmbed(
                    'Comando Desconhecido',
                    `O comando \`/${commandName}\` não existe.`
                )],
                flags: 64, // Ephemeral
            });
        } catch (err) {
            log.error('Failed to reply to unknown command', err);
        }
        return;
    }

    // Execute the command
    try {
        await command.execute(interaction);
        log.success(`Command completed: /${commandName}`);
    } catch (error) {
        log.error(`Command failed: /${commandName}`, error);

        // Use the improved error handler
        await handleCommandError(error, interaction, commandName);
    }

    // [SALES] Attempt Smart Upsell (Post-Command)
    try {
        const upsellService = require('../../services/upsell');
        await upsellService.attemptUpsell(interaction);
    } catch (upsellError) {
        log.warn('Upsell failed silently', 'Interaction');
    }
}

/**
 * Gets command data for registration
 * @returns {Array} Array of command data objects
 */
function getCommandsData() {
    return Object.values(commands)
        .filter(cmd => cmd.data)
        .map(cmd => cmd.data.toJSON());
}

// Local cooldown functions removed - using utils/commandUtils.js

// ========== VERIFICATION HANDLER ==========
const OFFICIAL = require('../../utils/official');
const { EmbedBuilder } = require('discord.js');

async function handleVerification(interaction) {
    const { member, guild, client } = interaction;

    // Only works on official server
    if (guild.id !== OFFICIAL.GUILD_ID) {
        return interaction.reply({ content: 'Este sistema só funciona no servidor oficial.', ephemeral: true });
    }

    const verifiedRole = guild.roles.cache.get(OFFICIAL.ROLES.VERIFIED);
    const memberRole = guild.roles.cache.get(OFFICIAL.ROLES.MEMBER);

    if (!verifiedRole) {
        return interaction.reply({ content: '❌ Cargo de verificação não encontrado.', ephemeral: true });
    }

    // Check if already verified
    if (member.roles.cache.has(verifiedRole.id)) {
        return interaction.reply({ content: '✅ Você já está verificado!', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
        // Add Verified role
        await member.roles.add(verifiedRole);

        // Also add Member role if exists
        if (memberRole) {
            await member.roles.add(memberRole);
        }

        // ========== 1. EPHEMERAL SUCCESS EMBED ==========
        const successEmbed = new EmbedBuilder()
            .setTitle('🎉 Verificação Concluída!')
            .setColor(0x22C55E)
            .setDescription(
                `Bem-vindo(a) à comunidade **GuildLens Official**!\n\n` +
                `Agora você tem acesso completo ao servidor.`
            )
            .addFields(
                {
                    name: '🚀 Próximos Passos',
                    value:
                        `• Apresente-se em <#${OFFICIAL.CHANNELS.GERAL}>\n` +
                        `• Veja os planos em <#${OFFICIAL.CHANNELS.PLANOS}>\n` +
                        `• Dúvidas? Abra um ticket em <#${OFFICIAL.CHANNELS.CRIAR_TICKET}>`,
                    inline: false
                },
                {
                    name: '🎁 Canais Exclusivos',
                    value:
                        `• <#${OFFICIAL.CHANNELS.SUGESTOES}> — Sugira melhorias\n` +
                        `• <#${OFFICIAL.CHANNELS.BUGS}> — Reporte bugs\n` +
                        `• <#${OFFICIAL.CHANNELS.CHANGELOG}> — Novidades`,
                    inline: false
                }
            )
            .setThumbnail(guild.iconURL({ size: 256 }))
            .setFooter({ text: 'GuildLens • Bem-vindo à família!' })
            .setTimestamp();

        await interaction.editReply({ embeds: [successEmbed] });

        // ========== 2. PUBLIC WELCOME MESSAGE ==========
        const welcomeChannel = guild.channels.cache.get(OFFICIAL.CHANNELS.BEM_VINDO);
        if (welcomeChannel) {
            const publicWelcome = new EmbedBuilder()
                .setColor(0x22D3EE)
                .setDescription(
                    `🎉 <@${member.id}> acabou de entrar na comunidade!\n\n` +
                    `Seja bem-vindo(a)! Aproveite para conhecer o servidor e interagir conosco.`
                )
                .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
                .setFooter({ text: `Membro #${guild.memberCount}` })
                .setTimestamp();

            await welcomeChannel.send({ embeds: [publicWelcome] }).catch(() => { });
        }

        // ========== 3. DM WELCOME MESSAGE ==========
        try {
            const dmEmbed = new EmbedBuilder()
                .setTitle('👋 Bem-vindo ao GuildLens Official!')
                .setColor(0x22D3EE)
                .setDescription(
                    `Olá **${member.user.username}**!\n\n` +
                    `Você foi verificado com sucesso no servidor oficial do GuildLens.\n\n` +
                    `📊 **O que é o GuildLens?**\n` +
                    `Um bot de analytics para Discord que ajuda você a entender e crescer sua comunidade.\n\n` +
                    `💎 **Quer turbinar seu servidor?**\n` +
                    `Temos planos a partir de **R$ 19,90/mês** com recursos incríveis!`
                )
                .addFields(
                    {
                        name: '🔗 Links Úteis',
                        value:
                            `• [Adicionar o Bot](https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands)\n` +
                            `• [Servidor Oficial](https://discord.gg/guildlens)`,
                        inline: false
                    }
                )
                .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
                .setFooter({ text: 'GuildLens • Seu parceiro de analytics' });

            await member.send({ embeds: [dmEmbed] });
        } catch {
            // DM closed, ignore
        }

        // Log verification
        log.success(`${member.user.tag} verified (Member #${guild.memberCount})`);

    } catch (error) {
        log.error('Verification failed', error);
        await interaction.editReply({ content: '❌ Erro ao verificar. Contate a Staff.' });
    }
}

module.exports = {
    handleInteractionCreate,
    getCommandsData,
};

