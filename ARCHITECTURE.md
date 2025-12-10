# GuildLens - Arquitetura do Sistema

Este documento descreve a arquitetura técnica do GuildLens, um bot Discord de análise e estratégia de comunidade.

---

## 📐 Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────────────┐
│                           DISCORD                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │   Mensagens  │  │   Comandos   │  │    Eventos de Guild      │  │
│  │   de Texto   │  │   Slash      │  │    (join/leave/update)   │  │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬─────────────┘  │
└─────────┼─────────────────┼────────────────────────┼────────────────┘
          │                 │                        │
          ▼                 ▼                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       BOT PROCESS (Node.js)                         │
│                   Hospedado no Railway/Render/VPS                   │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                      index.js (Entry Point)                   │  │
│  │  - Inicializa PostgreSQL Pool                                 │  │
│  │  - Cria Discord Client                                        │  │
│  │  - Registra Event Handlers                                    │  │
│  │  - Gerencia Shutdown                                          │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                               │                                     │
│         ┌─────────────────────┼─────────────────────┐               │
│         ▼                     ▼                     ▼               │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐         │
│  │   ready.js  │      │ message     │      │ interaction │         │
│  │             │      │ Create.js   │      │ Create.js   │         │
│  │ - Sync DBs  │      │             │      │             │         │
│  │ - Start     │      │ - Filter    │      │ - Route     │         │
│  │   Aggregator│      │ - Log msg   │      │ - Execute   │         │
│  └─────────────┘      └──────┬──────┘      └──────┬──────┘         │
│                              │                    │                 │
│                              ▼                    ▼                 │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                        SERVICES                               │  │
│  │  ┌─────────────┐  ┌─────────────────┐  ┌──────────────────┐  │  │
│  │  │ analytics   │  │ recommendations │  │ statsAggregator  │  │  │
│  │  │             │  │                 │  │                  │  │  │
│  │  │ - Health    │  │ - Action        │  │ - Aggregate      │  │  │
│  │  │   Score     │  │   Templates     │  │   Daily Stats    │  │  │
│  │  │ - Insights  │  │ - Rule Engine   │  │ - Prune Old      │  │  │
│  │  │ - Alerts    │  │ - Context       │  │   Data           │  │  │
│  │  └──────┬──────┘  └────────┬────────┘  └────────┬─────────┘  │  │
│  └─────────┼──────────────────┼─────────────────────┼────────────┘  │
│            └──────────────────┼─────────────────────┘               │
│                               ▼                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                      REPOSITORIES                             │  │
│  │  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │  │
│  │  │ guilds  │  │ messages │  │ settings │  │ stats         │  │  │
│  │  │ .js     │  │ .js      │  │ .js      │  │ .js           │  │  │
│  │  └────┬────┘  └────┬─────┘  └────┬─────┘  └───────┬───────┘  │  │
│  └───────┼────────────┼─────────────┼────────────────┼───────────┘  │
│          └────────────┴─────────────┴────────────────┘              │
│                               │                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                        pgClient.js                            │  │
│  │                    - PostgreSQL Pool (pg)                     │  │
│  │                    - Auto-retry & reconnect                   │  │
│  │                    - Query helpers                            │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼ (Connection String via SUPABASE_DB_URL)
┌─────────────────────────────────────────────────────────────────────┐
│                          SUPABASE                                   │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                       PostgreSQL                              │  │
│  │                                                               │  │
│  │  ┌─────────┐  ┌────────────────┐  ┌──────────┐  ┌───────────┐│  │
│  │  │ guilds  │  │ guild_settings │  │ messages │  │daily_stats││  │
│  │  │         │  │                │  │          │  │           ││  │
│  │  │ PK:     │  │ PK: guild_id   │  │ PK: id   │  │ PK: id    ││  │
│  │  │ guild_id│  │ FK: guild_id   │  │ FK:      │  │ FK:       ││  │
│  │  │         │  │                │  │ guild_id │  │ guild_id  ││  │
│  │  └─────────┘  └────────────────┘  └──────────┘  └───────────┘│  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📦 Módulos Principais

### Entry Point (`index.js`)

Responsabilidades:
- Carregar configuração do ambiente (valida envs obrigatórias)
- Inicializar pool de conexões PostgreSQL
- Criar cliente Discord com intents corretas
- Registrar handlers de eventos
- Gerenciar shutdown graceful (fecha pool, desconecta do Discord)

### Configuration (`config.js`)

Responsabilidades:
- Validar variáveis de ambiente obrigatórias
- Lançar erro claro se faltar algo crítico
- Centralizar todas as configurações em um objeto frozen
- Suportar valores default para configs opcionais

### Database Layer (`src/db/`)

#### `pgClient.js`

Driver: **pg (node-postgres)**

Funcionalidades:
- Connection pooling com retry automático
- SSL habilitado para Supabase
- Helpers: `query()`, `queryOne()`, `queryAll()`, `transaction()`
- `ensureTables()` - cria tabelas automaticamente se não existirem
- `testConnection()` - valida conexão no startup

