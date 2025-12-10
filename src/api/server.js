const http = require('http');
const logger = require('../utils/logger');
const healthCheck = require('../utils/healthCheck');

const log = logger.child('APIServer');

/**
 * Starts a lightweight HTTP server for health checks
 * @param {number} port - Port to listen on (default: 3000)
 */
const security = require('../utils/security');

/**
 * Starts a lightweight HTTP server for health checks
 * @param {number} port - Port to listen on (default: 3000)
 */
function startServer(port = 3000) {
    const server = http.createServer(async (req, res) => {
        // [SECURITY] Apply Headers
        security.applySecurityHeaders(res);

        // [SECURITY] Get IP (Basic)
        const ip = req.socket.remoteAddress || 'unknown';

        // [SECURITY] Rate Limit
        if (!security.checkIpRateLimit(ip)) {
            res.writeHead(429, { 'Content-Type': 'text/plain' });
            res.end('Rate Limit Exceeded');
            return;
        }

        // [SECURITY] Method Restriction
        if (req.method !== 'GET') {
            res.writeHead(405, { 'Content-Type': 'text/plain' });
            res.end('Method Not Allowed');
            return;
        }

        if (req.url === '/health') {
            const status = await healthCheck.getSimpleStatus();

            res.writeHead(status.status === 'ok' ? 200 : 503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(status));
            return;
        }

        if (req.url === '/') {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('GuildLens Bot is running correctly. 🚀');
            return;
        }

        res.writeHead(404);
        res.end();
    });

    server.listen(port, () => {
        log.success(`Health check server listening on port ${port}`);
    });

    return server;
}

module.exports = { startServer };
