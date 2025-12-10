// FILE: src/discord/commands/context/userInfo.js
// Context Menu: User Info (Right Click on User)

const {
    ContextMenuCommandBuilder,
    ApplicationCommandType,
    EmbedBuilder
} = require('discord.js');
const { COLORS } = require('../../../utils/embeds');
const subscriptionsRepo = require('../../../db/repositories/subscriptions');
const OFFICIAL = require('../../../utils/official');

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName('Ver Perfil (GuildLens)')
        .setType(ApplicationCommandType.User),

    /**
     * Executes the context menu command
     * @param {ContextMenuCommandInteraction} interaction 
     */
    async execute(interaction) {
        const targetUser = interaction.targetUser;
        const targetMember = interaction.targetMember;

        await interaction.deferReply({ ephemeral: true });

        // Basic Info
        const embed = new EmbedBuilder()
            .setAuthor({ name: targetUser.tag, iconURL: targetUser.displayAvatarURL() })
            .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
            .setColor(COLORS.PRIMARY)
            .addFields(
                { name: '🆔 ID', value: `\`${targetUser.id}\``, inline: true },
                { name: '📅 Bot desde', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:d>`, inline: true }
            );

        // If in a guild
        if (targetMember) {
            embed.addFields(
                { name: '📅 Entrou aqui', value: `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:d>`, inline: true },
                { name: '🎨 Cargos', value: targetMember.roles.cache.size > 5 ? `${targetMember.roles.cache.size} cargos` : targetMember.roles.cache.map(r => r.name).join(', ') || 'Nenhum', inline: false }
            );

            // Check if Owner of this Guild
            if (interaction.guild.ownerId === targetUser.id) {
                // Fetch Plan info for this guild
                const plan = await subscriptionsRepo.getPlan(interaction.guild.id);
                embed.addFields({ name: '💎 Plano do Servidor', value: plan.toUpperCase(), inline: true });
            }
        }

        // Official Server Check (If User is in Official Guild)
        // Hard to check if we are not in official guild, but we can check if they have official roles
        // We can't fetch cross-guild unless we fetch the official guild manually.
        try {
            const officialGuild = interaction.client.guilds.cache.get(OFFICIAL.GUILD_ID);
            if (officialGuild) {
                const officialMember = await officialGuild.members.fetch(targetUser.id).catch(() => null);
                if (officialMember) {
                    const isStaff = officialMember.roles.cache.has(OFFICIAL.ROLES.STAFF);
                    const isPro = officialMember.roles.cache.has(OFFICIAL.ROLES.PRO);
                    const isGrowth = officialMember.roles.cache.has(OFFICIAL.ROLES.GROWTH);

                    let badged = [];
                    if (isStaff) badged.push('🛠️ Staff GuildLens');
                    if (isPro) badged.push('⭐ Pro User');
                    if (isGrowth) badged.push('🚀 Growth User');

                    if (badged.length > 0) {
                        embed.addFields({ name: '🏆 Status Oficial', value: badged.join('\n'), inline: false });
                    }
                }
            }
        } catch (e) {
            // Ignore cross-guild fetch errors
        }

        await interaction.editReply({ embeds: [embed] });
    },
};