#### Repositories

Padrão Repository para acesso a dados via SQL puro:

| Repository | Tabela | Principais Funções |
|------------|--------|-------------------|
| `guilds.js` | `guilds` | `ensureGuild()`, `upsertGuild()`, `guildExists()` |
| `settings.js` | `guild_settings` | `getSettings()`, `shouldMonitorChannel()` |
| `messages.js` | `messages` | `recordMessage()`, `getChannelActivity()`, `getNewAuthorsCount()` |
| `stats.js` | `daily_stats` | `aggregateDays()`, `getStatsSummary()`, `compareStats()` |

### Discord Layer (`src/discord/`)

#### `client.js`
- Cria o cliente Discord.js com intents:
  - `Guilds` - eventos de servidores
  - `GuildMessages` - eventos de mensagens
  - `MessageContent` - conteúdo das mensagens

#### Handlers
| Handler | Evento | Função |
|---------|--------|--------|
| `ready.js` | `ready` | Inicializa DB, sincroniza guilds, inicia agregador |
| `messageCreate.js` | `messageCreate` | Filtra bots, verifica config, loga mensagem |
| `guildCreate.js` | `guildCreate/Delete` | Sincroniza guild no DB |
| `interactionCreate.js` | `interactionCreate` | Roteia slash commands |

#### Commands

Cada comando segue o padrão:
```javascript
module.exports = {
    data: SlashCommandBuilder,  // Definição do comando
    execute: async (interaction) => {}  // Execução
};
```

| Comando | Arquivo | Função |
|---------|---------|--------|
| `/guildlens-setup` | `setup.js` | Configura canais, idioma, role |
| `/guildlens-health` | `health.js` | Calcula e exibe Health Score |
| `/guildlens-insights` | `insights.js` | Top canais, picos, novos |
| `/guildlens-alerts` | `alerts.js` | Lista alertas de risco |
| `/guildlens-actions` | `actions.js` | Sugestões de ação |

### Services Layer (`src/services/`)

#### `analytics.js` - Motor de Análise

**Health Score Formula (documentada no código):**

```
Score = (Activity × 40%) + (Engagement × 30%) + (Trend × 20%) + (Consistency × 10%)
```

**Activity Score (0-100)**:
- Escala logarítmica de mensagens/dia
- 0 msgs/day = 0, 10 msgs/day ≈ 50, 100 msgs/day = 100
- Fórmula: `(log10(avgMsgs + 1) / 2) * 100`

**Engagement Score (0-100)**:
- Relação mensagens por usuário ativo
- Faixa ideal: 5-20 msgs/user/semana = 100
- Abaixo: proporcional; Acima: penalidade suave

**Trend Score (0-100)**:
- Comparação semana atual vs anterior
- Stable = 70, +50% growth = 100, -50% decline = 20

**Consistency Score (0-100)**:
- Baseado no coeficiente de variação da atividade diária
- Menos variância = mais pontos

#### `recommendations.js` - Motor de Recomendações

Sistema baseado em regras (8 templates):

1. **Queda geral** → Enquete de engajamento
2. **Baixa atividade** → Evento de fim de semana
3. **Canal quieto** → Discussão temática
4. **Novos inativos** → Boas-vindas estruturado
5. **Horário de pico** → Agendar conteúdo
6. **Canal ativo** → Celebrar sucesso
7. **Poucos ativos** → Incentivar convites
8. **Atividade ok** → Resumo semanal

#### `statsAggregator.js` - Agregador

- Executa via `setInterval` (default: 60 min)
- Consolida `messages` → `daily_stats`
- Prune dados antigos (>90 dias msgs, >180 dias stats)

### Utilities (`src/utils/`)

| Utility | Função |
|---------|--------|
| `logger.js` | Logs com níveis (debug/info/warn/error), cores, timestamps |
| `time.js` | `getDateRange()`, `getComparisonPeriods()`, `formatDate()` |
| `embeds.js` | Builders de embeds Discord com branding consistente |

---

## 🔄 Fluxos de Dados

### Fluxo: Registro de Mensagem

```
Discord (messageCreate)
    │
    ▼
messageCreate.js
    │ Valida:
    │ - É guild (não DM)
    │ - Não é bot
    │ - Não é sistema
    │
    ▼
settingsRepo.shouldMonitorChannel()
    │ Verifica se canal está na lista
    │ (null = todos os canais)
    │
    ▼
messagesRepo.recordMessage({
    guildId,
    channelId,
    authorId,
    createdAt,
    length: contentLength
})
    │
    ▼
pgClient.query(INSERT INTO messages ...)
```

### Fluxo: Cálculo de Health Score

