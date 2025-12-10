// FILE: src/utils/time.js
// Time and date utility functions for GuildLens analytics

/**
 * Gets the start of a day (midnight) for a given date
 * @param {Date} date - Input date
 * @returns {Date} Date set to 00:00:00.000
 */
function startOfDay(date) {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
}

/**
 * Gets the end of a day (23:59:59.999) for a given date
 * @param {Date} date - Input date
 * @returns {Date} Date set to 23:59:59.999
 */
function endOfDay(date) {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
}

/**
 * Subtracts a number of days from a date
 * @param {Date} date - Starting date
 * @param {number} days - Number of days to subtract
 * @returns {Date} New date with days subtracted
 */
function subtractDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
}

/**
 * Gets the date N days ago from now
 * @param {number} days - Number of days ago
 * @returns {Date} Date N days ago
 */
function daysAgo(days) {
    return subtractDays(new Date(), days);
}

/**
 * Gets a date range for the last N days (inclusive)
 * @param {number} days - Number of days to include
 * @returns {{start: Date, end: Date}} Object with start and end dates
 */
function getDateRange(days) {
    const end = endOfDay(new Date());
    const start = startOfDay(daysAgo(days - 1));
    return { start, end };
}

/**
 * Gets two consecutive periods for comparison
 * Period 1: Last N days (more recent)
 * Period 2: Previous N days before Period 1
 * @param {number} days - Number of days per period
 * @returns {{current: {start: Date, end: Date}, previous: {start: Date, end: Date}}}
 */
function getComparisonPeriods(days) {
    const now = new Date();

    // Current period: last N days ending today
    const currentEnd = endOfDay(now);
    const currentStart = startOfDay(daysAgo(days - 1));

    // Previous period: N days before the current period
    const previousEnd = endOfDay(subtractDays(currentStart, 1));
    const previousStart = startOfDay(subtractDays(currentStart, days));

    return {
        current: { start: currentStart, end: currentEnd },
        previous: { start: previousStart, end: previousEnd },
    };
}

/**
 * Formats a date as ISO string (for database queries)
 * @param {Date} date - Date to format
 * @returns {string} ISO 8601 formatted string
 */
function toISOString(date) {
    return date.toISOString();
}

/**
 * Formats a date for display (DD/MM/YYYY)
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

/**
 * Formats a date for display (DD/MM/YYYY HH:MM)
 * @param {Date} date - Date to format
 * @returns {string} Formatted date and time string
 */
function formatDateTime(date) {
    const d = new Date(date);
    const dateStr = formatDate(d);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${dateStr} ${hours}:${minutes}`;
}

/**
 * Gets a human-readable relative time string (e.g., "há 2 dias")
 * @param {Date} date - Date to compare to now
 * @returns {string} Relative time string in Portuguese
 */
function getRelativeTime(date) {
    const now = new Date();
    const diffMs = now - new Date(date);
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
        return diffDays === 1 ? 'há 1 dia' : `há ${diffDays} dias`;
    }
    if (diffHours > 0) {
        return diffHours === 1 ? 'há 1 hora' : `há ${diffHours} horas`;
    }
    if (diffMinutes > 0) {
        return diffMinutes === 1 ? 'há 1 minuto' : `há ${diffMinutes} minutos`;
    }
    return 'agora mesmo';
}

/**
 * Gets the hour label for a time slot (e.g., "09h-12h")
 * @param {number} startHour - Starting hour (0-23)
 * @param {number} [slotSize=3] - Hours per slot
 * @returns {string} Formatted time slot label
 */
function getTimeSlotLabel(startHour, slotSize = 3) {
    const endHour = (startHour + slotSize) % 24;
    const startStr = String(startHour).padStart(2, '0');
    const endStr = String(endHour).padStart(2, '0');
    return `${startStr}h-${endStr}h`;
}

/**
 * Groups hours into time slots
 * @param {number} hour - Hour of day (0-23)
 * @param {number} [slotSize=3] - Hours per slot
 * @returns {number} Starting hour of the slot
 */
function getTimeSlot(hour, slotSize = 3) {
    return Math.floor(hour / slotSize) * slotSize;
}

/**
 * Gets all time slots for a day
 * @param {number} [slotSize=3] - Hours per slot
 * @returns {Array<{start: number, label: string}>} Array of slot objects
 */
function getAllTimeSlots(slotSize = 3) {
    const slots = [];
    for (let hour = 0; hour < 24; hour += slotSize) {
        slots.push({
            start: hour,
            label: getTimeSlotLabel(hour, slotSize),
        });
    }
    return slots;
}

/**
 * Calculates the number of days between two dates
 * @param {Date} start - Start date
 * @param {Date} end - End date
 * @returns {number} Number of days (can be fractional)
 */
function daysBetween(start, end) {
    const msPerDay = 24 * 60 * 60 * 1000;
    return (new Date(end) - new Date(start)) / msPerDay;
}

/**
 * Gets the day of week name in Portuguese
 * @param {Date} date - Date to get day name for
 * @returns {string} Day name in Portuguese
 */
function getDayOfWeekPt(date) {
    const days = [
        'Domingo', 'Segunda', 'Terça', 'Quarta',
        'Quinta', 'Sexta', 'Sábado'
    ];
    return days[new Date(date).getDay()];
}

module.exports = {
    startOfDay,
    endOfDay,
    subtractDays,
    daysAgo,
    getDateRange,
    getComparisonPeriods,
    toISOString,
    formatDate,
    formatDateTime,
    getRelativeTime,
    getTimeSlotLabel,
    getTimeSlot,
    getAllTimeSlots,
    daysBetween,
    getDayOfWeekPt,
};
