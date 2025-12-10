// FILE: tests/services/analytics.test.js
// Tests for analytics service calculators

const {
    calculateActivityScore,
    calculateEngagementScore,
    calculateTrendScore,
    calculateConsistencyScore,
} = require('../../src/services/analytics');

describe('Analytics Service Calculators', () => {
    describe('calculateActivityScore', () => {
        test('should return 0 for no messages', () => {
            expect(calculateActivityScore(0)).toBe(0);
        });

        test('should return 0 for negative messages', () => {
            expect(calculateActivityScore(-5)).toBe(0);
        });

        test('should return 100 for 100+ messages/day', () => {
            expect(calculateActivityScore(100)).toBe(100);
            expect(calculateActivityScore(200)).toBe(100);
        });

        test('should return intermediate score for moderate activity', () => {
            const score10 = calculateActivityScore(10);
            expect(score10).toBeGreaterThan(30);
            expect(score10).toBeLessThan(60);
        });

        test('should return higher score for more messages', () => {
            const score10 = calculateActivityScore(10);
            const score50 = calculateActivityScore(50);
            expect(score50).toBeGreaterThan(score10);
        });

        test('should use logarithmic scaling', () => {
            // Doubling messages should not double score
            const score10 = calculateActivityScore(10);
            const score20 = calculateActivityScore(20);
            expect(score20 - score10).toBeLessThan(score10);
        });
    });

    describe('calculateEngagementScore', () => {
        test('should return 0 for no active users', () => {
            expect(calculateEngagementScore(0, 10)).toBe(0);
        });

        test('should return 100 for ideal msg/user ratio (5-20)', () => {
            // 7 msgs/day * 7 days / 10 users = 4.9 msgs/user/week
            // Actually that's under 5, let me recalculate
            // For 10 msgs/user/week: 10 users, need 10*10/7 = 14.3 msgs/day
            expect(calculateEngagementScore(10, 10)).toBe(100); // 7 msgs/user/week
        });

        test('should penalize under-engagement', () => {
            // 1 msg/day * 7 / 100 users = 0.07 msgs/user/week
            const score = calculateEngagementScore(100, 1);
            expect(score).toBeLessThan(20);
        });

        test('should penalize over-concentration', () => {
            // 100 msgs/day * 7 / 2 users = 350 msgs/user/week - way too high
            const score = calculateEngagementScore(2, 100);
            expect(score).toBeLessThan(70);
        });
    });

    describe('calculateTrendScore', () => {
        test('should return 70 for stable trend', () => {
            expect(calculateTrendScore('stable', 0)).toBe(70);
        });

        test('should return higher score for growth', () => {
            const score = calculateTrendScore('up', 20);
            expect(score).toBeGreaterThan(70);
            expect(score).toBeLessThanOrEqual(100);
        });

        test('should cap growth bonus', () => {
            const score = calculateTrendScore('up', 100);
            expect(score).toBe(100);
        });

        test('should penalize decline', () => {
            const score = calculateTrendScore('down', 30);
            expect(score).toBeLessThan(70);
        });

        test('should have minimum score for severe decline', () => {
            const score = calculateTrendScore('down', 80);
            expect(score).toBeGreaterThanOrEqual(20);
        });
    });

    describe('calculateConsistencyScore', () => {
        test('should return 50 for insufficient data', () => {
            expect(calculateConsistencyScore([])).toBe(50);
            expect(calculateConsistencyScore([{ count: 10 }])).toBe(50);
        });

        test('should return 0 for zero average', () => {
            const data = [
                { count: 0 },
                { count: 0 },
                { count: 0 },
            ];
            expect(calculateConsistencyScore(data)).toBe(0);
        });

        test('should return 100 for perfect consistency', () => {
            const data = [
                { count: 50 },
                { count: 50 },
                { count: 50 },
                { count: 50 },
            ];
            expect(calculateConsistencyScore(data)).toBe(100);
        });

        test('should penalize high variance', () => {
            const data = [
                { count: 10 },
                { count: 100 },
                { count: 5 },
                { count: 80 },
            ];
            const score = calculateConsistencyScore(data);
            expect(score).toBeLessThan(70);
        });

        test('should return higher score for lower variance', () => {
            const lowVariance = [
                { count: 48 },
                { count: 52 },
                { count: 50 },
                { count: 49 },
            ];
            const highVariance = [
                { count: 10 },
                { count: 90 },
                { count: 20 },
                { count: 80 },
            ];
            expect(calculateConsistencyScore(lowVariance)).toBeGreaterThan(
                calculateConsistencyScore(highVariance)
            );
        });
    });
});
