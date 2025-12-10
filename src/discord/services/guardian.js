/**
 * GUARDIAN MODE
 * Service responsible for protecting the Official Server
 */

const { EmbedBuilder } = require('discord.js');
const OFFICIAL = require('../../utils/official');
const logger = require('../../utils/logger');
const { COLORS } = require('../../utils/embeds');

const log = logger.child('Guardian');

// RULES TEXT (Defined here to ensure it's always correct)
const OFFICIAL_RULES = `
# 📜 Regras do Servidor Oficial GuildLens

Bem-vindo à casa dos bots de elite. Para manter a ordem, siga as diretrizes:

**1. Respeito Absoluto**
Sem ofensas, discursos de ódio ou toxicidade. Somos profissionais.

**2. Zero Spam ou Flood**
Não mande mensagens repetidas. Use os canais corretos.

**3. Proibido Comércio Paralelo**
NÃO venda nada aqui. NÃO mande DM oferecendo serviços.
Só produtos da loja oficial são permitidos.

**4. Divulgação**
Use apenas o canal <#${OFFICIAL.CHANNELS.SEU_SERVIDOR}> para mostrar seu projeto.

**5. Suporte**
Dúvidas? Use <#${OFFICIAL.CHANNELS.DUVIDAS}> ou abra um ticket. Não chame a Staff no privado.

*A violação destas regras resulta em punição automática.*
`;

// REGEX PATTERNS (The Watcher)
const PATTERNS = {
    SALES: /\b(vendo|preço|valor|chama dm|chama pv|pix|barato|promoção|venda)\b/i,
    INSULTS: /\b(lixo|scam|fraude|merda|bosta|caralho|puta|corno|otario|idiota)\b/i,
    PROFANITY_SEVERE: /\b(nigger|faggot|retard|estupr)\b/i
};

/**
 * Checks if a message is safe
 * @param {Message} message - Discord message
 * @returns {Promise<boolean>} True if safe, False if deleted
 */
async function checkContentSafety(message) {
    if (message.author.bot) return true;

    // Ignore Owner and Staff (Bypass)
    if (message.author.id === OFFICIAL.OWNER_ID) return true;
    if (message.member?.roles.cache.has(OFFICIAL.ROLES.STAFF)) return true;

    const content = message.content;

    // 1. Anti-Sales (Only in General/Community channels)
    // Allowed channels for showcase could be excluded, but "Sales" is strict.
    if (PATTERNS.SALES.test(content)) {
        await punish(message, 'Tentativa de Venda/Comércio não autorizado', 'Aviso: Comércio é proibido aqui.');
        return false;
    }

    // 2. Anti-Insult/Difamation
    if (PATTERNS.INSULTS.test(content)) {
        await punish(message, 'Linguagem Ofensiva/Difamação', 'Mantenha o respeito e o profissionalismo.');
        return false;
    }

    // 3. Severe Profanity (Instant Ban could be here, but sticking to delete + log for now)
    if (PATTERNS.PROFANITY_SEVERE.test(content)) {
        await punish(message, 'Linguagem Tóxica Severa', 'Sua mensagem foi removida por toxicidade extrema.');
        return false;
    }

    return true;
}

/**
 * Punishes a user (Delete + DM + Log)
 */
async function punish(message, reason, userMessage) {
    try {
        // 1. Delete
        if (message.deletable) await message.delete();

        // 2. DM User
        try {
            await message.author.send(`🛑 **Sua mensagem foi removida do GuildLens Oficial**\nMotivo: ${reason}\n\n*${userMessage}*`);
        } catch (e) {
            // DM closed, ignore
        }

        // 3. Log Secretly
        await logAction(message.guild, message.author, reason, message.content);

        log.info(`Guardian intercepted: ${message.author.tag} - ${reason}`);
    } catch (error) {
        log.error('Failed to punish user', 'Guardian', error);
    }
}

/**
 * Logs action to the Secret Channel
 */
async function logAction(guild, user, reason, content) {
    const channel = guild.channels.cache.get(OFFICIAL.CHANNELS.LOGS_SECRET);
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setTitle('🛡️ Guardian Intercept')
        .setColor(COLORS.ERROR)
        .addFields(
            { name: 'Infrator', value: `${user.tag} (${user.id})`, inline: true },
            { name: 'Motivo', value: reason, inline: true },
            { name: 'Conteúdo Original', value: content ? `\`\`\`${content.slice(0, 1000)}\`\`\`` : '*Sem texto*' }
        )
        .setTimestamp();

    await channel.send({ embeds: [embed] });
}

/**
 * Restores essential channel content (Rules)
 * @param {Guild} guild - The Official Guild
 */
async function restoreChannelContent(guild) {
    try {
        // REGRAS
        const rulesChannel = guild.channels.cache.get(OFFICIAL.CHANNELS.REGRAS);
        if (rulesChannel && rulesChannel.isTextBased()) {
            const messages = await rulesChannel.messages.fetch({ limit: 5 });
            const lastMessage = messages.first();

            // If empty or last message isn't from this bot, reset.
            // Also checking if content matches roughly to avoid loop if slight change.
            const needsRestore = !lastMessage || lastMessage.author.id !== guild.client.user.id;

            if (needsRestore) {
                log.info('Guardian restoring #regras...');

                // Clear channel (bulk delete if possible)
                if (messages.size > 0) {
                    await rulesChannel.bulkDelete(messages).catch(() => { });
                }

                const embed = new EmbedBuilder()
                    .setColor(COLORS.PRIMARY)
                    .setDescription(OFFICIAL_RULES)
                    .setImage('https://media.discordapp.net/attachments/123456789/123456789/banner_rules.png'); // Placeholder or specific image if user has one, removing image for now to stay clean text unless requested.

                // Pure text is better for rules sometimes, but Embed is prettier.
                // User asked for "Check if text is there".

                await rulesChannel.send({
                    content: OFFICIAL_RULES, // Sending as plain text (markdown) as requested "verify if text is there"
                });

                await logSystemAction(guild, 'Conteúdo Restaurado: #regras');
            }
        }
    } catch (error) {
        log.error('Failed to restore content', 'Guardian', error);
    }
}

/**
 * Logs system actions (Startup/Restore) to Secret Logs
 */
async function logSystemAction(guild, action) {
    const channel = guild.channels.cache.get(OFFICIAL.CHANNELS.LOGS_SECRET);
    if (!channel) return;
    await channel.send(`🤖 **Guardian System:** ${action}`);
}

module.exports = {
    checkContentSafety,
    restoreChannelContent,
    logSystemAction
};
