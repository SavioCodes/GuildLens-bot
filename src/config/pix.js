/**
 * PIX Configuration Service
 * Handles secure extraction of PIX keys from environment.
 */

const logger = require('../utils/logger');

const PIX = {
    getKey: () => {
        const key = process.env.PIX_KEY;
        const name = process.env.PIX_NAME;
        const bank = process.env.PIX_BANK;

        if (!key || !name || !bank) {
            logger.error('Missing PIX configuration in .env');
            return null;
        }

        return { key, name, bank };
    }
};

module.exports = PIX;
