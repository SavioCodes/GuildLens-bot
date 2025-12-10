// FILE: tests/handlers/messageCreate.test.js
// Tests for messageCreate handler utilities

const {
    checkRateLimit,
    validateMessage,
    calculateMessageLength,
} = require('../../src/discord/handlers/messageCreate');

describe('messageCreate utilities', () => {
    describe('validateMessage', () => {
        test('should reject message without guild', () => {
            const message = { author: { bot: false }, system: false };
            const result = validateMessage(message);
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('DM');
        });

        test('should reject bot messages', () => {
            const message = { guild: { id: '123' }, author: { bot: true }, system: false };
            const result = validateMessage(message);
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('bot');
        });

        test('should reject system messages', () => {
            const message = { guild: { id: '123' }, author: { bot: false }, system: true };
            const result = validateMessage(message);
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('system');
        });

        test('should accept valid message', () => {
            const message = {
                guild: { id: '123456789012345678' },
                channel: { id: '123456789012345679' },
                author: { id: '123456789012345680', bot: false },
                system: false,
            };
            const result = validateMessage(message);
            expect(result.valid).toBe(true);
        });
    });

    describe('calculateMessageLength', () => {
        test('should calculate content length', () => {
            const message = { content: 'Hello World', embeds: [] };
            expect(calculateMessageLength(message)).toBe(11);
        });

        test('should handle empty content', () => {
            const message = { content: '', embeds: [] };
            expect(calculateMessageLength(message)).toBe(0);
        });

        test('should handle null content', () => {
            const message = { content: null, embeds: [] };
            expect(calculateMessageLength(message)).toBe(0);
        });

        test('should include embed title length', () => {
            const message = {
                content: '',
                embeds: [{ title: 'Test Title' }],
            };
            expect(calculateMessageLength(message)).toBe(10);
        });

        test('should include embed description length', () => {
            const message = {
                content: '',
                embeds: [{ description: 'Test Description' }],
            };
            expect(calculateMessageLength(message)).toBe(16);
        });

        test('should include embed fields', () => {
            const message = {
                content: '',
                embeds: [{ fields: [{ name: 'Field', value: 'Value' }] }],
            };
            expect(calculateMessageLength(message)).toBe(10); // 5 + 5
        });

        test('should sum all embed parts', () => {
            const message = {
                content: 'Hello', // 5
                embeds: [{
                    title: 'Title', // 5
                    description: 'Desc', // 4
                    fields: [{ name: 'F', value: 'V' }], // 2
                }],
            };
            expect(calculateMessageLength(message)).toBe(16);
        });
    });

    describe('checkRateLimit', () => {
        test('should allow first request', () => {
            const result = checkRateLimit('test_guild_1', 'test_user_1');
            expect(result).toBe(true);
        });

        test('should allow multiple requests under limit', () => {
            for (let i = 0; i < 10; i++) {
                const result = checkRateLimit('test_guild_2', 'test_user_2');
                expect(result).toBe(true);
            }
        });

        test('should rate limit user after exceeding limit', () => {
            // First 20 should pass (user limit)
            for (let i = 0; i < 20; i++) {
                checkRateLimit('test_guild_3', 'test_user_3');
            }
            // 21st should fail
            const result = checkRateLimit('test_guild_3', 'test_user_3');
            expect(result).toBe(false);
        });
    });
});
