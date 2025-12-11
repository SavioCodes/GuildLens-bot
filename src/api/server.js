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

/**
 * Starts the Secure HTTP server
 * @param {number} port 
 */
function startServer(port = 3000) {
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

    server.listen(port, () => {
        log.success(`🔒 User-facing API listening on port ${port} (Auth Required)`);
    });

    return server;
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

module.exports = { startServer };
