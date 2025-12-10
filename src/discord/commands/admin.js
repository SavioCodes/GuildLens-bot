// FILE: src/discord/commands/admin.js
// Slash command: /guildlens-admin - Admin commands for managing the bot

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const { COLORS, EMOJI } = require('../../utils/embeds');
const subscriptionsRepo = require('../../db/repositories/subscriptions');
const { handleCommandError } = require('../../utils/errorHandler');

const log = logger.child('AdminCommand');

const { BOT_OWNER_ID } = require('../../utils/constants');

/**
 * Command data for registration
 */
const data = new SlashCommandBuilder()
    .setName('guildlens-admin')
    .setDescription('Comandos administrativos do GuildLens (apenas para o dono)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addSubcommand(subcommand =>
        subcommand
            .setName('activate-pro')
            .setDescription('Ativa o plano Pro para um servidor')
            .addStringOption(option =>
                option
                    .setName('server_id')
                    .setDescription('ID do servidor (deixe vazio para este servidor)')
            )
            .addIntegerOption(option =>
                option
                    .setName('dias')
                    .setDescription('Dias de validade (deixe vazio para permanente)')
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('activate-growth')
            .setDescription('Ativa o plano Growth para um servidor')
            .addStringOption(option =>
                option
                    .setName('server_id')
                    .setDescription('ID do servidor (deixe vazio para este servidor)')
            )
            .addIntegerOption(option =>
                option
                    .setName('dias')
                    .setDescription('Dias de validade (deixe vazio para permanente)')
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('reset-plan')
            .setDescription('Reseta um servidor para o plano Free')
            .addStringOption(option =>
                option
                    .setName('server_id')
                    .setDescription('ID do servidor (deixe vazio para este servidor)')
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('check-plan')
            .setDescription('Verifica o plano de um servidor')
            .addStringOption(option =>
                option
                    .setName('server_id')
                    .setDescription('ID do servidor (deixe vazio para este servidor)')
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('stats')
            .setDescription('Mostra estatísticas gerais do bot')
    );

/**
 * Executes the admin command
 * @param {Interaction} interaction - Discord interaction
 */
async function execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    log.info(`Admin command: ${subcommand} by ${interaction.user.tag}`);

    // Check if user is bot owner
    if (userId !== BOT_OWNER_ID) {
        await interaction.reply({
            content: '❌ Este comando é restrito ao dono do bot.',
            flags: 64,
        });
        return;
    }

    try {
        switch (subcommand) {
            case 'activate-pro':
                await handleActivatePro(interaction);
                break;
            case 'activate-growth':
                await handleActivateGrowth(interaction);
                break;
            case 'reset-plan':
                await handleResetPlan(interaction);
                break;
            case 'check-plan':
                await handleCheckPlan(interaction);
                break;
            case 'stats':
                await handleStats(interaction);
                break;
            default:
                await interaction.reply({
                    content: '❌ Subcomando inválido.',
                    flags: 64,
                });
        }
    } catch (error) {
        log.error('Admin command failed', 'Admin', error);
        await handleCommandError(error, interaction, 'guildlens-admin');
    }
}

/**
 * Activates Pro plan for a server
 */
async function handleActivatePro(interaction) {
    const serverId = interaction.options.getString('server_id') || interaction.guildId;
    const days = interaction.options.getInteger('dias');

    await subscriptionsRepo.activatePro(serverId, days);

    const embed = new EmbedBuilder()
        .setTitle(`${EMOJI.CHECK} Plano Pro Ativado`)
        .setColor(COLORS.SUCCESS)
        .setDescription(`O plano **Pro** foi ativado para o servidor **${serverId}**.`)
        .addFields(
            {
                name: 'Validade',
                value: days ? `${days} dias` : 'Permanente',
                inline: true,
            },
            {
                name: 'Servidor',
                value: serverId,
                inline: true,
            }
        )
        .setTimestamp()
        .setFooter({ text: 'GuildLens Admin' });

    await interaction.reply({
        embeds: [embed],
        flags: 64,
    });

    log.success(`Pro activated for ${serverId} by ${interaction.user.tag}`);
}

/**
 * Activates Growth plan for a server
 */
async function handleActivateGrowth(interaction) {
    const serverId = interaction.options.getString('server_id') || interaction.guildId;
    const days = interaction.options.getInteger('dias');

    await subscriptionsRepo.activateGrowth(serverId, days);

    const embed = new EmbedBuilder()
        .setTitle(`${EMOJI.ROCKET} Plano Growth Ativado`)
        .setColor(COLORS.SUCCESS)
        .setDescription(`O plano **Growth** foi ativado para o servidor **${serverId}**.`)
        .addFields(
            {
                name: 'Validade',
                value: days ? `${days} dias` : 'Permanente',
                inline: true,
            },
            {
                name: 'Servidor',
                value: serverId,
                inline: true,
            }
        )
        .setTimestamp()
        .setFooter({ text: 'GuildLens Admin' });

    await interaction.reply({
        embeds: [embed],
        flags: 64,
    });

    log.success(`Growth activated for ${serverId} by ${interaction.user.tag}`);
}

/**
 * Resets a server to Free plan
 */
async function handleResetPlan(interaction) {
    const serverId = interaction.options.getString('server_id') || interaction.guildId;

    await subscriptionsRepo.resetToFree(serverId);

    const embed = new EmbedBuilder()
        .setTitle(`${EMOJI.INFO} Plano Resetado`)
        .setColor(COLORS.WARNING)
        .setDescription(`O servidor **${serverId}** foi resetado para o plano **Free**.`)
        .setTimestamp()
        .setFooter({ text: 'GuildLens Admin' });

    await interaction.reply({
        embeds: [embed],
        flags: 64,
    });

    log.success(`Plan reset for ${serverId} by ${interaction.user.tag}`);
}

/**
 * Checks a server's plan
 */
async function handleCheckPlan(interaction) {
    const serverId = interaction.options.getString('server_id') || interaction.guildId;

    const subscription = await subscriptionsRepo.getSubscription(serverId);
    const plan = await subscriptionsRepo.getPlan(serverId);
    const limits = subscriptionsRepo.PlanLimits[plan];

    const embed = new EmbedBuilder()
        .setTitle(`${EMOJI.CHART} Informações do Plano`)
        .setColor(COLORS.INFO)
        .addFields(
            {
                name: 'Servidor',
                value: serverId,
                inline: true,
            },
            {
                name: 'Plano',
                value: limits.name,
                inline: true,
            },
            {
                name: 'Preço',
                value: limits.price > 0 ? `R$ ${(limits.price / 100).toFixed(2)}/mês` : 'Gratuito',
                inline: true,
            },
            {
                name: 'Início',
                value: subscription?.started_at
                    ? new Date(subscription.started_at).toLocaleDateString('pt-BR')
                    : 'N/A',
                inline: true,
            },
            {
                name: 'Expira',
                value: subscription?.expires_at
                    ? new Date(subscription.expires_at).toLocaleDateString('pt-BR')
                    : 'Nunca',
                inline: true,
            },
            {
                name: 'Histórico',
                value: `${limits.historyDays} dias`,
                inline: true,
            }
        )
        .setTimestamp()
        .setFooter({ text: 'GuildLens Admin' });

    await interaction.reply({
        embeds: [embed],
        flags: 64,
    });
}

/**
 * Shows bot statistics
 */
async function handleStats(interaction) {
    const stats = await subscriptionsRepo.getStats();
    const guildsCount = interaction.client.guilds.cache.size;

    const embed = new EmbedBuilder()
        .setTitle(`${EMOJI.CHART} Estatísticas do GuildLens`)
        .setColor(COLORS.PRIMARY)
        .addFields(
            {
                name: 'Servidores Discord',
                value: `${guildsCount}`,
                inline: true,
            },
            {
                name: 'Plano Free',
                value: `${stats?.free_count || 0}`,
                inline: true,
            },
            {
                name: 'Plano Pro',
                value: `${stats?.pro_count || 0}`,
                inline: true,
            },
            {
                name: 'Plano Growth',
                value: `${stats?.growth_count || 0}`,
                inline: true,
            },
            {
                name: 'Total Assinaturas',
                value: `${stats?.total_count || 0}`,
                inline: true,
            },
            {
                name: 'Receita Potencial',
                value: `R$ ${((stats?.pro_count || 0) * 49 + (stats?.growth_count || 0) * 129).toFixed(2)}/mês`,
                inline: true,
            }
        )
        .setTimestamp()
        .setFooter({ text: 'GuildLens Admin' });

    await interaction.reply({
        embeds: [embed],
        flags: 64,
    });

    log.success(`Stats shown to ${interaction.user.tag}`);
}

module.exports = {
    data,
    execute,
};
