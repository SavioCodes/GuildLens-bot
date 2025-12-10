# GuildLens - Community Strategy Discord Bot

![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)
![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-3FCF8E)
![License](https://img.shields.io/badge/License-MIT-blue)

## 📖 O que é o GuildLens?

**GuildLens** é um bot "Estrategista de Comunidade" para Discord. Ele **não** é um bot de moderação, música ou economia. Em vez disso, ele:

- 📊 **Analisa** dados de atividade do seu servidor
- 🏥 **Calcula** um "Health Score" (índice de saúde) de 0 a 100
- 💡 **Gera insights** sobre canais mais ativos, horários de pico e tendências
- ⚠️ **Detecta riscos** como quedas de atividade e canais em perigo
- 🎯 **Sugere ações** concretas para melhorar o engajamento

> **⚠️ IMPORTANTE**: 
> - O **Supabase** é usado apenas como **banco de dados PostgreSQL**
> - O **processo do bot** deve ser hospedado em um serviço separado (**Railway**, Render, fly.io, VPS, etc.)
> - O Supabase **NÃO** executa processos Node.js de longa duração

---

## 🚀 Funcionalidades

### Comandos Slash

| Comando | Descrição |
|---------|-----------|
| `/guildlens-setup` | Configura quais canais monitorar, idioma e cargo de staff |
| `/guildlens-health` | Mostra o Health Score do servidor com métricas detalhadas |
| `/guildlens-insights` | Exibe top canais, horários de pico e novos participantes |
| `/guildlens-alerts` | Lista alertas de riscos como quedas de atividade |
| `/guildlens-actions` | Gera sugestões de ações com mensagens prontas para copiar |

### Métricas Coletadas

- Total de mensagens por período
- Membros ativos únicos
- Atividade por canal
- Distribuição por horário do dia
- Tendências semana a semana
- Novos participantes

---

## 📋 Pré-requisitos

- **Node.js** v18 ou superior
- Conta no **Discord Developer Portal**
- Conta no **Supabase** (gratuito)
- Conta no **Railway** (ou outro serviço de hospedagem)

---

## 🛠️ Instalação Passo a Passo

### 1. Clone ou Baixe o Projeto

```bash
git clone <seu-repositorio>
cd GuildLens
```

### 2. Instale as Dependências

```bash
npm install
```

---

## 🤖 Configuração do Discord

### 3. Crie o Bot no Discord Developer Portal

1. Acesse o [Discord Developer Portal](https://discord.com/developers/applications)
2. Clique em **"New Application"** e dê um nome (ex: GuildLens)
3. Vá em **"Bot"** no menu lateral
4. Clique em **"Add Bot"** e confirme

### 4. Configure o Token do Bot

1. Na página do Bot, clique em **"Reset Token"**
2. **Copie o token** - você usará isso no `.env` como `DISCORD_TOKEN`
3. **NUNCA** compartilhe este token publicamente!

### 5. Ative as Intents Privilegiadas

Na página do Bot, em **"Privileged Gateway Intents"**, ative:

- ✅ **PRESENCE INTENT** (opcional)
- ✅ **SERVER MEMBERS INTENT** (opcional)
- ✅ **MESSAGE CONTENT INTENT** (OBRIGATÓRIO - para ler mensagens)

### 6. Obtenha o Client ID

1. Vá em **"General Information"**
2. Copie o **"Application ID"** - este é seu `DISCORD_CLIENT_ID`

### 7. Gere a URL de Convite e Adicione ao Servidor

1. Vá em **"OAuth2" > "URL Generator"**
2. Em **Scopes**, marque: `bot`, `applications.commands`
3. Em **Bot Permissions**, marque:
   - Read Messages/View Channels
   - Send Messages
   - Embed Links
   - Read Message History
4. Copie a URL gerada e abra no navegador
5. Selecione o servidor e autorize o bot

---

## 🗄️ Configuração do Supabase (Banco de Dados)

### 8. Crie um Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e faça login
2. Clique em **"New Project"**
3. Escolha uma organização e dê um nome ao projeto
4. **Defina uma senha forte para o banco** - você precisará dela!
5. Escolha a região mais próxima de você
6. Aguarde o projeto ser criado

### 9. Obtenha a Connection String do PostgreSQL

1. No painel do Supabase, vá em **"Settings"** (ícone de engrenagem)
2. Clique em **"Database"**
3. Role até **"Connection string"**
4. Selecione **"URI"**
5. Copie a connection string completa
6. **Substitua `[YOUR-PASSWORD]`** pela senha que você definiu ao criar o projeto

A string deve ficar parecida com:
```
postgresql://postgres.[project-ref]:[sua-senha]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
```

> **⚠️ SEGURANÇA**: Esta connection string contém sua senha. NUNCA a compartilhe ou commite no Git!

### 10. Crie as Tabelas no Banco de Dados

1. No painel do Supabase, vá em **"SQL Editor"**
2. Clique em **"New query"**
3. Cole o SQL abaixo e clique em **"Run"**:

```sql
-- =====================================================
-- GuildLens Database Schema
-- =====================================================

-- Tabela de guilds (servidores)
CREATE TABLE IF NOT EXISTS guilds (
    guild_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de configurações por guild
CREATE TABLE IF NOT EXISTS guild_settings (
    guild_id TEXT PRIMARY KEY REFERENCES guilds(guild_id) ON DELETE CASCADE,
    language TEXT NOT NULL DEFAULT 'pt-BR',
    monitored_channels JSONB NULL,
    staff_role_id TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de mensagens (para analytics)
CREATE TABLE IF NOT EXISTS messages (
    id BIGSERIAL PRIMARY KEY,
    guild_id TEXT NOT NULL REFERENCES guilds(guild_id) ON DELETE CASCADE,
    channel_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    length INTEGER NOT NULL
);

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

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_messages_guild_created ON messages(guild_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_author ON messages(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_guild_channel ON messages(guild_id, channel_id);
CREATE INDEX IF NOT EXISTS idx_daily_stats_guild_date ON daily_stats(guild_id, date DESC);
```

---

## ⚙️ Configuração do Ambiente

### 11. Crie o Arquivo .env

```bash
# Windows
copy env.example.txt .env

# Linux/Mac
cp env.example.txt .env
```

### 12. Preencha as Variáveis

Edite o arquivo `.env` com suas credenciais:

```env
# Discord
DISCORD_TOKEN=seu_token_do_bot_aqui
DISCORD_CLIENT_ID=seu_client_id_aqui
DISCORD_GUILD_ID=                         # Opcional: ID do servidor de teste

# Supabase (PostgreSQL)
SUPABASE_DB_URL=postgresql://postgres.[ref]:[senha]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres

# Logging
LOG_LEVEL=info
```

---

## 🚀 Executando Localmente

### 13. Registre os Comandos Slash

```bash
npm run deploy-commands
```

Você verá uma lista dos comandos registrados. Se definiu `DISCORD_GUILD_ID`, os comandos aparecerão imediatamente. Caso contrário (global), pode levar até 1 hora.

### 14. Inicie o Bot

```bash
npm start
```

Ou:
```bash
node index.js
```

Você deve ver no console:
```
[INFO] GuildLens is ready for action!
[OK] Logged in as GuildLens#1234
```

---

## 🚂 Hospedagem 24/7 no Railway

O bot precisa rodar 24/7 para coletar dados. O **Railway** é uma opção simples e com tier gratuito.

### 15. Crie uma Conta no Railway

1. Acesse [railway.app](https://railway.app)
2. Clique em **"Login"** ou **"Start a New Project"**
3. Faça login com sua conta **GitHub** (recomendado)

### 16. Crie um Novo Projeto

1. Na dashboard, clique em **"New Project"**
2. Selecione **"Deploy from GitHub repo"**
3. Authorize o Railway a acessar seus repositórios
4. Selecione o repositório do GuildLens

### 17. Configure as Variáveis de Ambiente

1. Clique no serviço criado (card com nome do repo)
2. Vá na aba **"Variables"**
3. Adicione cada variável clicando em **"New Variable"**:

| Variable | Value |
|----------|-------|
| `DISCORD_TOKEN` | Seu token do bot Discord |
| `DISCORD_CLIENT_ID` | Seu Application ID do Discord |
| `SUPABASE_DB_URL` | Sua connection string do Supabase |
| `LOG_LEVEL` | `info` |

> ⚠️ NÃO adicione `DISCORD_GUILD_ID` em produção (deixe vazio para comandos globais)

### 18. Configure o Comando de Start

1. Vá na aba **"Settings"**
2. Em **"Start Command"**, defina:
   ```
   node index.js
   ```
   Ou deixe em branco se o `package.json` já tem o script `start`

### 19. Deploy!

1. O Railway faz deploy automaticamente ao detectar mudanças no GitHub
2. Para forçar um deploy manual, clique em **"Deploy"** no canto superior direito
3. Aguarde o build completar (geralmente 1-2 minutos)

### 20. Verifique os Logs

1. Clique no serviço
2. Vá na aba **"Logs"**
3. Você deve ver:
   ```
   [OK] Database connection test passed
   [OK] Logged in as GuildLens#1234
   [INFO] GuildLens is ready for action!
   ```

Se houver erros, verifique:
- As variáveis de ambiente estão corretas?
- O token do Discord está válido?
- A connection string do Supabase está com a senha correta?

### Alternativas ao Railway

- **Render.com** - Similar ao Railway, com tier gratuito
- **fly.io** - Mais técnico, mas muito flexível
- **VPS** (DigitalOcean, Linode) - Mais controle, requer conhecimento de Linux

---

## 📊 Como o Health Score é Calculado

O Health Score (0-100) é uma média ponderada de 4 componentes:

| Componente | Peso | Descrição |
|------------|------|-----------|
| **Atividade** | 40% | Mensagens por dia (escala logarítmica) |
| **Engajamento** | 30% | Relação mensagens/usuários ativos |
| **Tendência** | 20% | Crescimento semana a semana |
| **Consistência** | 10% | Regularidade da atividade diária |

### Fórmula Detalhada (em `src/services/analytics.js`):

```javascript
// Activity Score (0-100): Logarithmic scale of messages/day
// 0 msgs/day = 0, 10 msgs/day = 50, 100 msgs/day = 100
activityScore = (log10(avgMessagesPerDay + 1) / 2) * 100

// Engagement Score (0-100): Messages per user ratio
// Ideal: 5-20 messages per user per week
engagementScore = calculateIdealRatio(messagesPerUser)

// Trend Score (0-100): Week-over-week change
// +50% growth = 100, -50% decline = 20
trendScore = 70 + (percentage * factor)

// Consistency Score (0-100): Coefficient of variation
// Low variance = 100, High variance = 0
consistencyScore = 100 - (coefficientOfVariation * 50)

// Final Score
healthScore = (activity * 0.40) + (engagement * 0.30) + (trend * 0.20) + (consistency * 0.10)
```

### Interpretação:
- 🟢 **80-100**: Excelente - Servidor muito saudável
- 🟢 **60-79**: Bom - Servidor saudável
- 🟡 **40-59**: Atenção - Precisa de cuidados
- 🔴 **0-39**: Crítico - Ação urgente necessária

---

## 🗂️ Estrutura do Projeto

```
GuildLens/
├── index.js                    # Ponto de entrada principal
├── config.js                   # Configuração e validação de env
├── package.json                # Dependências e scripts
├── schema.sql                  # SQL para criar tabelas
├── env.example.txt             # Template de variáveis de ambiente
├── README.md                   # Este arquivo
├── ARCHITECTURE.md             # Documentação técnica
│
├── scripts/
│   └── deployCommands.js       # Script para registrar slash commands
│
└── src/
    ├── db/
    │   ├── pgClient.js         # Cliente PostgreSQL (pg Pool)
    │   └── repositories/
    │       ├── guilds.js       # CRUD de servidores
    │       ├── messages.js     # Registro e consulta de mensagens
    │       ├── settings.js     # Configurações por servidor
    │       └── stats.js        # Estatísticas agregadas
    │
    ├── discord/
    │   ├── client.js           # Criação do cliente Discord
    │   ├── commands/
    │   │   ├── setup.js        # /guildlens-setup
    │   │   ├── health.js       # /guildlens-health
    │   │   ├── insights.js     # /guildlens-insights
    │   │   ├── alerts.js       # /guildlens-alerts
    │   │   └── actions.js      # /guildlens-actions
    │   └── handlers/
    │       ├── ready.js        # Evento: bot pronto
    │       ├── messageCreate.js # Evento: mensagem criada
    │       ├── guildCreate.js  # Evento: bot entra/sai de servidor
    │       └── interactionCreate.js # Evento: comando executado
    │
    ├── services/
    │   ├── analytics.js        # Cálculo de health score e insights
    │   ├── recommendations.js  # Geração de sugestões de ações
    │   └── statsAggregator.js  # Agregação de estatísticas diárias
    │
    └── utils/
        ├── logger.js           # Sistema de logs com níveis
        ├── time.js             # Utilitários de data/hora
        └── embeds.js           # Construtores de embeds Discord
```

---

## 🛡️ Segurança

- ✅ Tokens e connection strings armazenados APENAS em variáveis de ambiente
- ✅ O arquivo `.env` NUNCA deve ser commitado (está no .gitignore)
- ✅ Apenas administradores podem usar `/guildlens-setup`
- ✅ O CONTEÚDO das mensagens NÃO é armazenado (apenas metadados)
- ✅ Connection pooling para gerenciamento seguro de conexões

---

## 🔮 Melhorias Futuras

1. **Integração com IA**: Usar OpenAI/Gemini para sugestões mais inteligentes
2. **Dashboard Web**: Painel visual com gráficos (Next.js)
3. **Alertas Automáticos**: Enviar alertas em canal específico
4. **Exportação de Relatórios**: Gerar PDF/CSV com métricas
5. **Multi-idioma**: Suporte completo a inglês
6. **Webhooks**: Integração com outras plataformas

---

## 📜 Licença

Este projeto está sob a licença MIT.

---

## 🤝 Suporte

Encontrou um bug ou tem uma sugestão? Abra uma Issue no GitHub.
