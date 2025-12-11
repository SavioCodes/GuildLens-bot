// FILE: src/discord/commands/actions.js
// Slash command: /guildlens-actions

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const { safeReply, safeDefer, checkCooldown, error, success, warning, CMD_COLORS } = require('../../utils/commandUtils');
const recommendations = require('../../services/recommendations');
const { checkPlanLimit } = require('../../utils/planEnforcement');

const log = logger.child('ActionsCommand');

const data = new SlashCommandBuilder()
    .setName('guildlens-actions')
    .setDescription('Ações recomendadas para o servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false);

async function execute(interaction) {
    const guildId = interaction.guildId;
    const guildName = interaction.guild.name;

    // Cooldown: 20 seconds
    const remaining = checkCooldown(interaction.user.id, 'actions', 20);
    if (remaining) {
        return safeReply(interaction, {
            embeds: [error('Aguarde', `Tente novamente em ${remaining}s.`)],
            flags: 64
        });
    }

    log.info(`Actions command in ${guildName}`);
    await safeDefer(interaction);

    try {
        // Check plan
        const planCheck = await checkPlanLimit(guildId, 'ACTIONS');
        if (!planCheck.allowed) {
            return interaction.editReply({
                embeds: [error('Recurso Premium', planCheck.message)]
            });
        }

        const actions = await recommendations.getRecommendations(guildId);

        if (!actions || actions.length === 0) {
            return interaction.editReply({
                embeds: [success('Tudo Certo', 'Não há ações recomendadas no momento.')]
            });
        }

        const actionsList = actions.slice(0, 5).map((action, i) => {
            const priority = action.priority === 'high' ? '🔴' : action.priority === 'medium' ? '🟡' : '🟢';
            return `${priority} **${action.title}**\n${action.description}`;
        }).join('\n\n');

        const embed = new EmbedBuilder()
            .setColor(CMD_COLORS.WARNING)
            .setTitle('Ações Recomendadas')
            .setDescription(actionsList)
            .setFooter({ text: `${actions.length} ações encontradas` })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        log.success(`${actions.length} actions shown in ${guildName}`);

    } catch (err) {
        log.error(`Actions failed in ${guildName}`, err);
        await interaction.editReply({ embeds: [error('Erro', 'Falha ao carregar ações.')] });
    }
}

module.exports = { data, execute };
