// FILE: src/discord/commands/health.js
// Slash command: /guildlens-health

const { SlashCommandBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const { createHealthEmbed, createWarningEmbed } = require('../../utils/embeds');
const { safeReply, safeDefer, checkCooldown, error } = require('../../utils/commandUtils');
const analytics = require('../../services/analytics');
const { addWatermark, getPlanForWatermark } = require('../../utils/planEnforcement');

const log = logger.child('HealthCommand');

const data = new SlashCommandBuilder()
    .setName('guildlens-health')
    .setDescription('Saúde do servidor')
    .setDMPermission(false);

async function execute(interaction) {
    const guildId = interaction.guildId;
    const guildName = interaction.guild.name;

    // Cooldown: 10 seconds
    const remaining = checkCooldown(interaction.user.id, 'health', 10);
    if (remaining) {
        return safeReply(interaction, {
            embeds: [error('Aguarde', `Tente novamente em ${remaining}s.`)],
            flags: 64
        });
    }

    log.info(`Health command in ${guildName}`);
    await safeDefer(interaction);

    try {
        const healthData = await analytics.calculateHealthScore(guildId);

        if (!healthData || healthData.totalMessages === 0) {
            const warningEmbed = createWarningEmbed(
                'Coletando Dados',
                'O bot ainda está coletando dados.\nVolte em algumas horas.'
            );
            return interaction.editReply({ embeds: [warningEmbed] });
        }

        let embed = createHealthEmbed(healthData);
        const plan = await getPlanForWatermark(guildId);
        embed = addWatermark(embed, plan);

        await interaction.editReply({ embeds: [embed] });
        log.success(`Health: ${healthData.score} in ${guildName}`);

    } catch (err) {
        log.error(`Health failed in ${guildName}`, err);
        await interaction.editReply({ embeds: [error('Erro', 'Falha ao calcular. Tente novamente.')] });
    }
}

module.exports = { data, execute };
