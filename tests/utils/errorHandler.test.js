const errorHandler = require('../../src/utils/errorHandler');
const logger = require('../../src/utils/logger');

// Mock logger to prevent clutter
jest.mock('../../src/utils/logger', () => ({
    child: () => ({
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    }),
    error: jest.fn(),
}));

describe('Error Handler Service', () => {

    describe('createSafeHandler', () => {
        test('should execute successful handler normally', async () => {
            const mockHandler = jest.fn().mockResolvedValue('success');
            const safeHandler = errorHandler.createSafeHandler(mockHandler, 'TestEvent');

            await safeHandler('arg1');
            expect(mockHandler).toHaveBeenCalledWith('arg1');
        });

        test('should catch errors and prevent crash', async () => {
            const error = new Error('Test Crash');
            const mockHandler = jest.fn().mockRejectedValue(error);
            const safeHandler = errorHandler.createSafeHandler(mockHandler, 'TestEvent');

            // Should not throw
            await expect(safeHandler('arg1')).resolves.not.toThrow();

            // Should have recorded error stats
            const stats = errorHandler.errorStats.getStats();
            expect(stats.recentErrors.length).toBeGreaterThan(0);
        });
    });

    describe('wrapError', () => {
        test('should wrap unknown error with correct code', () => {
            const err = new Error('Random');
            const wrapped = errorHandler.wrapError(err);
            expect(wrapped).toBeInstanceOf(errorHandler.AppError);
            expect(wrapped.code).toBe(errorHandler.ErrorCodes.UNKNOWN_ERROR);
        });

        test('should preserve existing AppError', () => {
            const original = new errorHandler.AppError('ERR_TEST');
            const wrapped = errorHandler.wrapError(original);
            expect(wrapped).toBe(original);
        });
    });
});
