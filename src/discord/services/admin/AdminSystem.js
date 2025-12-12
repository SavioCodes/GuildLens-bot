/**
 * Admin System Service
 * Handles Dashboard, System Stats, View Server (Spy), and Backups.
 */

const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const subscriptionsRepo = require('../../../db/repositories/subscriptions');
const { COLORS, EMOJI } = require('../../../utils/embeds');
const logger = require('../../../utils/logger');

const log = logger.child('AdminSystem');

const AdminSystem = {
    async dashboard(interaction) {
        await interaction.deferReply({ flags: 64 });

        try {
            const stats = await subscriptionsRepo.getStats();
            const recentSubs = await subscriptionsRepo.getRecentActivations(5);
            const guildsCount = interaction.client.guilds.cache.size;

            // Revenue Calc

            const { PLANS } = require('../../../config/plans');
            const proPrice = PLANS.PRO.price;
            const growthPrice = PLANS.GROWTH.price;

            const safeRevenue = (stats?.pro_count || 0) * proPrice + (stats?.growth_count || 0) * growthPrice;
            const potentialRevenue = safeRevenue.toFixed(2);

            const embed = new EmbedBuilder()
                .setTitle(`${EMOJI.CHART} GuildLens Admin Dashboard`)
                .setColor(COLORS.PRIMARY)
                .setDescription(`Visão geral do sistema em **${new Date().toLocaleDateString('pt-BR')}**`)
                .addFields(
                    {
                        name: '💰 Financeiro (MRR)',
                        value: `**R$ ${potentialRevenue}**\n*Receita Mensal Recorrente*`,
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

            if (recentSubs && recentSubs.length > 0) {
                const recentList = recentSubs.map(sub => {
                    const planEmoji = sub.plan === 'growth' ? EMOJI.ROCKET : EMOJI.STAR;
                    const date = new Date(sub.updated_at).toLocaleDateString('pt-BR');
                    const name = sub.guild_name || sub.guild_id;
                    return `${planEmoji} **${name}** • ${date}`;
                }).join('\n');

                embed.addFields({ name: '🕒 Últimas Vendas', value: recentList, inline: false });
            } else {
                embed.addFields({ name: '🕒 Últimas Vendas', value: '_Nenhuma venda recente._', inline: false });
            }

            const yearlyProjection = safeRevenue * 12;
            embed.addFields({ name: '📈 Projeção Anual', value: `R$ ${yearlyProjection.toFixed(2)}`, inline: true });

            embed.setTimestamp().setFooter({
                text: `Painel do Proprietário`,
                iconURL: interaction.user.displayAvatarURL()
            });

            await interaction.editReply({ embeds: [embed] });
            log.success(`Dashboard shown to ${interaction.user.tag}`);

        } catch (error) {
            log.error('Failed to show dashboard', error);
            await interaction.editReply({ content: '❌ Erro ao carregar dashboard.' });
        }
    },

    async spyServer(interaction) {
        const serverId = interaction.options.getString('server_id');
        await interaction.deferReply({ flags: 64 });

        try {
            const guild = interaction.client.guilds.cache.get(serverId);
            const subscription = await subscriptionsRepo.getSubscription(serverId);
            const plan = await subscriptionsRepo.getPlan(serverId);

            const embed = new EmbedBuilder()
                .setTitle(`🕵️ Espião: ${guild ? guild.name : 'Servidor Desconhecido'}`)
                .setColor(COLORS.PRIMARY)
                .addFields(
                    { name: '🆔 ID', value: serverId, inline: true },
                    { name: '👑 Dono', value: guild ? `<@${guild.ownerId}>` : 'N/A', inline: true },
                    { name: '👥 Membros', value: guild ? `${guild.memberCount}` : 'N/A', inline: true },
                    { name: '💎 Plano', value: plan.toUpperCase(), inline: true },
                    { name: '📅 Início', value: subscription?.started_at ? new Date(subscription.started_at).toLocaleDateString() : 'N/A', inline: true },
                    { name: '📅 Expira', value: subscription?.expires_at ? new Date(subscription.expires_at).toLocaleDateString() : 'Nunca', inline: true }
                );

            if (guild) {
                embed.setThumbnail(guild.iconURL());
                embed.addFields({ name: '🎂 Criado em', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true });
            } else {
                embed.setDescription('⚠️ O bot não está neste servidor ou ele não foi encontrado no cache.');
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            log.error('Spy failed', error);
            await interaction.editReply('Erro ao buscar servidor.');
        }
    },

    async systemStats(interaction) {
        const memory = process.memoryUsage();
        const ram = (memory.heapUsed / 1024 / 1024).toFixed(2);
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor(((uptime % 86400) % 3600) / 60);

        const embed = new EmbedBuilder()
            .setTitle('🖥️ Saúde do Sistema')
            .setColor(COLORS.SUCCESS)
            .addFields(
                { name: '🧠 RAM Usada', value: `${ram} MB`, inline: true },
                { name: '📡 Ping API', value: `${interaction.client.ws.ping}ms`, inline: true },
                { name: '⏱️ Uptime', value: `${days}d ${hours}h ${minutes}m`, inline: true },
                { name: '🤖 Node.js', value: process.version, inline: true },
                { name: '🛡️ Guilds', value: `${interaction.client.guilds.cache.size}`, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: 64 });
    },

    async backup(interaction) {
        await interaction.deferReply({ flags: 64 });

        try {
            const stats = await subscriptionsRepo.getStats();
            const guilds = interaction.client.guilds.cache.map(g => ({
                id: g.id,
                name: g.name,
                ownerId: g.ownerId,
                memberCount: g.memberCount,
                joinedAt: g.joinedAt
            }));

            const backupData = {
                timestamp: new Date().toISOString(),
                version: '1.3.0',
                stats: stats,
                guilds: guilds,
            };

            const buffer = Buffer.from(JSON.stringify(backupData, null, 2), 'utf-8');
            const attachment = new AttachmentBuilder(buffer, { name: `guildlens-backup-${Date.now()}.json` });

            await interaction.editReply({
                content: `💾 **Backup Gerado com Sucesso**\nTotal de Servidores: ${guilds.length}`,
                files: [attachment]
            });

            log.success(`Backup generated by ${interaction.user.tag}`);

        } catch (error) {
            log.error('Backup failed', error);
            await interaction.editReply('❌ Falha ao gerar backup.');
        }
    }
};

module.exports = AdminSystem;
