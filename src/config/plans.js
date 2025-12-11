// FILE: src/config/plans.js
// Centralized plans configuration - ÚNICA FONTE DE VERDADE para planos
// Para alterar preços/benefícios, edite APENAS este arquivo

/**
 * =====================================================
 * ESTRATÉGIA DE PREÇOS - GuildLens
 * =====================================================
 * 
 * PÚBLICO: Donos de servidor Discord no Brasil
 * CONCORRÊNCIA: Statbot, MEE6 Analytics (ambos em USD)
 * DIFERENCIAL: Preço em BRL, suporte em PT-BR, foco em comunidades BR
 * 
 * PSICOLOGIA APLICADA:
 * 1. FREE limitado o suficiente para sentir necessidade
 * 2. PRO como "melhor custo-benefício" (âncora positiva)
 * 3. GROWTH como "investimento sério" (faz PRO parecer barato)
 * 4. Preços terminando em ,90 (padrão BR)
 * 
 * COMPARAÇÃO DE VALOR:
 * - Statbot Pro: ~$5/mês = R$30+ (sem suporte BR)
 * - MEE6 Premium: ~$12/mês = R$70+ (muitos recursos inúteis)
 * - GuildLens PRO: R$14,90 = 50% mais barato, 100% brasileiro
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

        // Limites
        limits: {
            members: 200,           // Força upgrade rápido
            historyDays: 7,         // Mostra valor mas limita análise
            servers: 1,
            exportsPerMonth: 0,     // Sem export
        },

        // Recursos
        features: {
            healthScore: 'basic',   // Só score, sem detalhes
            insights: false,
            alerts: false,
            actions: false,
            export: false,
            leaderboard: true,      // Mantém para engajar
            stats: 'basic',
            watermark: true,        // Mostra que é Free
        },

        // Suporte
        support: 'community',       // Só servidor público

        // Marketing
        tagline: 'Para testar',
        targetAudience: 'Servidores novos ou pequenos querendo experimentar',
        callToAction: 'Comece agora',
    },

    // =========================================================
    // PRO - Melhor custo-benefício (ÂNCORA PRINCIPAL)
    // =========================================================
    PRO: {
        id: 'pro',
        name: 'Pro',
        emoji: '⭐',
        price: 14.90,
        priceDisplay: 'R$ 14,90/mês',

        // Limites
        limits: {
            members: 5000,          // Cobre 95% dos servidores
            historyDays: 60,        // 2 meses de análise
            servers: 1,
            exportsPerMonth: 10,
        },

        // Recursos
        features: {
            healthScore: 'full',    // Completo com breakdown
            insights: true,
            alerts: true,
            actions: true,
            export: 'json',         // Só JSON
            leaderboard: true,
            stats: 'full',
            watermark: false,
        },

        // Suporte
        support: 'priority',        // Resposta em 24h

        // Marketing
        tagline: 'Mais popular',
        highlight: true,            // Destacar na UI
        targetAudience: 'Comunidades que levam crescimento a sério',
        callToAction: 'Escolha mais popular',

        // Valor comparativo
        valueProps: [
            'Menos que um lanche por mês',
            'Dados que você pagaria R$100+ para ter de outra forma',
            '60 dias de histórico = você vê padrões reais',
        ],
    },

    // =========================================================
    // GROWTH - Para servidores grandes (FAZ PRO PARECER BARATO)
    // =========================================================
    GROWTH: {
        id: 'growth',
        name: 'Growth',
        emoji: '🚀',
        price: 34.90,
        priceDisplay: 'R$ 34,90/mês',

        // Limites
        limits: {
            members: -1,            // Ilimitado
            historyDays: 180,       // 6 meses
            servers: 3,             // Múltiplos servidores
            exportsPerMonth: -1,    // Ilimitado
        },

        // Recursos
        features: {
            healthScore: 'full',
            insights: true,
            alerts: true,
            actions: true,
            export: 'full',         // JSON + CSV
            leaderboard: true,
            stats: 'full',
            watermark: false,
            apiAccess: true,        // Acesso à API
            customReports: false,   // TODO: Implementar
        },

        // Suporte
        support: 'vip',             // Resposta em 4h

        // Marketing
        tagline: 'Para servidores grandes',
        targetAudience: 'Comunidades 5k+ ou quem gerencia múltiplos servidores',
        callToAction: 'Escale com dados',

        // Valor comparativo
        valueProps: [
            '3 servidores = R$11,60 cada (mais barato que PRO individual)',
            '6 meses de histórico = você vê sazonalidade real',
            'API = integre com suas ferramentas',
        ],
    },
};

/**
 * Tabela de comparação para exibição
 */
const COMPARISON_TABLE = {
    rows: [
        {
            feature: 'Membros',
            free: '200',
            pro: '5.000',
            growth: 'Ilimitado',
        },
        {
            feature: 'Histórico',
            free: '7 dias',
            pro: '60 dias',
            growth: '180 dias',
        },
        {
            feature: 'Servidores',
            free: '1',
            pro: '1',
            growth: '3',
        },
        {
            feature: 'Health Score',
            free: 'Básico',
            pro: 'Completo',
            growth: 'Completo',
        },
        {
            feature: 'Insights',
            free: '❌',
            pro: '✅',
            growth: '✅',
        },
        {
            feature: 'Alertas',
            free: '❌',
            pro: '✅',
            growth: '✅',
        },
        {
            feature: 'Ações Recomendadas',
            free: '❌',
            pro: '✅',
            growth: '✅',
        },
        {
            feature: 'Exportação',
            free: '❌',
            pro: 'JSON',
            growth: 'JSON + CSV',
        },
        {
            feature: 'Suporte',
            free: 'Comunidade',
            pro: '24h',
            growth: '4h VIP',
        },
        {
            feature: 'Watermark',
            free: '✅',
            pro: '❌',
            growth: '❌',
        },
    ],
};

/**
 * Textos de valor para convencer
 */
const VALUE_COPY = {
    headline: 'Dados que pagam o investimento em 1 semana',
    subheadline: 'Quanto você perde por mês sem saber por que os membros saem?',

    proValue:
        'Por menos de **R$0,50 por dia**, você:\n' +
        '• Descobre os horários de pico do seu servidor\n' +
        '• Recebe alertas antes de perder membros\n' +
        '• Vê quais canais estão morrendo\n' +
        '• Exporta dados para apresentar para a equipe',

    growthValue:
        'Se você gerencia mais de um servidor, **GROWTH se paga sozinho**:\n' +
        '• 3 servidores por R$34,90 = R$11,60 cada\n' +
        '• 6 meses de histórico = você vê padrões que ninguém vê\n' +
        '• Suporte VIP = problema resolvido em horas, não dias',

    comparison:
        '**Quanto custa NÃO ter dados?**\n' +
        '• Servidor com 1.000 membros perdendo 5% por semana = 50 membros\n' +
        '• Em 1 mês = 200 membros perdidos\n' +
        '• Custo de reconquistar: horas de trabalho + anúncios\n' +
        '• Custo do GuildLens PRO: R$14,90 (menos que 1 pizza)',
};

/**
 * Helper functions
 */

function getPlan(planId) {
    return PLANS[planId.toUpperCase()] || PLANS.FREE;
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
