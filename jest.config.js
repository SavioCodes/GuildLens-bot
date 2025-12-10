// FILE: jest.config.js
// Jest configuration for GuildLens

module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.js'],
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/discord/client.js', // Discord client needs mock
    ],
    coverageThreshold: {
        global: {
            branches: 50,
            functions: 50,
            lines: 50,
            statements: 50,
        },
    },
    verbose: true,
    testTimeout: 10000,
};
