/**
 * Auto-Response System for Official Server
 * Handles FAQ, common questions, and smart replies
 */

const { EmbedBuilder } = require('discord.js');
const OFFICIAL = require('../../utils/official');
const logger = require('../../utils/logger');

const log = logger.child('AutoResponse');

// FAQ Database - Common questions and answers
const FAQ_DATABASE = [
    {
        keywords: ['preço', 'preco', 'quanto custa', 'valor', 'custo'],
        title: '💰 Preços dos Planos',
        answer:
            '**Nossos planos:**\n\n' +
            '⭐ **PRO:** R$ 19,90/mês\n' +
            '🚀 **GROWTH:** R$ 39,90/mês\n\n' +
            'Para assinar, abra um ticket em <#' + OFFICIAL.CHANNELS.CRIAR_TICKET + '>!'
    },
    {
        keywords: ['como funciona', 'o que faz', 'what does', 'funcionalidade'],
        title: '📊 O Que é o GuildLens?',
        answer:
            'O GuildLens é um **bot de analytics** para Discord!\n\n' +
            '• Monitora a atividade do servidor\n' +
            '• Gera Health Scores da comunidade\n' +
            '• Identifica membros ativos/inativos\n' +
            '• Exporta relatórios detalhados\n\n' +
            'Veja mais em <#' + OFFICIAL.CHANNELS.COMO_USAR + '>!'
    },
    {
        keywords: ['como adicionar', 'add bot', 'adicionar bot', 'invite', 'convite'],
        title: '🤖 Como Adicionar o Bot',
        answer:
            'Para adicionar o GuildLens:\n\n' +
            '1. Use o link de convite oficial\n' +
            '2. Selecione seu servidor\n' +
            '3. Autorize as permissões\n' +
            '4. Use `/guildlens-setup` para configurar!\n\n' +
            'Dúvidas? Abra um ticket!'
    },
    {
        keywords: ['pix', 'pagamento', 'pagar', 'forma de pagamento'],
        title: '💳 Formas de Pagamento',
        answer:
            'Aceitamos **somente PIX** no momento.\n\n' +
            '✅ Pagamento instantâneo\n' +
            '✅ Ativação em até 5 minutos\n' +
            '✅ Chave PIX fornecida no ticket\n\n' +
            '⚠️ **NUNCA** pague fora do sistema de tickets!'
    },
    {
        keywords: ['cancelar', 'reembolso', 'devolução', 'desistir'],
        title: '🔄 Cancelamento e Reembolso',
        answer:
            'Para cancelar sua assinatura:\n\n' +
            '1. Abra um ticket em <#' + OFFICIAL.CHANNELS.CRIAR_TICKET + '>\n' +
            '2. Solicite o cancelamento\n' +
            '3. Aguarde confirmação\n\n' +
            '📌 Reembolso proporcional para novos clientes (7 dias).'
    },
    {
        keywords: ['comandos', 'comando', 'slash', 'commands'],
        title: '⌨️ Comandos Disponíveis',
        answer:
            '**Principais comandos:**\n\n' +
            '`/guildlens-setup` — Configurar o bot\n' +
            '`/guildlens-health` — Ver saúde do servidor\n' +
            '`/guildlens-insights` — Análises detalhadas\n' +
            '`/guildlens-stats` — Estatísticas rápidas\n' +
            '`/guildlens-help` — Lista completa'
    },
    {
        keywords: ['suporte', 'ajuda', 'help', 'problema', 'erro', 'bug'],
        title: '🆘 Precisa de Ajuda?',
        answer:
            'Para suporte técnico:\n\n' +
            '1. Descreva o problema detalhadamente\n' +
            '2. Se possível, envie prints\n' +
            '3. Abra um ticket para casos complexos\n\n' +
            '🎫 <#' + OFFICIAL.CHANNELS.CRIAR_TICKET + '>'
    }
];

// Greeting responses
const GREETINGS = ['oi', 'olá', 'ola', 'oie', 'eae', 'eai', 'bom dia', 'boa tarde', 'boa noite', 'hello', 'hi'];

