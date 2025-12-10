// FILE: tests/utils/validation.test.js
// Tests for validation utilities

const {
    validateDiscordId,
    validateGuildId,
    validateLanguage,
    validatePositiveInteger,
    validatePlan,
    sanitizeString,
    validateRequired,
} = require('../../src/utils/validation');

describe('Validation Utilities', () => {
    describe('validateDiscordId', () => {
        test('should accept valid Discord ID', () => {
            const result = validateDiscordId('123456789012345678');
            expect(result.valid).toBe(true);
            expect(result.value).toBe('123456789012345678');
        });

        test('should accept 19-digit Discord ID', () => {
            const result = validateDiscordId('1234567890123456789');
            expect(result.valid).toBe(true);
        });

        test('should reject too short ID', () => {
            const result = validateDiscordId('123456');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('inválido');
        });

        test('should reject non-numeric ID', () => {
            const result = validateDiscordId('abc123def456789012');
            expect(result.valid).toBe(false);
        });

        test('should reject empty ID', () => {
            const result = validateDiscordId('');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('obrigatório');
        });

        test('should reject null ID', () => {
            const result = validateDiscordId(null);
            expect(result.valid).toBe(false);
        });
    });

    describe('validateLanguage', () => {
        test('should accept pt-BR', () => {
            const result = validateLanguage('pt-BR');
            expect(result.valid).toBe(true);
            expect(result.value).toBe('pt-BR');
        });

        test('should accept en-US', () => {
            const result = validateLanguage('en-US');
            expect(result.valid).toBe(true);
            expect(result.value).toBe('en-US');
        });

        test('should default to pt-BR for empty', () => {
            const result = validateLanguage('');
            expect(result.valid).toBe(true);
            expect(result.value).toBe('pt-BR');
        });

        test('should reject invalid language', () => {
            const result = validateLanguage('es-ES');
            expect(result.valid).toBe(false);
        });
    });

    describe('validatePositiveInteger', () => {
        test('should accept valid positive integer', () => {
            const result = validatePositiveInteger(42);
            expect(result.valid).toBe(true);
            expect(result.value).toBe(42);
        });

        test('should accept zero', () => {
            const result = validatePositiveInteger(0);
            expect(result.valid).toBe(true);
            expect(result.value).toBe(0);
        });

        test('should accept string number', () => {
            const result = validatePositiveInteger('100');
            expect(result.valid).toBe(true);
            expect(result.value).toBe(100);
        });

        test('should reject negative number', () => {
            const result = validatePositiveInteger(-5);
            expect(result.valid).toBe(false);
        });

        test('should reject value below min', () => {
            const result = validatePositiveInteger(5, 'Value', 10);
            expect(result.valid).toBe(false);
        });

        test('should reject value above max', () => {
            const result = validatePositiveInteger(100, 'Value', 0, 50);
            expect(result.valid).toBe(false);
        });

        test('should reject non-numeric value', () => {
            const result = validatePositiveInteger('abc');
            expect(result.valid).toBe(false);
        });
    });

    describe('validatePlan', () => {
        test('should accept free plan', () => {
            const result = validatePlan('free');
            expect(result.valid).toBe(true);
            expect(result.value).toBe('free');
        });

        test('should accept pro plan', () => {
            const result = validatePlan('pro');
            expect(result.valid).toBe(true);
        });

        test('should accept growth plan', () => {
            const result = validatePlan('growth');
            expect(result.valid).toBe(true);
        });

        test('should accept uppercase plan', () => {
            const result = validatePlan('PRO');
            expect(result.valid).toBe(true);
            expect(result.value).toBe('pro');
        });

        test('should reject invalid plan', () => {
            const result = validatePlan('enterprise');
            expect(result.valid).toBe(false);
        });
    });

    describe('sanitizeString', () => {
        test('should trim whitespace', () => {
            const result = sanitizeString('  hello  ');
            expect(result).toBe('hello');
        });

        test('should remove control characters', () => {
            const result = sanitizeString('hello\x00world');
            expect(result).toBe('helloworld');
        });

        test('should truncate to max length', () => {
            const result = sanitizeString('hello world', 5);
            expect(result).toBe('hello');
        });

        test('should return empty string for null', () => {
            const result = sanitizeString(null);
            expect(result).toBe('');
        });
    });

    describe('validateRequired', () => {
        test('should pass when all fields present', () => {
            const obj = { name: 'test', value: 123 };
            const result = validateRequired(obj, ['name', 'value']);
            expect(result.valid).toBe(true);
        });

        test('should fail when field missing', () => {
            const obj = { name: 'test' };
            const result = validateRequired(obj, ['name', 'value']);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('value');
        });

        test('should fail when field is null', () => {
            const obj = { name: null };
            const result = validateRequired(obj, ['name']);
            expect(result.valid).toBe(false);
        });

        test('should fail for non-object', () => {
            const result = validateRequired(null, ['name']);
            expect(result.valid).toBe(false);
        });
    });
});
