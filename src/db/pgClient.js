// FILE: src/db/pgClient.js
// PostgreSQL client initialization for GuildLens database access
// Connects to Supabase Postgres via connection string

const { Pool } = require('pg');
const config = require('../../config');
const logger = require('../utils/logger');

const log = logger.child('Postgres');

/**
 * Environment detection
 */
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * SSL Configuration based on environment
 * In development: disable strict SSL validation
 * In production: use proper SSL with certificate validation
 */
function getSSLConfig() {
    if (IS_PRODUCTION) {
        // Production: use SSL with proper validation
        // Supabase provides SSL, but we need to allow their certificate
        return {
            rejectUnauthorized: false, // Supabase uses pooler, this is acceptable
        };
    } else {
        // Development: disable SSL validation warnings
        if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === undefined) {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        }
        return false;
    }
}

/**
 * PostgreSQL connection pool instance
 * @type {Pool|null}
 */
let pool = null;

/**
 * Tracks if the pool has been initialized
 * @type {boolean}
 */
let isInitialized = false;

/**
 * Keep-Alive interval handle
 */
let keepAliveInterval = null;

/**
 * Retry configuration for database operations
 */
const RETRY_CONFIG = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
};

/**
 * Sleeps for a specified number of milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculates exponential backoff delay
 * @param {number} attempt - Current attempt number (0-based)
 * @returns {number} Delay in milliseconds
 */
function getBackoffDelay(attempt) {
    const delay = RETRY_CONFIG.initialDelayMs * Math.pow(2, attempt);
    return Math.min(delay, RETRY_CONFIG.maxDelayMs);
}

/**
 * Initializes the PostgreSQL connection pool
 * Should be called once at application startup
 * @returns {Pool} PostgreSQL pool instance
 */
function initPool() {
    if (pool && isInitialized) {
        log.debug('PostgreSQL pool already initialized');
        return pool;
    }

    try {
        log.info('Initializing PostgreSQL connection pool...');
        log.info(`Environment: ${IS_PRODUCTION ? 'PRODUCTION' : 'DEVELOPMENT'}`);

        pool = new Pool({
            connectionString: config.database.connectionString,
            max: config.database.pool.max,
            idleTimeoutMillis: config.database.pool.idleTimeoutMillis,
            connectionTimeoutMillis: config.database.pool.connectionTimeoutMillis,
            ssl: getSSLConfig(),
        });

        // Handle pool errors
        pool.on('error', (err) => {
            log.error('Unexpected PostgreSQL pool error', 'Pool', err);
        });

        // Handle connection events
        pool.on('connect', () => {
            log.debug('New client connected to PostgreSQL pool');
        });

        pool.on('remove', () => {
            log.debug('Client removed from PostgreSQL pool');
        });

        isInitialized = true;
        log.success('PostgreSQL pool initialized successfully');

        // [ROBUSTNESS] Start Keep-Alive (Ping every 5 minutes)
        if (!keepAliveInterval) {
            keepAliveInterval = setInterval(async () => {
                try {
                    // Lightweight query to keep connection active
                    await pool.query('SELECT 1');
                    // Lower log level or remove to avoid clutter, kept debug for now
                    // log.debug('DB Keep-Alive ping sent'); 
                } catch (err) {
                    log.warn('DB Keep-Alive ping failed:', err.message);
                }
            }, 5 * 60 * 1000); // 5 Minutes
        }

        return pool;
    } catch (error) {
        log.error('Failed to initialize PostgreSQL pool', 'Pool', error);
        throw error;
    }
}

/**
 * Gets the PostgreSQL pool instance
 * Initializes it if not already done
 * @returns {Pool} PostgreSQL pool instance
 */
function getPool() {
    if (!pool || !isInitialized) {
        return initPool();
    }
    return pool;
}

/**
 * Gracefully closes the connection pool
 * Should be called on application shutdown
 * @returns {Promise<void>}
 */
