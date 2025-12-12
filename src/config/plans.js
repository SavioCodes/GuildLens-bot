// FILE: src/config/plans.js
// Centralized plans configuration - ÚNICA FONTE DE VERDADE para planos
// Para alterar preços/benefícios, edite APENAS este arquivo

/**
 * =====================================================
 * ESTRATÉGIA DE PREÇOS - GuildLens
 * =====================================================
 * 
 * PÚBLICO: Donos de servidor Discord no Brasil
 * DIFERENCIAL: Preço em BRL, suporte em PT-BR
 * 
 * NOTA: Bots similares geralmente cobram em USD, o que
 * encarece para o público brasileiro. GuildLens é 100% BR.
 */

const PLANS = {
    // =========================================================
    // FREE - Para testar e servidores pequenos
    // =========================================================
    FREE: {
        id: 'free',
        name: 'Free',
        emoji: '🆓',
        price: 0,
        priceDisplay: 'Grátis',

        limits: {
            members: 200,
            historyDays: 7,
            servers: 1,
            exportsPerMonth: 0,
        },

        features: {
            healthScore: 'basic',
            insights: false,
            alerts: false,
            actions: false,
            export: false,
            leaderboard: true,
            stats: 'basic',
            watermark: true,
        },

        support: 'community',
        tagline: 'Para testar',
    },

    // =========================================================
    // PRO - Melhor custo-benefício
    // =========================================================
    PRO: {
        id: 'pro',
        name: 'Pro',
        emoji: '⭐',
        price: 19.90,
        priceDisplay: 'R$ 19,90/mês',

        limits: {
            members: 5000,
            historyDays: 60,
            servers: 1,
            exportsPerMonth: 10,
        },

        features: {
            healthScore: 'full',
            insights: true,
            alerts: true,
            actions: true,
            export: 'json',
            leaderboard: true,
            stats: 'full',
            watermark: false,
        },

        support: 'priority',
        tagline: 'Mais popular',
        highlight: true,
    },

    // =========================================================
    // GROWTH - Para servidores grandes
    // =========================================================
    GROWTH: {
        id: 'growth',
        name: 'Growth',
        emoji: '🚀',
        price: 39.90,
        priceDisplay: 'R$ 39,90/mês',

        limits: {
            members: -1,            // -1 = Ilimitado
            historyDays: 180,
            servers: 3,
            exportsPerMonth: -1,    // -1 = Ilimitado
        },

        features: {
            healthScore: 'full',
            insights: true,
            alerts: true,
            actions: true,
            export: 'full',         // JSON + CSV
            leaderboard: true,
            stats: 'full',
            watermark: false,
        },

        support: 'vip',
        tagline: 'Para servidores grandes',
    },
};

/**
 * Tabela de comparação
 */
const COMPARISON_TABLE = {
    rows: [
        { feature: 'Membros', free: '200', pro: '5.000', growth: 'Ilimitado' },
        { feature: 'Histórico', free: '7 dias', pro: '60 dias', growth: '180 dias' },
        { feature: 'Servidores', free: '1', pro: '1', growth: '3' },
        { feature: 'Health Score', free: 'Básico', pro: 'Completo', growth: 'Completo' },
        { feature: 'Insights', free: '❌', pro: '✅', growth: '✅' },
        { feature: 'Alertas', free: '❌', pro: '✅', growth: '✅' },
        { feature: 'Ações', free: '❌', pro: '✅', growth: '✅' },
        { feature: 'Exportação', free: '❌', pro: 'JSON', growth: 'JSON + CSV' },
        { feature: 'Suporte', free: 'Comunidade', pro: 'Prioritário', growth: 'VIP' },
        { feature: 'Watermark', free: 'Sim', pro: 'Não', growth: 'Não' },
    ],
};

/**
 * Textos de valor
 */
const VALUE_COPY = {
    headline: 'Dados para crescer seu servidor',
    subheadline: 'Entenda sua comunidade com métricas reais',

    proValue:
        'Com o plano PRO você:\n' +
        '• Vê o Health Score completo\n' +
        '• Recebe alertas de queda de atividade\n' +
        '• Descobre quais canais estão ativos\n' +
        '• Exporta dados em JSON',

    growthValue:
        'Com o plano GROWTH você:\n' +
        '• Gerencia até 3 servidores\n' +
        '• Tem 6 meses de histórico\n' +
        '• Exporta em JSON e CSV\n' +
        '• Suporte VIP',
};

/**
 * Helper functions
 */
function getPlan(planId) {
    return PLANS[planId?.toUpperCase()] || PLANS.FREE;
}

function getPlanLimit(planId, limitKey) {
    const plan = getPlan(planId);
    return plan.limits[limitKey] ?? 0;
}

function hasFeature(planId, featureKey) {
    const plan = getPlan(planId);
    const feature = plan.features[featureKey];
    return feature === true || feature === 'full';
}

function isUnlimited(value) {
    return value === -1;
}

function formatLimit(value) {
    if (value === -1) return 'Ilimitado';
    return value.toLocaleString('pt-BR');
}

module.exports = {
    PLANS,
    COMPARISON_TABLE,
    VALUE_COPY,
    getPlan,
    getPlanLimit,
    hasFeature,
    isUnlimited,
    formatLimit,
};
