// FILE: tests/utils/constants.test.js
// Tests for constants

const {
    BRAND_COLORS,
    EMBED_COLORS,
    HEALTH_THRESHOLDS,
    EMOJI,
    PLANS,
    RATE_LIMITS,
    TIME,
    PATTERNS,
} = require('../../src/utils/constants');

describe('Constants', () => {
    describe('BRAND_COLORS', () => {
        test('should have PRIMARY color', () => {
            expect(BRAND_COLORS.PRIMARY).toBe('#22D3EE');
        });

        test('should have all required colors', () => {
            expect(BRAND_COLORS.BACKGROUND).toBeDefined();
            expect(BRAND_COLORS.SURFACE).toBeDefined();
            expect(BRAND_COLORS.TEXT_PRIMARY).toBeDefined();
            expect(BRAND_COLORS.SUCCESS).toBeDefined();
            expect(BRAND_COLORS.WARNING).toBeDefined();
        });
    });

    describe('EMBED_COLORS', () => {
        test('should have integer format colors', () => {
            expect(typeof EMBED_COLORS.PRIMARY).toBe('number');
            expect(EMBED_COLORS.PRIMARY).toBe(0x22D3EE);
        });
    });

    describe('HEALTH_THRESHOLDS', () => {
        test('should have correct threshold values', () => {
            expect(HEALTH_THRESHOLDS.EXCELLENT).toBe(80);
            expect(HEALTH_THRESHOLDS.GOOD).toBe(60);
            expect(HEALTH_THRESHOLDS.WARNING).toBe(40);
            expect(HEALTH_THRESHOLDS.CRITICAL).toBe(0);
        });
    });

    describe('EMOJI', () => {
        test('should have basic emoji', () => {
            expect(EMOJI.CHECK).toBe('✅');
            expect(EMOJI.CROSS).toBe('❌');
            expect(EMOJI.WARNING).toBe('⚠️');
        });

        test('should have health emoji', () => {
            expect(EMOJI.HEALTH_EXCELLENT).toBeDefined();
            expect(EMOJI.HEALTH_CRITICAL).toBeDefined();
        });
    });

    describe('PLANS', () => {
        test('should have FREE plan', () => {
            expect(PLANS.FREE).toBeDefined();
            expect(PLANS.FREE.price).toBe(0);
            expect(PLANS.FREE.watermark).toBe(true);
        });

        test('should have PRO plan', () => {
            expect(PLANS.PRO).toBeDefined();
            expect(PLANS.PRO.price).toBe(4900);
            expect(PLANS.PRO.watermark).toBe(false);
        });

        test('should have GROWTH plan', () => {
            expect(PLANS.GROWTH).toBeDefined();
            expect(PLANS.GROWTH.maxServers).toBe(5);
        });
    });

    describe('TIME', () => {
        test('should have correct time values', () => {
            expect(TIME.SECOND).toBe(1000);
            expect(TIME.MINUTE).toBe(60000);
            expect(TIME.HOUR).toBe(3600000);
            expect(TIME.DAY).toBe(86400000);
        });
    });

    describe('PATTERNS', () => {
        test('should validate Discord IDs', () => {
            expect(PATTERNS.DISCORD_ID.test('123456789012345678')).toBe(true);
            expect(PATTERNS.DISCORD_ID.test('abc')).toBe(false);
        });

        test('should validate language codes', () => {
            expect(PATTERNS.LANGUAGE.test('pt-BR')).toBe(true);
            expect(PATTERNS.LANGUAGE.test('en-US')).toBe(true);
            expect(PATTERNS.LANGUAGE.test('es-ES')).toBe(false);
        });
    });
});