```
Usuario: /guildlens-health
    │
    ▼
interactionCreate.js → health.js
    │ interaction.deferReply()
    │
    ▼
analytics.calculateHealthScore(guildId)
    │
    ├─► messagesRepo.getMessageCount(7d)
    ├─► messagesRepo.getMessageCount(30d)
    ├─► messagesRepo.getActiveAuthorCount(7d)
    ├─► messagesRepo.getActivityComparison(7d)
    └─► messagesRepo.getDailyMessageCounts(7d)
    │
    ▼
Calcular componentes:
    │ - calculateActivityScore(avgMsgs)
    │ - calculateEngagementScore(users, msgs)
    │ - calculateTrendScore(trend, %)
    │ - calculateConsistencyScore(dailyCounts)
    │
    ▼
Score = média ponderada (40%, 30%, 20%, 10%)
    │
    ▼
generateHealthInterpretation(score, trend, ...)
    │
    ▼
createHealthEmbed({ score, msgs, users, trend, ... })
    │
    ▼
interaction.editReply({ embeds: [embed] })
```

### Fluxo: Agregação de Estatísticas

```
setInterval (cada 60 min)
    │
    ▼
statsAggregator.aggregateGuildStats(guildId)
    │
    ├─► Para cada dia (últimos 7):
    │   │
    │   ├─► SELECT COUNT(*), COUNT(DISTINCT author_id)
    │   │   FROM messages WHERE date = X
    │   │
    │   └─► INSERT INTO daily_stats (upsert)
    │
    └─► Log resultado
```

---

## 🗄️ Schema do Banco de Dados

### Tabela: `guilds`
```sql
guild_id    TEXT PRIMARY KEY      -- Discord snowflake
name        TEXT NOT NULL         -- Nome do servidor
created_at  TIMESTAMPTZ NOT NULL  -- Quando foi registrado
```

### Tabela: `guild_settings`
```sql
guild_id            TEXT PRIMARY KEY REFERENCES guilds
language            TEXT NOT NULL DEFAULT 'pt-BR'
monitored_channels  JSONB NULL       -- null = todos os canais
staff_role_id       TEXT NULL        -- Cargo para alertas
created_at          TIMESTAMPTZ NOT NULL
updated_at          TIMESTAMPTZ NOT NULL
```

### Tabela: `messages`
```sql
id          BIGSERIAL PRIMARY KEY
guild_id    TEXT NOT NULL REFERENCES guilds
channel_id  TEXT NOT NULL
author_id   TEXT NOT NULL
created_at  TIMESTAMPTZ NOT NULL
length      INTEGER NOT NULL      -- Caracteres da mensagem
```

### Tabela: `daily_stats`
```sql
id                   BIGSERIAL PRIMARY KEY
guild_id             TEXT NOT NULL REFERENCES guilds
date                 DATE NOT NULL
messages_count       INTEGER NOT NULL
active_members_count INTEGER NOT NULL
UNIQUE(guild_id, date)
```

### Índices
```sql
idx_messages_guild_created    (guild_id, created_at DESC)
idx_messages_channel          (channel_id, created_at DESC)
idx_messages_author           (author_id, created_at DESC)
idx_messages_guild_channel    (guild_id, channel_id)
idx_daily_stats_guild_date    (guild_id, date DESC)
```

---

## 🔮 Evolução do Produto

### Fase 1: MVP Atual ✅
- Coleta de mensagens
- Health Score
- Insights básicos
- Alertas baseados em regras
- Sugestões de ação

### Fase 2: Melhorias de UX
- Dashboard embeddable no Discord
- Gráficos inline nos embeds
- Comandos de comparação (canal A vs B)
- Histórico de health score

### Fase 3: IA e Automação
- Integração com OpenAI/Gemini para sugestões contextuais
- Alertas automáticos em canal específico
- Previsão de tendências (ML simples)
- Resumos semanais automáticos

### Fase 4: Dashboard Web
- Painel em Next.js conectado ao mesmo Postgres
- Gráficos interativos (Recharts)
- Exportação de relatórios PDF/CSV
- Login via Discord OAuth

### Fase 5: Enterprise
- Multi-tenant com billing
- API pública para integrações
- Webhooks para eventos
- White-label

---

## 🔒 Considerações de Segurança

1. **Credenciais**: Sempre via variáveis de ambiente, nunca hardcoded
2. **Connection String**: Contém senha, nunca expor
3. **Tokens**: DISCORD_TOKEN é secreto, nunca logar
4. **Permissões**: `/guildlens-setup` requer Administrator
5. **Privacidade**: Conteúdo das mensagens NÃO é armazenado
6. **SSL**: Conexão com Supabase sempre via SSL

---

## 📊 Limites e Performance

### PostgreSQL (Supabase Free)
- 500MB de storage
- 2GB transfer/mês
- Conexões ilimitadas (pool)

### Estimativa de Uso
- 1 mensagem ≈ 50 bytes no banco
- 10.000 msgs/dia = ~500KB/dia = ~15MB/mês
- Suficiente para servidores pequenos/médios

### Otimizações Implementadas
- Connection pooling (max 10 conexões)
- Agregação diária reduz queries
- Pruning automático de dados antigos
- Índices em todas as queries frequentes
- Queries com LIMIT onde aplicável
