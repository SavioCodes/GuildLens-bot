/**
 * Content Manager Service
 * Automates fixed messages in official channels (Rules, FAQ, How-to, etc.)
 * Ensures content is always up-to-date locally.
 */

const { EmbedBuilder } = require('discord.js');
const OFFICIAL = require('../../utils/official');
const logger = require('../../utils/logger');
const { COLORS } = require('../../utils/embeds');

const log = logger.child('ContentManager');

/**
 * Ensures a channel has the correct fixed message.
 * @param {Guild} guild 
 * @param {string} channelId 
 * @param {string|EmbedBuilder} content 
 */
async function ensureChannelContent(guild, channelId, content) {
    const channel = guild.channels.cache.get(channelId);
    if (!channel) {
        log.warn(`Channel not found: ${channelId}`);
        return;
    }

    try {
        // Fetch last messages to check if we already posted
        const messages = await channel.messages.fetch({ limit: 5 });
        const lastMsg = messages.find(m => m.author.id === guild.client.user.id);

        const payload = typeof content === 'string' ? { content } : { embeds: [Array.isArray(content) ? content[0] : content] };

        // If we found a message by us, edit it (to update content)
        if (lastMsg) {
            await lastMsg.edit(payload);
            log.debug(`Updated content in ${channel.name}`);
        } else {
            // Post new
            await channel.send(payload);
            log.info(`Posted new content in ${channel.name}`);
        }
    } catch (error) {
        log.error(`Failed to ensure content for ${channel.name}`, error);
    }
}

/**
 * Fixed Content Definitions
 */
const CONTENT = {
    COMO_USAR: `
✅ **Verificação**
Acesse o canal de verificação e clique no botão para liberar acesso ao servidor.

⚙️ **Comandos** (use em <#${OFFICIAL.CHANNELS.COMMANDS_CHANNEL}>)
• \`/guildlens-health\` — Nota de saúde (0–100)
• \`/guildlens-insights\` — Tendências e picos
• \`/guildlens-stats\` — Estatísticas gerais
• \`/guildlens-leaderboard\` — Ranking de membros
• \`/guildlens-premium\` — Status da assinatura

🎫 **Tickets** (<#${OFFICIAL.CHANNELS.CRIAR_TICKET}>)
• **SUPORTE**: Dúvidas, problemas, bugs
• **VENDAS**: Assinar PRO ou GROWTH

💳 **Como comprar**
1. Abra um Ticket de Vendas
2. Escolha o plano (PRO ou GROWTH)
3. Envie o comprovante Pix no chat
4. Aguarde a staff aprovar

⭐ Deixe seu feedback em <#${OFFICIAL.CHANNELS.AVALIACOES}>!
`,

    FAQ: `
**O que é o GuildLens?**
É um bot de analytics para Discord que analisa a atividade do seu servidor, gera um "Health Score" (nota de saúde) e entrega insights valiosos para ajudar você a engajar e crescer sua comunidade.

**Quais são os planos disponíveis e o que cada um oferece?**
• **FREE**: Grátis. 1 servidor, histórico de 7 dias, até 200 membros. Ideal para testar.
• **PRO (R$ 19,90/mês)**: 1 servidor, histórico de 60 dias, membros ilimitados, insights completos e exportação JSON.
• **GROWTH (R$ 39,90/mês)**: Até 5 servidores, histórico de 365 dias, membros ilimitados, exportação CSV e suporte VIP.

**Como eu compro um plano PRO ou GROWTH?**
Basta abrir um ticket de vendas em nosso canal de tickets. Lá você seleciona o plano, recebe a chave Pix segura e envia o comprovante para aprovação manual da nossa equipe.

**Quanto tempo leva para meu plano ser ativado após o pagamento?**
A ativação é feita manualmente pela staff assim que o pagamento é conferido. Geralmente é rápido, mas depende do horário de disponibilidade da equipe.

**Posso usar o GuildLens em mais de um servidor?**
Nos planos FREE e PRO, a licença é válida para apenas 1 servidor. No plano GROWTH, você pode ativar o bot e seus benefícios em até 5 servidores diferentes.

**O bot lê minhas mensagens privadas ou conteúdo sensível?**
Não. O foco do GuildLens é métrica de atividade (quem falou, quando, em qual canal). Nós não monitoramos nem armazenamos o conteúdo das suas conversas privadas.

**Como cancelo um plano?**
Caso queira cancelar ou alterar sua assinatura, abra um ticket de suporte e solicite o cancelamento diretamente à nossa equipe.

**O GuildLens é só para servidores grandes?**
Funciona para comunidades de qualquer tamanho! O plano FREE é perfeito para servidores menores ou que estão começando e querem entender melhor o engajamento dos membros.
`
};

/**
 * Initializes and syncs all fixed content.
 * @param {Client} client 
 */
async function initializeContent(client) {
    const guild = client.guilds.cache.get(OFFICIAL.GUILD_ID);
    if (!guild) return;

    log.info('Syncing official channel content...');

    // Sync COMO_USAR
    await ensureChannelContent(guild, OFFICIAL.CHANNELS.COMO_USAR, CONTENT.COMO_USAR);

    // Sync FAQ
    await ensureChannelContent(guild, OFFICIAL.CHANNELS.FAQ, CONTENT.FAQ);

    log.success('Official content synced.');
}

module.exports = { initializeContent };
