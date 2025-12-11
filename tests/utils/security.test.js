const security = require('../../src/utils/security');

describe('API Security Utils', () => {

    describe('validateApiKey', () => {
        const originalEnv = process.env.API_SECRET_KEY;
        const TEST_KEY = 'test_secret_key_123';

        beforeAll(() => {
            process.env.API_SECRET_KEY = TEST_KEY;
        });

        afterAll(() => {
            process.env.API_SECRET_KEY = originalEnv;
        });

        test('should return true for valid key in header', () => {
            const req = {
                headers: { 'x-api-key': TEST_KEY }
            };
            expect(security.validateApiKey(req)).toBe(true);
        });

        test('should return false for invalid key', () => {
            const req = {
                headers: { 'x-api-key': 'wrong_key' }
            };
            expect(security.validateApiKey(req)).toBe(false);
        });

        test('should return false if header missing', () => {
            const req = {
                headers: {}
            };
            expect(security.validateApiKey(req)).toBe(false);
        });
    });

    describe('checkIpRateLimit', () => {
        test('should allow first request', () => {
            const ip = '127.0.0.1';
            // Force reset by using unique IP
            const uniqueIp = `1.2.3.${Date.now() % 255}`;
            expect(security.checkIpRateLimit(uniqueIp)).toBe(true);
        });
    });
});
