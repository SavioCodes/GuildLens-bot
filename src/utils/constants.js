// FILE: src/utils/constants.js
// Centralized constants for GuildLens
// All hardcoded values should be defined here

/**
 * GuildLens brand colors (hex)
 * @constant
 */
const BRAND_COLORS = {
    /** Main background color */
    BACKGROUND: '#020617',
    /** Cards and surfaces */
    SURFACE: '#050816',
    /** Primary text */
    TEXT_PRIMARY: '#E5E7EB',
    /** Secondary/muted text */
    TEXT_SECONDARY: '#9CA3AF',
    /** Primary brand color (Cyan) */
    PRIMARY: '#22D3EE',
    /** Secondary brand color (Purple) */
    SECONDARY: '#A855F7',
    /** Success/growth color (Green) */
    SUCCESS: '#22C55E',
    /** Warning/alert color (Orange) */
    WARNING: '#FB923C',
};

/**
 * Discord embed colors (integer format)
 * @constant
 */
const EMBED_COLORS = {
    PRIMARY: 0x22D3EE,
    SECONDARY: 0xA855F7,
    SUCCESS: 0x22C55E,
    WARNING: 0xFB923C,
    DANGER: 0xFB923C,
    INFO: 0x22D3EE,
    NEUTRAL: 0x9CA3AF,
};

/**
 * Health score thresholds
 * @constant
 */
const HEALTH_THRESHOLDS = {
    EXCELLENT: 80,
    GOOD: 60,
    WARNING: 40,
    CRITICAL: 0,
};

/**
 * Health score colors based on threshold
 * @constant
 */
const HEALTH_COLORS = {
    EXCELLENT: 0x22C55E,
    GOOD: 0x22C55E,
    WARNING: 0xFB923C,
    CRITICAL: 0xFB923C,
};

/**
 * Emoji constants for consistent iconography
 * @constant
 */
const EMOJI = {
    // Status
    CHECK: '✅',
    CROSS: '❌',
    WARNING: '⚠️',
    INFO: 'ℹ️',

    // Charts & Analytics
    CHART: '📊',
    TREND_UP: '📈',
    TREND_DOWN: '📉',

    // Actions
    ROCKET: '🚀',
    STAR: '⭐',
    FIRE: '🔥',
    BULB: '💡',
    TARGET: '🎯',

    // Alerts
    ALERT: '🚨',
    BELL: '🔔',

    // UI
    CROWN: '👑',
    SETTINGS: '⚙️',
    CHANNEL: '📢',
    USER: '👤',
    USERS: '👥',
    CLOCK: '🕐',
    CALENDAR: '📅',

    // Health levels
    HEALTH_EXCELLENT: '💚',
    HEALTH_GOOD: '💛',
    HEALTH_WARNING: '🧡',
    HEALTH_CRITICAL: '❤️',

    // Rank medals
    RANK_1: '🥇',
    RANK_2: '🥈',
    RANK_3: '🥉',
    RANK_N: '🏅',
};

/**
 * Plan configuration
 * @constant
 */
const PLANS = {
    FREE: {
        name: '🆓 Free',
        key: 'free',
        price: 0,
        maxMembers: 500,
        maxServers: 1,
        historyDays: 7,
        features: ['health-basic', 'insights-basic', 'setup'],
        watermark: true,
    },
    PRO: {
        name: '⭐ Pro',
        key: 'pro',
        price: 1490, // R$ 14,90
        maxMembers: 5000,
        maxServers: 1,
        historyDays: 60,
        features: ['health-basic', 'health-advanced', 'insights-basic', 'insights-advanced', 'alerts', 'actions', 'setup'],
        watermark: false,
    },
    GROWTH: {
        name: '🚀 Growth',
        key: 'growth',
        price: 3490, // R$ 34,90
        maxMembers: Infinity,
        maxServers: 3,
        historyDays: 180,
        features: ['health-basic', 'health-advanced', 'insights-basic', 'insights-advanced', 'alerts', 'actions', 'export', 'auto-alerts', 'setup'],
        watermark: false,
    },
};

/**
 * Rate limit configuration
 * @constant
 */
const RATE_LIMITS = {
    MESSAGE_RECORD: {
        maxPerGuild: 100,
        maxPerUser: 20,
        windowMs: 60 * 1000,
    },
    COMMAND: {
        maxPerUser: 10,
        windowMs: 60 * 1000,
    },
};

/**
 * Time constants in milliseconds
 * @constant
 */
const TIME = {
    SECOND: 1000,
    MINUTE: 60 * 1000,
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000,
    WEEK: 7 * 24 * 60 * 60 * 1000,
};

/**
 * Bot configuration defaults
 * @constant
 */
const BOT_DEFAULTS = {
    LANGUAGE: 'pt-BR',
    STATS_AGGREGATION_INTERVAL: 60 * 60 * 1000, // 1 hour
    AUTO_ALERTS_INTERVAL: 6 * 60 * 60 * 1000, // 6 hours
};

/**
 * Bot owner ID for super-admin permissions
 * @constant
 */
const BOT_OWNER_ID = '976586934455513159';

/**
 * Validation patterns
 * @constant
 */
const PATTERNS = {
    DISCORD_ID: /^\d{17,19}$/,
    LANGUAGE: /^(pt-BR|en-US)$/,
};

module.exports = {
    BRAND_COLORS,
    EMBED_COLORS,
    HEALTH_THRESHOLDS,
    HEALTH_COLORS,
    EMOJI,
    PLANS,
    RATE_LIMITS,
    TIME,
    BOT_DEFAULTS,
    PATTERNS,
    BOT_OWNER_ID,
};
