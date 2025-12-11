/**
 * Upsell Service
 * Logic to subtly promote Premium plans during free interaction.
 */

const subscriptionsRepo = require('../db/repositories/subscriptions');
const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../utils/embeds');

// Tips to show
const TIPS = [
    '💡 **Dica:** No plano **Pro**, você vê histórico de 90 dias em vez de 7.',
    '💡 **Sabia?** Assinantes **Growth** podem exportar todos esses dados para CSV.',
    '💡 **Dica:** O plano **Pro** remove a marca d\'água dos relatórios.',
    '💡 **Upgrade:** Receba alertas automáticos de queda de engajamento no plano **Pro**.',
    '⭐ **Premium:** Junte-se ao nosso grupo de Networking exclusivo no plano **Growth**.'
];

class UpsellService {

    /**
     * Potentially sends an upsell tip based on chance and user plan
     * @param {Interaction} interaction 
     * @param {number} chance (0-1, default 0.05 = 5%)
     */
    async attemptUpsell(interaction, chance = 0.05) {
        // 1. Roll the dice
        if (Math.random() > chance) return false;

        try {
            // 2. Check if user is already premium
            if (!interaction.guildId) return false;

            const plan = await subscriptionsRepo.getPlan(interaction.guildId);
            if (plan !== 'FREE') return false; // Don't upsell to paying users

            // 3. Select random tip
            const tip = TIPS[Math.floor(Math.random() * TIPS.length)];

            // 4. Send ephemeral follow-up
            // Wait a bit to not be annoying immediately
            setTimeout(async () => {
                try {
                    await interaction.followUp({
                        content: `${tip}\n> Use \`/guildlens-premium\` para saber mais. v`,
                        ephemeral: true
                    });
                } catch (err) {
                    // Ignore (interaction might be closed)
                }
            }, 2000);

            return true;
        } catch (error) {
            return false; // Fail silently
        }
    }
}

module.exports = new UpsellService();