/**
 * Checks if message matches any FAQ patterns
 * @param {Message} message 
 * @returns {boolean} True if handled
 */
async function handleAutoResponse(message) {
    // Only in specific channels
    const allowedChannels = [
        OFFICIAL.CHANNELS.DUVIDAS,
        OFFICIAL.CHANNELS.GERAL
    ];

    if (!allowedChannels.includes(message.channel.id)) return false;

    const content = message.content.toLowerCase().trim();

    // Skip very short or very long messages
    if (content.length < 3 || content.length > 200) return false;

    // Check for greetings first
    if (GREETINGS.some(g => content === g || content.startsWith(g + ' '))) {
        // Don't respond to every greeting, add some randomness
        if (Math.random() > 0.3) return false;

        await message.reply({
            content: `Olá <@${message.author.id}>! 👋 Como posso ajudar?\n\n` +
                `💡 Dica: Descreva sua dúvida que tentarei responder automaticamente!`
        });
        return true;
    }

    // Check FAQ database
    for (const faq of FAQ_DATABASE) {
        const matches = faq.keywords.some(keyword => content.includes(keyword));

        if (matches) {
            const embed = new EmbedBuilder()
                .setColor(0x22D3EE)
                .setTitle(faq.title)
                .setDescription(faq.answer)
                .setFooter({
                    text: '🤖 Resposta automática • Ficou com dúvida? Pergunte novamente!',
                });

            await message.reply({ embeds: [embed] });
            log.debug(`Auto-responded to FAQ: ${faq.title}`);
            return true;
        }
    }

    return false;
}

/**
 * Checks message for spam patterns
 * @param {Message} message 
 * @returns {object} Spam detection result
 */
function detectSpam(message) {
    const content = message.content;
    const issues = [];

    // All caps check
    if (content.length > 10) {
        const upperCount = (content.match(/[A-Z]/g) || []).length;
        const letterCount = (content.match(/[a-zA-Z]/g) || []).length;
        if (letterCount > 0 && (upperCount / letterCount) > 0.7) {
            issues.push('CAPS_LOCK');
        }
    }

    // Repeated characters (5+)
    if (/(.)\1{5,}/.test(content)) {
        issues.push('REPEATED_CHARS');
    }

    // Discord invite links (if not allowed)
    if (/discord\.gg\/|discord\.com\/invite\//i.test(content)) {
        issues.push('INVITE_LINK');
    }

    // Excessive mentions
    const mentions = (content.match(/<@[!&]?\d+>/g) || []).length;
    if (mentions > 5) {
        issues.push('MASS_MENTION');
    }

    // Excessive emojis
    const emojis = (content.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu) || []).length;
    if (emojis > 10) {
        issues.push('EMOJI_SPAM');
    }

    return {
        isSpam: issues.length > 0,
        issues
    };
}

/**
 * Warns user about spam behavior
 * @param {Message} message 
 * @param {string[]} issues 
 */
async function warnSpam(message, issues) {
    const issueMessages = {
        'CAPS_LOCK': 'Evite escrever em CAPS LOCK',
        'REPEATED_CHARS': 'Evite repetir caracteres excessivamente',
        'INVITE_LINK': 'Links de convite não são permitidos aqui',
        'MASS_MENTION': 'Evite mencionar muitas pessoas',
        'EMOJI_SPAM': 'Muitos emojis! Modere o uso.'
    };

    const warnings = issues.map(i => issueMessages[i] || i).join('\n• ');

    try {
        await message.reply({
            content: `⚠️ <@${message.author.id}>, atenção:\n\n• ${warnings}\n\nContinue assim e será punido.`,
            allowedMentions: { users: [message.author.id] }
        });
    } catch (error) {
        log.error('Failed to warn user about spam', error);
    }
}

module.exports = {
    handleAutoResponse,
    detectSpam,
    warnSpam,
    FAQ_DATABASE
};
