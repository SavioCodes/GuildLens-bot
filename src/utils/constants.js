// FILE: src/utils/constants.js
// Bot-specific constants (owner, security, etc.)
// Re-exports from config/constants for legacy compatibility

const config = require('../config/constants');

// Read owner ID from env or fallback to a placeholder
const BOT_OWNER_ID = process.env.BOT_OWNER_ID || '000000000000000000';

// Secondary owners if needed
const OWNER_IDS = [BOT_OWNER_ID];

module.exports = {
    BOT_OWNER_ID,
    OWNER_IDS,
    // Re-export config constants for any code that imports from here
    ...config,
};
