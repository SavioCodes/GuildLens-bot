# 🦅 GuildLens - Community Intelligence Bot

**GuildLens** é um bot avançado para Discord focado em ajudar donos de servidores a crescerem suas comunidades através de dados e insights acionáveis.

## 🚀 Funcionalidades

### 📊 Análise e Métricas
- Monitoramento de mensagens por canal.
- Monitoramento de atividade de voz.
- Painéis automáticos de métricas (`/insights`).

### 🛡️ Segurança e Moderação
- **Guardian Mode:** Proteção automática para o servidor oficial.
- **Rate Limit System:** Sistema anti-spam inteligente e otimizado.
- **Cooldowns:** Proteção contra abuso de comandos.
- **Logs Secretos:** Auditoria completa de infrações.

### 💰 Monetização (Manual PIX)
- Sistema híbrido: Pagamento via PIX -> Ativação Manual por Admin.
- Comandos dedicados: `/premium` (Cliente) e `/admin` (Dono).
- Dashboard Financeiro Integrado.

### 🤝 Comunidade
- Sistema de Sugestões e Report de Bugs.
- Guia de Ajuda interativo (`/guildlens-help`).

---

## 🛠️ Instalação e Configuração

### Pré-requisitos
- Node.js v18+
- Banco de Dados PostgreSQL (Recomendado: Supabase)

### 1. Configuração do Ambiente
Renomeie o arquivo `.env.example` para `.env` e configure:

```ini
# Discord
DISCORD_TOKEN=seu_token_aqui
CLIENT_ID=seu_client_id_aqui

# Database (Supabase Transaction Pooler)
DATABASE_URL=postgres://user:pass@host:6543/postgres?pgbouncer=true
SUPABASE_DB_URL=postgres://user:pass@host:5432/postgres

# Owner & Security
OWNER_IDS=seu_id_aqui
ENCRYPTION_KEY=chave_aleatoria_32_chars

# Pix
PIX_KEY=sua_chave_pix
PIX_NAME=Seu Nome
```

### 2. Instalação
```bash
npm install
```

### 3. Deploy de Comandos
Registre os comandos slash no Discord:
```bash
npm run deploy-commands
```

### 4. Inicialização
```bash
npm start
```

---

## 📚 Comandos Principais

| Comando | Descrição | Permissão |
|---------|-----------|-----------|
| `/guildlens-setup` | Configura canais de métricas | Admin |
| `/guildlens-insights` | Exibe painel de dados | Todos |
| `/guildlens-premium` | Informações de planos e PIX | Todos |
| `/guildlens-help` | Guia de uso do bot | Todos |
| `/guildlens-community` | Envia sugestões/bugs | Todos |
| `/guildlens-admin` | Painel do Dono (Financeiro, Ativação) | Dono |

---

## 🧪 Desenvolvimento e Testes

Rodar testes automatizados (Jest):
```bash
npm test
```

## 📜 Histórico de Versões
Veja o arquivo [CHANGELOG.md](./CHANGELOG.md) para detalhes de todas as atualizações.

---
**Desenvolvido com 💜 por Sávio Brito**
