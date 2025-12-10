-- =====================================================
-- GuildLens Database Schema
-- Execute this in Supabase SQL Editor to create tables
-- =====================================================

-- Tabela de guilds (servidores Discord)
CREATE TABLE IF NOT EXISTS guilds (
    guild_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE guilds IS 'Discord servers tracked by GuildLens';
COMMENT ON COLUMN guilds.guild_id IS 'Discord snowflake ID of the guild';
COMMENT ON COLUMN guilds.name IS 'Display name of the guild';

-- Tabela de configurações por guild
CREATE TABLE IF NOT EXISTS guild_settings (
    guild_id TEXT PRIMARY KEY REFERENCES guilds(guild_id) ON DELETE CASCADE,
    language TEXT NOT NULL DEFAULT 'pt-BR',
    monitored_channels JSONB NULL,
    staff_role_id TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE guild_settings IS 'Configuration settings for each guild';
COMMENT ON COLUMN guild_settings.language IS 'Language code for bot responses (pt-BR, en-US)';
COMMENT ON COLUMN guild_settings.monitored_channels IS 'JSON array of channel IDs to monitor (NULL = all channels)';
COMMENT ON COLUMN guild_settings.staff_role_id IS 'Optional role ID for staff alerts';

-- Tabela de mensagens para analytics
-- NÃO armazena conteúdo, apenas metadados
CREATE TABLE IF NOT EXISTS messages (
    id BIGSERIAL PRIMARY KEY,
    guild_id TEXT NOT NULL REFERENCES guilds(guild_id) ON DELETE CASCADE,
    channel_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    length INTEGER NOT NULL
);

COMMENT ON TABLE messages IS 'Message activity log for analytics (not message content)';
COMMENT ON COLUMN messages.guild_id IS 'Guild where the message was sent';
COMMENT ON COLUMN messages.channel_id IS 'Channel where the message was sent';
COMMENT ON COLUMN messages.author_id IS 'User who sent the message';
COMMENT ON COLUMN messages.created_at IS 'When the message was sent';
COMMENT ON COLUMN messages.length IS 'Length of the message in characters';

-- Tabela de estatísticas diárias agregadas
CREATE TABLE IF NOT EXISTS daily_stats (
    id BIGSERIAL PRIMARY KEY,
    guild_id TEXT NOT NULL REFERENCES guilds(guild_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    messages_count INTEGER NOT NULL DEFAULT 0,
    active_members_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(guild_id, date)
);

COMMENT ON TABLE daily_stats IS 'Pre-aggregated daily statistics for faster queries';
COMMENT ON COLUMN daily_stats.messages_count IS 'Total messages sent on this date';
COMMENT ON COLUMN daily_stats.active_members_count IS 'Unique members who sent at least one message';

-- =====================================================
-- Indexes for query performance
-- =====================================================

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_guild_created 
    ON messages(guild_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_channel 
    ON messages(channel_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_author 
    ON messages(author_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_guild_channel 
    ON messages(guild_id, channel_id);

-- Daily stats indexes
CREATE INDEX IF NOT EXISTS idx_daily_stats_guild_date 
    ON daily_stats(guild_id, date DESC);

-- =====================================================
-- Setup Complete!
-- =====================================================
-- After running this script:
-- 1. Go to Settings > Database > Connection string
-- 2. Copy the URI and replace [YOUR-PASSWORD] with your project password
-- 3. Add this to your .env file as SUPABASE_DB_URL
-- 4. Run the bot with: node index.js
