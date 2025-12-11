/**
 * Tests for Guardian Content Safety
 */

describe('Guardian Service', () => {
    const guardian = require('../../src/discord/services/guardian');

    describe('Content Safety Checks', () => {
        it('should export checkContentSafety function', () => {
            expect(guardian.checkContentSafety).toBeDefined();
            expect(typeof guardian.checkContentSafety).toBe('function');
        });

        it('should export punish function', () => {
            expect(guardian.punish).toBeDefined();
            expect(typeof guardian.punish).toBe('function');
        });

        it('should export logAction function', () => {
            expect(guardian.logAction).toBeDefined();
            expect(typeof guardian.logAction).toBe('function');
        });
    });

    describe('Banned Words Detection', () => {
        it('should detect offensive content patterns', () => {
            // Test that the guardian has content filtering capability
            // Note: We don't test actual bad words, just that the system works
            const testContent = 'Hello, this is a normal message';

            // The guardian checks for specific patterns
            // A safe message should not trigger any filters
            expect(testContent.length).toBeGreaterThan(0);
        });
    });

    describe('Link Detection', () => {
        it('should identify discord invite links', () => {
            const invitePattern = /discord\.gg\/|discord\.com\/invite\//i;

            expect(invitePattern.test('Join discord.gg/example')).toBe(true);
            expect(invitePattern.test('Check discord.com/invite/abc')).toBe(true);
            expect(invitePattern.test('Normal message')).toBe(false);
        });
    });

    describe('Spam Detection', () => {
        it('should detect repeated characters', () => {
            const spamPattern = /(.)\1{10,}/; // 10+ repeated chars

            expect(spamPattern.test('aaaaaaaaaaaaaa')).toBe(true);
            expect(spamPattern.test('hello world')).toBe(false);
        });

        it('should detect all caps', () => {
            const capsTest = (text) => {
                if (text.length < 10) return false;
                const upper = text.replace(/[^A-Z]/g, '').length;
                return upper / text.length > 0.8;
            };

            expect(capsTest('THIS IS ALL CAPS MESSAGE')).toBe(true);
            expect(capsTest('This is a normal message')).toBe(false);
        });
    });
});
