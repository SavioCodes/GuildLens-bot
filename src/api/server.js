// FILE: src/api/server.js
// Secure Health Check API Server for GuildLens

const http = require('http');
const logger = require('../utils/logger');
const healthCheck = require('../utils/healthCheck');
const security = require('../utils/security');

const log = logger.child('APIServer');

// ALLOWED ROUTES (White-list)
const ROUTES = {
    'GET:/': handleRoot,
    'GET:/health': handleHealth,
};

let serverInstance = null;

/**
 * Starts the Secure HTTP server with port fallback
 * @param {number} preferredPort - Preferred port to listen on
 * @returns {Promise<http.Server|null>} Server instance or null if failed
 */
async function startServer(preferredPort = 3000) {
    // If server already running, skip
    if (serverInstance) {
        log.warn('Server already running, skipping...');
        return serverInstance;
    }

    const server = http.createServer(async (req, res) => {
        const ip = req.socket.remoteAddress || 'unknown';
        const routeKey = `${req.method}:${req.url}`;

        // 1. Security Headers
        security.applySecurityHeaders(res);

        // 2. Rate Limiting
        if (!security.checkIpRateLimit(ip)) {
            sendResponse(res, 429, 'Rate Limit Exceeded');
            security.auditRequest(req, 429, ip);
            return;
        }

        // 3. Strict Routing (Allow-list)
        if (!ROUTES[routeKey]) {
            sendResponse(res, 404, 'Not Found');
            security.auditRequest(req, 404, ip);
            return;
        }

        // 4. Authentication (API Key)
        if (!security.validateApiKey(req)) {
            sendResponse(res, 401, 'Unauthorized');
            security.auditRequest(req, 401, ip);
            return;
        }

        // 5. Execution
        try {
            await ROUTES[routeKey](req, res);
            security.auditRequest(req, 200, ip);
        } catch (error) {
            log.error(`API Error on ${routeKey}`, error);
            sendResponse(res, 500, 'Internal Server Error');
            security.auditRequest(req, 500, ip);
        }
    });

    // Try to listen, with fallback ports
    const ports = [preferredPort, preferredPort + 1, preferredPort + 10, 0]; // 0 = random available

    for (const port of ports) {
        try {
            await new Promise((resolve, reject) => {
                server.once('error', (err) => {
                    if (err.code === 'EADDRINUSE') {
                        log.warn(`Port ${port} in use, trying next...`);
                        resolve(false);
                    } else {
                        reject(err);
                    }
                });

                server.listen(port, () => {
                    const actualPort = server.address().port;
                    log.success(`🔒 Health Check API running on port ${actualPort}`);
                    serverInstance = server;
                    resolve(true);
                });
            });

            if (serverInstance) return serverInstance;

            // Remove error listener before trying next port
            server.removeAllListeners('error');
        } catch (error) {
            log.error(`Failed to start server on port ${port}`, error);
        }
    }

    log.warn('⚠️ Could not start Health Check API (all ports busy). Bot will continue without it.');
    return null;
}

/**
 * Stops the server gracefully
 */
function stopServer() {
    if (serverInstance) {
        serverInstance.close();
        serverInstance = null;
        log.info('Health Check API stopped');
    }
}

// HANDLERS

function handleRoot(req, res) {
    sendResponse(res, 200, 'GuildLens Secure API v1.0');
}

async function handleHealth(req, res) {
    const status = await healthCheck.getSimpleStatus();
    const code = status.status === 'ok' ? 200 : 503;
    sendResponse(res, code, status, true);
}

// HELPERS

function sendResponse(res, statusCode, data, isJson = false) {
    res.writeHead(statusCode, {
        'Content-Type': isJson ? 'application/json' : 'text/plain'
    });

    if (isJson) {
        res.end(JSON.stringify(data));
    } else {
        res.end(data);
    }
}

module.exports = { startServer, stopServer };
