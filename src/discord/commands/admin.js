// FILE: src/discord/commands/admin.js
// Slash command: /guildlens-admin - Admin commands for managing the bot

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const { COLORS, EMOJI } = require('../../utils/embeds');
const subscriptionsRepo = require('../../db/repositories/subscriptions');
const { handleCommandError } = require('../../utils/errorHandler');

const log = logger.child('AdminCommand');

const { BOT_OWNER_ID } = require('../../utils/constants');
const { enforceOfficialPermissions, updateOfficialStats } = require('../handlers/officialServer');
const OFFICIAL = require('../../utils/official');

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
            .setName('dashboard')
            .setDescription('Exibe dashboard financeiro e de métricas')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('fix-permissions')
            .setDescription('Recupera permissões do Servidor Oficial (God Mode)')
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
    const ownerIds = (process.env.OWNER_IDS || '').split(',').map(id => id.trim());

    if (!ownerIds.includes(userId) && userId !== BOT_OWNER_ID) {
        await interaction.reply({
            content: '❌ Este comando é restrito aos administradores do Global GuildLens.',
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
            case 'dashboard':
                await handleDashboard(interaction);
                break;
            case 'fix-permissions':
                await handleFixPermissions(interaction);
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
 * Shows detailed bot dashboard
 */
async function handleDashboard(interaction) {
    await interaction.deferReply({ flags: 64 });

    try {
        const stats = await subscriptionsRepo.getStats();
        const recentSubs = await subscriptionsRepo.getRecentActivations(5);
        const guildsCount = interaction.client.guilds.cache.size;

        // Calculate Revenue
        const revenue = (stats?.pro_count || 0) * 49 + (stats?.growth_count || 0) * 129;
        const potentialRevenue = revenue; // For now assuming all are paid full price

        const embed = new EmbedBuilder()
            .setTitle(`${EMOJI.CHART} GuildLens Admin Dashboard`)
            .setColor(COLORS.PRIMARY)
            .setDescription(`Visão geral do sistema em **${new Date().toLocaleDateString('pt-BR')}**`)
            .addFields(
                {
                    name: '💰 Financeiro (MRR)',
                    value: `**R$ ${revenue.toFixed(2)}**\n*Receita Mensal Recorrente*`,
                    inline: true,
                },
                {
                    name: '📊 Assinaturas Ativas',
                    value: `**${stats?.total_count || 0}** Total\n` +
                        `${EMOJI.STAR} **${stats?.pro_count || 0}** Pro\n` +
                        `${EMOJI.ROCKET} **${stats?.growth_count || 0}** Growth`,
                    inline: true,
                },
                {
                    name: '🌐 Alcance',
                    value: `**${guildsCount}** Servidores\n*Monitorando Comunidades*`,
                    inline: true,
                }
            );

        // Recent Activations Section
        if (recentSubs && recentSubs.length > 0) {
            const recentList = recentSubs.map(sub => {
                const planEmoji = sub.plan === 'growth' ? EMOJI.ROCKET : EMOJI.STAR;
                const date = new Date(sub.updated_at).toLocaleDateString('pt-BR');
                const name = sub.guild_name || sub.guild_id;
                // Add relative time (e.g., "hoje", "ontem") could be nice here but keeping simple
                return `${planEmoji} **${name}** • ${date}`;
            }).join('\n');

            embed.addFields({
                name: '🕒 Últimas Vendas',
                value: recentList,
                inline: false
            });
        } else {
            embed.addFields({
                name: '🕒 Últimas Vendas',
                value: '_Nenhuma venda recente._',
                inline: false
            });
        }

        // Add "Expiring Soon" Warning (Future feature placeholder or simple query if available)
        // For now, adding a footer note about projection
        const yearlyProjection = revenue * 12;
        embed.addFields({
            name: '📈 Projeção Anual',
            value: `R$ ${yearlyProjection.toFixed(2)}`,
            inline: true
        });

        embed.setTimestamp().setFooter({
            text: `Painel do Proprietário • CPF: ***.733.526-**`,
            iconURL: interaction.user.displayAvatarURL() // Personal touch
        });

        await interaction.editReply({ embeds: [embed] });
        log.success(`Dashboard shown to ${interaction.user.tag}`);

    } catch (error) {
        log.error('Failed to show dashboard', 'Admin', error);
        await interaction.editReply({ content: '❌ Erro ao carregar dashboard.' });
    }
}

/**
 * Fixes permissions for the Official Server
 */
async function handleFixPermissions(interaction) {
    if (interaction.guildId !== OFFICIAL.GUILD_ID) {
        await interaction.reply({
            content: '❌ Este comando só funciona no Servidor Oficial.',
            flags: 64,
        });
        return;
    }

    await interaction.deferReply({ flags: 64 });

    try {
        await enforceOfficialPermissions(interaction.guild);
        await updateOfficialStats(interaction.guild);

        await interaction.editReply({
            content: `${EMOJI.CHECK} Permissões do Servidor Oficial foram redefinidas com sucesso!`,
        });

        log.success(`Official permissions enforced by ${interaction.user.tag}`);
    } catch (error) {
        await interaction.editReply({
            content: `❌ Falha ao aplicar permissões: ${error.message}`,
        });
    }
}

module.exports = {
    data,
    execute,
};
