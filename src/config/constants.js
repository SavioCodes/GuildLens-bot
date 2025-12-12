/**
 * System Constants
 * Limits, Timeouts, Categories, Colors, Emojis, and other magic numbers.
 * Single Source of Truth for Non-ID configuration.
 */

const CONSTANTS = {
    // Brand & UI Colors (Integer format for Discord Embeds)
    COLORS: {
        PRIMARY: 0x22D3EE,      // Cyan - main brand color
        SECONDARY: 0xA855F7,    // Purple - accents
        SUCCESS: 0x22C55E,      // Green - growth, OK
        WARNING: 0xFB923C,      // Orange - alerts, risk
        ERROR: 0xEF4444,        // Red - errors, critical
        DANGER: 0xEF4444,       // Red - same as error
        INFO: 0x22D3EE,         // Cyan - info
        NEUTRAL: 0x9CA3AF,      // Gray - neutral text
        GOLD: 0xFFD700,         // Gold - premium/pricing
        PREMIUM: 0xA855F7,      // Purple - premium features

        // Health Score Specific
        HEALTH_EXCELLENT: 0x22C55E,
        HEALTH_GOOD: 0x84CC16,
        HEALTH_WARNING: 0xFB923C,
        HEALTH_CRITICAL: 0xEF4444,
    },

    // Standard Iconography
    EMOJI: {
        // Status
        CHECK: '✅',
        CROSS: '❌',
        WARNING: '⚠️',
        INFO: 'ℹ️',
        ALERT: '🚨',
        BELL: '🔔',

        // Metrics & Charts
        CHART: '📊',
        TREND_UP: '📈',
        TREND_DOWN: '📉',
        STABLE: '➡️',

        // Actions & Features
        ROCKET: '🚀',
        STAR: '⭐',
        FIRE: '🔥',
        BULB: '💡',
        TARGET: '🎯',
        CROWN: '👑',
        TROPHY: '🏆',
        SPARKLE: '✨',
        MEGAPHONE: '📣',

        // UI Elements
        SETTINGS: '⚙️',
        CHANNEL: '📢', // Or hash #️⃣
        USER: '👤',
        USERS: '👥',
        CLOCK: '🕐',
        CALENDAR: '📅',
        WAVE: '👋',
        QUESTION: '❓',
        LOCK: '🔒',
        UNLOCK: '🔓',

        // Health Levels
        HEALTH_EXCELLENT: '💚',
        HEALTH_GOOD: '💛',
        HEALTH_WARNING: '🧡',
        HEALTH_CRITICAL: '❤️',

        // Medals
        RANK_1: '🥇',
        RANK_2: '🥈',
        RANK_3: '🥉',
    },

    // Ticket System Configuration
    TICKETS: {
        CATEGORY_NAME: '📞 Tickets',
        STALE_THRESHOLD_MS: 24 * 60 * 60 * 1000, // 24 Hours
        CLOSE_DELAY_MS: 3000,
        MAX_OPEN_PER_USER: 1
    },

    // Rate Limits & Cooldowns
    COOLDOWNS: {
        INSIGHTS: 15_000,
        STATS: 10_000,
        PREMIUM_CHECK: 5_000,
        DEFAULT: 3_000,
        COMMAND: {
            MAX_PER_USER: 10,
            WINDOW_MS: 60 * 1000
        }
    },

    // Database & Export Limits
    LIMITS: {
        MAX_RECENT_MESSAGES: 1000,
        EXPORT_ROW_LIMIT: 5000,
        MESSAGE_RECORD: {
            MAX_PER_GUILD: 100,
            WINDOW_MS: 60 * 1000
        }
    },

    // Time Constants (ms)
    TIME: {
        SECOND: 1000,
        MINUTE: 60 * 1000,
        HOUR: 60 * 60 * 1000,
        DAY: 24 * 60 * 60 * 1000,
        WEEK: 7 * 24 * 60 * 60 * 1000,
    },

    // Health Score Thresholds
    HEALTH_THRESHOLDS: {
        EXCELLENT: 80,
        GOOD: 60,
        WARNING: 40,
        CRITICAL: 0,
    },

    // Defaults
    DEFAULTS: {
        LANGUAGE: 'pt-BR',
        STATS_INTERVAL: 60 * 60 * 1000,
    },

    // Alert Thresholds
    ALERTS: {
        ACTIVITY_DROP_THRESHOLD: 30, // 30% drop
        MIN_ACTIVE_CHANNEL_MESSAGES: 50, // Minimum messages to care about channel drop
    }
};

module.exports = CONSTANTS;
