const rateLimiter = require('../../src/services/rateLimiter');
const { BOT_OWNER_ID } = require('../../src/utils/constants');

describe('RateLimiter Service', () => {
    const guildId = 'GUILD_123';
    const userId = 'USER_456';
    const ownerId = BOT_OWNER_ID || 'OWNER_789';

    beforeEach(() => {
        // Reset internal state before each test
        rateLimiter.guildLimits.clear();
        rateLimiter.userLimits.clear();
        rateLimiter.blacklist.clear();
    });

    test('should allow requests under limit', () => {
        expect(rateLimiter.check(guildId, userId)).toBe(true);
    });

    test('should block user exceeding limit (maxPerUser)', () => {
        // Spam 20 messages
        for (let i = 0; i < 20; i++) {
            rateLimiter.check(guildId, userId);
        }
        // 21st message should fail
        expect(rateLimiter.check(guildId, userId)).toBe(false);
    });

    test('should clamp user after 3 violations', () => {
        // Mock time or simply trigger violations manually
        // Force state to near violation
        for (let v = 0; v < 3; v++) {
            // Fill bucket
            rateLimiter.userLimits.set(`${guildId}:${userId}`, {
                count: 20,
                resetAt: Date.now() + 60000,
                violations: v
            });

            // Trigger check -> should increment violation
            rateLimiter.check(guildId, userId);
        }

        // Now user should be blacklisted
        expect(rateLimiter.blacklist.has(userId)).toBe(true);
        expect(rateLimiter.check(guildId, userId)).toBe(false);
    });

    test('should bypass checks for owner', () => {
        // Fill bucket artificially
        rateLimiter.userLimits.set(`${guildId}:${ownerId}`, { count: 1000, resetAt: Date.now() + 999999 });

        // Should still pass
        expect(rateLimiter.check(guildId, ownerId)).toBe(true);
    });

    test('should reset counts after window expiry', () => {
        const past = Date.now() - 1000;

        rateLimiter.userLimits.set(`${guildId}:${userId}`, {
            count: 20,
            resetAt: past
        });

        // Should reset and pass
        expect(rateLimiter.check(guildId, userId)).toBe(true);
        expect(rateLimiter.userLimits.get(`${guildId}:${userId}`).count).toBe(1);
    });
});
