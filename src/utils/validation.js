/**
 * Input Validation Utilities
 * Centralized validation to prevent injection and misuse.
 */

const { BOT_OWNER_ID, OWNER_IDS } = require('./constants');

const Validation = {

    /**
     * Checks if a user is an authorized owner
     * @param {string} userId 
     * @returns {boolean}
     */
    isOwner: (userId) => {
        if (userId === BOT_OWNER_ID) return true;
        if (OWNER_IDS && OWNER_IDS.includes(userId)) return true;
        return false;
    },

    /**
     * Validates a string input for safe length and content
     * @param {string} input 
     * @param {number} maxLength 
     * @returns {boolean}
     */
    isValidString: (input, maxLength = 2000) => {
        if (!input || typeof input !== 'string') return false;
        if (input.length > maxLength) return false;
        // Basic anti-injection for SQL/Command (though we use parameterized queries/ORM usually)
        if (input.includes('DROP TABLE') || input.includes('DELETE FROM')) return false;
        return true;
    },

    /**
     * Validates if a Guild ID is valid
     * @param {string} id 
     * @returns {boolean}
     */
    isValidSnowflake: (id) => {
        return /^\d{17,19}$/.test(id);
    }
};

module.exports = Validation;
