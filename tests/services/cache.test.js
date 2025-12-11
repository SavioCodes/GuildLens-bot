/**
 * Tests for Cache Service
 */

const cache = require('../../src/services/cache');

describe('CacheService', () => {
    beforeEach(() => {
        // Clear cache before each test
        cache.cache.clear();
        cache.ttlMap.clear();
        cache.hits = 0;
        cache.misses = 0;
    });

    describe('Basic Operations', () => {
        it('should set and get a value', () => {
            cache.set('test-key', 'test-value', 60000);
            const value = cache.get('test-key');

            expect(value).toBe('test-value');
        });

        it('should return undefined for non-existent key', () => {
            const value = cache.get('non-existent');

            expect(value).toBeUndefined();
        });

        it('should delete a key', () => {
            cache.set('to-delete', 'value');
            cache.delete('to-delete');

            expect(cache.get('to-delete')).toBeUndefined();
        });

        it('should track hits and misses', () => {
            cache.set('hit-test', 'value');

            cache.get('hit-test'); // hit
            cache.get('hit-test'); // hit
            cache.get('miss-test'); // miss

            const stats = cache.getStats();
            expect(stats.hits).toBe(2);
            expect(stats.misses).toBe(1);
        });
    });

    describe('TTL Expiration', () => {
        it('should return undefined for expired keys', () => {
            // Set with 1ms TTL
            cache.set('expire-test', 'value', 1);

            // Wait for expiration
            return new Promise(resolve => {
                setTimeout(() => {
                    const value = cache.get('expire-test');
                    expect(value).toBeUndefined();
                    resolve();
                }, 10);
            });
        });
    });

    describe('Pattern Clearing', () => {
        it('should clear keys matching pattern', () => {
            cache.set('guild:123:plan', 'pro');
            cache.set('guild:123:settings', { lang: 'pt' });
            cache.set('guild:456:plan', 'free');

            cache.clearPattern('guild:123');

            expect(cache.get('guild:123:plan')).toBeUndefined();
            expect(cache.get('guild:123:settings')).toBeUndefined();
            expect(cache.get('guild:456:plan')).toBe('free');
        });
    });

    describe('Helper Methods', () => {
        it('should generate correct cache keys', () => {
            expect(cache.planKey('123')).toBe('plan:123');
            expect(cache.settingsKey('456')).toBe('settings:456');
            expect(cache.healthKey('789')).toBe('health:789');
        });
    });

    describe('GetOrSet', () => {
        it('should return cached value if exists', async () => {
            cache.set('cached', 'existing-value');

            const getter = jest.fn().mockResolvedValue('new-value');
            const result = await cache.getOrSet('cached', getter);

            expect(result).toBe('existing-value');
            expect(getter).not.toHaveBeenCalled();
        });

        it('should call getter and cache if not exists', async () => {
            const getter = jest.fn().mockResolvedValue('fetched-value');
            const result = await cache.getOrSet('new-key', getter, 60000);

            expect(result).toBe('fetched-value');
            expect(getter).toHaveBeenCalled();
            expect(cache.get('new-key')).toBe('fetched-value');
        });
    });
});
