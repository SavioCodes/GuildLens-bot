// FILE: tests/db/pgClient.test.js
// Tests for PostgreSQL client utilities

const {
    isRetryableError,
    getBackoffDelay,
} = require('../../src/db/pgClient');

describe('pgClient utilities', () => {
    describe('isRetryableError', () => {
        test('should return true for connection reset', () => {
            const error = { code: 'ECONNRESET' };
            expect(isRetryableError(error)).toBe(true);
        });

        test('should return true for connection refused', () => {
            const error = { code: 'ECONNREFUSED' };
            expect(isRetryableError(error)).toBe(true);
        });

        test('should return true for timeout', () => {
            const error = { code: 'ETIMEDOUT' };
            expect(isRetryableError(error)).toBe(true);
        });

        test('should return true for deadlock', () => {
            const error = { code: '40P01' };
            expect(isRetryableError(error)).toBe(true);
        });

        test('should return true for serialization failure', () => {
            const error = { code: '40001' };
            expect(isRetryableError(error)).toBe(true);
        });

        test('should return false for syntax error', () => {
            const error = { code: '42601' };
            expect(isRetryableError(error)).toBe(false);
        });

        test('should return false for generic error', () => {
            const error = { code: 'GENERIC_ERROR' };
            expect(isRetryableError(error)).toBe(false);
        });

        test('should return false for undefined code', () => {
            const error = {};
            expect(isRetryableError(error)).toBe(false);
        });
    });

    describe('getBackoffDelay', () => {
        test('should return initial delay for first attempt', () => {
            const delay = getBackoffDelay(0);
            expect(delay).toBe(1000); // Initial delay
        });

        test('should double delay for second attempt', () => {
            const delay = getBackoffDelay(1);
            expect(delay).toBe(2000);
        });

        test('should quadruple delay for third attempt', () => {
            const delay = getBackoffDelay(2);
            expect(delay).toBe(4000);
        });

        test('should cap delay at maximum', () => {
            const delay = getBackoffDelay(10); // Would be 1024000ms without cap
            expect(delay).toBe(10000); // Max delay
        });

        test('should always return a number', () => {
            expect(typeof getBackoffDelay(0)).toBe('number');
            expect(typeof getBackoffDelay(5)).toBe('number');
        });
    });
});
