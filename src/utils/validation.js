// FILE: src/utils/validation.js
// Input validation utilities for GuildLens
// Provides type-safe validation for all inputs

const { PATTERNS } = require('./constants');

/**
 * Validation result type
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether validation passed
 * @property {string} [error] - Error message if invalid
 * @property {*} [value] - Sanitized value if valid
 */

/**
 * Validates a Discord snowflake ID
 * @param {*} id - Value to validate
 * @param {string} [fieldName='ID'] - Name of the field for error messages
 * @returns {ValidationResult}
 */
function validateDiscordId(id, fieldName = 'ID') {
    if (!id) {
        return { valid: false, error: `${fieldName} é obrigatório` };
    }

    const idString = String(id);

    if (!PATTERNS.DISCORD_ID.test(idString)) {
        return { valid: false, error: `${fieldName} inválido` };
    }

    return { valid: true, value: idString };
}

/**
 * Validates a guild ID
 * @param {*} guildId - Guild ID to validate
 * @returns {ValidationResult}
 */
function validateGuildId(guildId) {
    return validateDiscordId(guildId, 'Guild ID');
}

/**
 * Validates a channel ID
 * @param {*} channelId - Channel ID to validate
 * @returns {ValidationResult}
 */
function validateChannelId(channelId) {
    return validateDiscordId(channelId, 'Channel ID');
}

/**
 * Validates a user ID
 * @param {*} userId - User ID to validate
 * @returns {ValidationResult}
 */
function validateUserId(userId) {
    return validateDiscordId(userId, 'User ID');
}

/**
 * Validates a language code
 * @param {*} language - Language code to validate
 * @returns {ValidationResult}
 */
function validateLanguage(language) {
    if (!language) {
        return { valid: true, value: 'pt-BR' }; // Default
    }

    const langString = String(language);

    if (!PATTERNS.LANGUAGE.test(langString)) {
        return { valid: false, error: 'Idioma inválido. Use pt-BR ou en-US' };
    }

    return { valid: true, value: langString };
}

/**
 * Validates a positive integer
 * @param {*} value - Value to validate
 * @param {string} [fieldName='Valor'] - Name of the field for error messages
 * @param {number} [min=0] - Minimum value (inclusive)
 * @param {number} [max=Infinity] - Maximum value (inclusive)
 * @returns {ValidationResult}
 */
function validatePositiveInteger(value, fieldName = 'Valor', min = 0, max = Infinity) {
    const num = parseInt(value, 10);

    if (isNaN(num)) {
        return { valid: false, error: `${fieldName} deve ser um número` };
    }

    if (num < min) {
        return { valid: false, error: `${fieldName} deve ser no mínimo ${min}` };
    }

    if (num > max) {
        return { valid: false, error: `${fieldName} deve ser no máximo ${max}` };
    }

    return { valid: true, value: num };
}

/**
 * Validates a plan type
 * @param {*} plan - Plan to validate
 * @returns {ValidationResult}
 */
function validatePlan(plan) {
    const validPlans = ['free', 'pro', 'growth'];
    const planString = String(plan).toLowerCase();

    if (!validPlans.includes(planString)) {
        return { valid: false, error: 'Plano inválido. Use free, pro ou growth' };
    }

    return { valid: true, value: planString };
}

/**
 * Validates an array of Discord IDs
 * @param {*} ids - Array of IDs to validate
 * @param {string} [fieldName='IDs'] - Name of the field for error messages
 * @param {number} [maxLength=10] - Maximum array length
 * @returns {ValidationResult}
 */
function validateDiscordIdArray(ids, fieldName = 'IDs', maxLength = 10) {
    if (!ids) {
        return { valid: true, value: [] };
    }

    if (!Array.isArray(ids)) {
        return { valid: false, error: `${fieldName} deve ser uma lista` };
    }

    if (ids.length > maxLength) {
        return { valid: false, error: `${fieldName} pode ter no máximo ${maxLength} itens` };
    }

    const validated = [];

    for (const id of ids) {
        const result = validateDiscordId(id, fieldName);
        if (!result.valid) {
            return result;
        }
        validated.push(result.value);
    }

    return { valid: true, value: validated };
}

/**
 * Sanitizes a string (removes control characters, trims)
 * @param {*} str - String to sanitize
 * @param {number} [maxLength=1000] - Maximum length
 * @returns {string} Sanitized string
 */
function sanitizeString(str, maxLength = 1000) {
    if (!str) return '';

    return String(str)
        // eslint-disable-next-line no-control-regex
        .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
        .trim()
        .substring(0, maxLength);
}

/**
 * Validates required fields in an object
 * @param {Object} obj - Object to validate
 * @param {string[]} requiredFields - List of required field names
 * @returns {ValidationResult}
 */
function validateRequired(obj, requiredFields) {
    if (!obj || typeof obj !== 'object') {
        return { valid: false, error: 'Dados inválidos' };
    }

    for (const field of requiredFields) {
        if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
            return { valid: false, error: `Campo '${field}' é obrigatório` };
        }
    }

    return { valid: true };
}

module.exports = {
    validateDiscordId,
    validateGuildId,
    validateChannelId,
    validateUserId,
    validateLanguage,
    validatePositiveInteger,
    validatePlan,
    validateDiscordIdArray,
    sanitizeString,
    validateRequired,
};
