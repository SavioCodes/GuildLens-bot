// FILE: src/utils/healthCheck.js
// System health check utilities for monitoring

const logger = require('./logger');
const { getPool, testConnection, getStats } = require('../db/pgClient');

const log = logger.child('HealthCheck');

/**
 * System health status levels
 */
const HealthStatus = {
    HEALTHY: 'healthy',
    DEGRADED: 'degraded',
    UNHEALTHY: 'unhealthy',
};

/**
 * Start time of the application
 */
const startTime = Date.now();

/**
 * Gets the system uptime in milliseconds
 * @returns {number} Uptime in milliseconds
 */
function getUptime() {
    return Date.now() - startTime;
}

/**
 * Formats uptime in human-readable format
 * @param {number} uptimeMs - Uptime in milliseconds
 * @returns {string} Formatted uptime
 */
function formatUptime(uptimeMs) {
    const seconds = Math.floor(uptimeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
}

/**
 * Gets memory usage statistics
 * @returns {Object} Memory usage details
 */
function getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
        rss: Math.round(usage.rss / 1024 / 1024),
        external: Math.round(usage.external / 1024 / 1024),
    };
}

/**
 * Checks database health
 * @returns {Promise<Object>} Database health status
 */
async function checkDatabase() {
    try {
        const healthy = await testConnection();
        const stats = await getStats();

        return {
            status: healthy ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
            connected: healthy,
            stats,
        };
    } catch (error) {
        log.error('Database health check failed', 'HealthCheck', error);
        return {
            status: HealthStatus.UNHEALTHY,
            connected: false,
            error: error.message,
        };
    }
}

/**
 * Checks Discord client health
 * @param {Client} client - Discord client
 * @returns {Object} Discord health status
 */
function checkDiscord(client) {
    if (!client || !client.isReady()) {
        return {
            status: HealthStatus.UNHEALTHY,
            ready: false,
        };
    }

    return {
        status: HealthStatus.HEALTHY,
        ready: true,
        guilds: client.guilds.cache.size,
        ping: client.ws.ping,
        shards: client.ws.shards?.size || 1,
    };
}

/**
 * Performs a full system health check
 * @param {Client} [client] - Discord client (optional)
 * @returns {Promise<Object>} Full health check result
 */
async function performHealthCheck(client = null) {
    const uptimeMs = getUptime();
    const memory = getMemoryUsage();

    const checks = {
        database: await checkDatabase(),
        discord: client ? checkDiscord(client) : { status: HealthStatus.UNHEALTHY, ready: false },
    };

    // Determine overall status
    let overallStatus = HealthStatus.HEALTHY;

    if (checks.database.status === HealthStatus.UNHEALTHY ||
        checks.discord.status === HealthStatus.UNHEALTHY) {
        overallStatus = HealthStatus.UNHEALTHY;
    } else if (checks.database.status === HealthStatus.DEGRADED ||
        checks.discord.status === HealthStatus.DEGRADED) {
        overallStatus = HealthStatus.DEGRADED;
    }

    // Log if unhealthy
    if (overallStatus !== HealthStatus.HEALTHY) {
        log.warn(`System health: ${overallStatus}`, 'HealthCheck');
    }

    return {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: {
            ms: uptimeMs,
            formatted: formatUptime(uptimeMs),
        },
        memory: {
            heapUsed: `${memory.heapUsed}MB`,
            heapTotal: `${memory.heapTotal}MB`,
            rss: `${memory.rss}MB`,
        },
        checks,
    };
}

/**
 * Gets a simple status for quick checks
 * @param {Client} [client] - Discord client
 * @returns {Promise<{ok: boolean, status: string}>}
 */
async function getSimpleStatus(client = null) {
    try {
        const dbOk = await testConnection();
        const discordOk = client?.isReady() ?? false;

        const ok = dbOk && discordOk;

        return {
            ok,
            status: ok ? 'OK' : 'ERROR',
            uptime: formatUptime(getUptime()),
        };
    } catch (error) {
        return {
            ok: false,
            status: 'ERROR',
            error: error.message,
        };
    }
}

module.exports = {
    HealthStatus,
    getUptime,
    formatUptime,
    getMemoryUsage,
    checkDatabase,
    checkDiscord,
    performHealthCheck,
    getSimpleStatus,
};
