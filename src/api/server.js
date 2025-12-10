const http = require('http');
const logger = require('../utils/logger');
const healthCheck = require('../utils/healthCheck');

const log = logger.child('APIServer');

/**
 * Starts a lightweight HTTP server for health checks
 * @param {number} port - Port to listen on (default: 3000)
 */
function startServer(port = 3000) {
    const server = http.createServer(async (req, res) => {
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