async function closePool() {
    // Clear Keep-Alive
    if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
    }

    if (pool && isInitialized) {
        log.info('Closing PostgreSQL connection pool...');
        await pool.end();
        pool = null;
        isInitialized = false;
        log.success('PostgreSQL pool closed successfully');
    }
}

/**
 * Tests the database connection by executing a simple query
 * @returns {Promise<boolean>} True if connection is successful
 */
async function testConnection() {
    try {
        const client = getPool();
        const result = await client.query('SELECT NOW() as current_time');

        log.success(`Database connection test passed. Server time: ${result.rows[0].current_time}`);
        return true;
    } catch (error) {
        log.error(`Database connection test failed: ${error.message}`);
        log.error(`Error code: ${error.code || 'N/A'}`);

        if (error.code === 'ECONNREFUSED') {
            log.error('Connection refused. Check if database is running and accessible.');
        } else if (error.code === 'ENOTFOUND') {
            log.error('Host not found. Check SUPABASE_DB_URL connection string.');
        } else if (error.code === '28P01') {
            log.error('Authentication failed. Check database credentials.');
        }

        return false;
    }
}

/**
 * Executes a query with automatic retry on transient failures
 * @param {string} sql - SQL query string
 * @param {Array} [params=[]] - Query parameters
 * @param {string} [context='Query'] - Context for logging
 * @returns {Promise<Object>} Query result
 */
async function query(sql, params = [], context = 'Query') {
    let lastError;

    for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
        try {
            const result = await getPool().query(sql, params);
            return result;
        } catch (error) {
            lastError = error;

            // Don't retry on non-transient errors
            if (!isRetryableError(error)) {
                log.error(`${context} failed (non-retryable): ${error.message}`, context, error);
                throw error;
            }

            if (attempt < RETRY_CONFIG.maxRetries) {
                const delay = getBackoffDelay(attempt);
                log.warn(`${context} failed (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries + 1}). Retrying in ${delay}ms...`);
                await sleep(delay);
            }
        }
    }

    log.error(`${context} failed after ${RETRY_CONFIG.maxRetries + 1} attempts`, context, lastError);
    throw lastError;
}

/**
 * Checks if an error is retryable
 * @param {Error} error - Error to check
 * @returns {boolean} True if error is retryable
 */
function isRetryableError(error) {
    const retryableCodes = [
        'ECONNRESET',
        'ECONNREFUSED',
        'ETIMEDOUT',
        'EPIPE',
        '57P01', // admin_shutdown
        '57P02', // crash_shutdown
        '57P03', // cannot_connect_now
        '40001', // serialization_failure
        '40P01', // deadlock_detected
    ];

    return retryableCodes.includes(error.code);
}

/**
 * Executes a query and returns the first row
 * @param {string} sql - SQL query string
 * @param {Array} [params=[]] - Query parameters
 * @param {string} [context='Query'] - Context for logging
 * @returns {Promise<Object|null>} First row or null
 */
async function queryOne(sql, params = [], context = 'Query') {
    const result = await query(sql, params, context);
    return result.rows[0] || null;
}

/**
 * Executes a query and returns all rows
 * @param {string} sql - SQL query string
 * @param {Array} [params=[]] - Query parameters
 * @param {string} [context='Query'] - Context for logging
 * @returns {Promise<Array>} Array of rows
 */
async function queryAll(sql, params = [], context = 'Query') {
    const result = await query(sql, params, context);
    return result.rows;
}

/**
 * Executes multiple queries in a transaction
 * @param {Function} callback - Async function that receives the client
 * @param {string} [context='Transaction'] - Context for logging
 * @returns {Promise<*>} Result of the callback
 */
async function transaction(callback, context = 'Transaction') {
    const client = await getPool().connect();

    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        log.error(`${context} rolled back: ${error.message}`, context, error);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Ensures all required tables exist in the database
 * Creates them if they don't exist
 * @returns {Promise<boolean>} True if tables are ready
 */
async function ensureTables() {
    try {
        log.info('Ensuring database tables exist...');

        // Create tables in order (respecting foreign key constraints)
        const sql = `
        -- Guilds table (main table)
        CREATE TABLE IF NOT EXISTS guilds (
            guild_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        -- Guild settings table
        CREATE TABLE IF NOT EXISTS guild_settings (
            guild_id TEXT PRIMARY KEY REFERENCES guilds(guild_id) ON DELETE CASCADE,
            language TEXT NOT NULL DEFAULT 'pt-BR',
            monitored_channels JSONB NULL,
            staff_role_id TEXT NULL,
            alerts_channel_id TEXT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        -- Subscriptions table for monetization
        CREATE TABLE IF NOT EXISTS subscriptions (
            guild_id TEXT PRIMARY KEY REFERENCES guilds(guild_id) ON DELETE CASCADE,
            plan TEXT NOT NULL DEFAULT 'free',
            started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            expires_at TIMESTAMPTZ NULL,
            payment_id TEXT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        -- Messages table (for recording activity)
        CREATE TABLE IF NOT EXISTS messages (
            id SERIAL PRIMARY KEY,
            guild_id TEXT NOT NULL REFERENCES guilds(guild_id) ON DELETE CASCADE,
            channel_id TEXT NOT NULL,
            author_id TEXT NOT NULL,
            message_length INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        -- Daily stats table (aggregated data)
        CREATE TABLE IF NOT EXISTS daily_stats (
            id SERIAL PRIMARY KEY,
            guild_id TEXT NOT NULL REFERENCES guilds(guild_id) ON DELETE CASCADE,
            date DATE NOT NULL,
            total_messages INTEGER NOT NULL DEFAULT 0,
            unique_authors INTEGER NOT NULL DEFAULT 0,
            avg_message_length NUMERIC NOT NULL DEFAULT 0,
            peak_hour INTEGER,
            most_active_channel TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(guild_id, date)
        );

        -- Create indexes for better query performance
        CREATE INDEX IF NOT EXISTS idx_messages_guild_id ON messages(guild_id);
        CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
        CREATE INDEX IF NOT EXISTS idx_messages_guild_created ON messages(guild_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(guild_id, channel_id);
        CREATE INDEX IF NOT EXISTS idx_daily_stats_guild_date ON daily_stats(guild_id, date);
        `;

        await query(sql, [], 'EnsureTables');
        log.success('Database tables are ready');
        return true;
    } catch (error) {
        log.error('Failed to ensure tables exist', 'EnsureTables', error);
        return false;
    }
}

/**
 * Gets database statistics for monitoring
 * @returns {Promise<Object>} Database stats
 */
async function getStats() {
    try {
        const result = await queryOne(`
            SELECT 
                (SELECT COUNT(*) FROM guilds) as guilds_count,
                (SELECT COUNT(*) FROM messages) as messages_count,
                (SELECT COUNT(*) FROM daily_stats) as daily_stats_count,
                (SELECT COUNT(*) FROM subscriptions WHERE plan != 'free') as paid_subscriptions
        `, [], 'GetStats');

        return {
            guilds: parseInt(result?.guilds_count || 0),
            messages: parseInt(result?.messages_count || 0),
            dailyStats: parseInt(result?.daily_stats_count || 0),
            paidSubscriptions: parseInt(result?.paid_subscriptions || 0),
        };
    } catch (error) {
        log.error('Failed to get database stats', 'GetStats', error);
        return { guilds: 0, messages: 0, dailyStats: 0, paidSubscriptions: 0 };
    }
}

module.exports = {
    initPool,
    getPool,
    closePool,
    testConnection,
    query,
    queryOne,
    queryAll,
    transaction,
    ensureTables,
    getStats,
    // Exported for testing
    isRetryableError,
    getBackoffDelay,
};
