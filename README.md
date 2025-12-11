# 🛡️ GuildLens

Bot de analytics para servidores Discord. Monitora atividade, gera insights e ajuda a crescer sua comunidade.

## ✨ Recursos

| Recurso | Descrição |
|---------|-----------|
| **Health Score** | Índice de saúde do servidor (0-100) |
| **Insights** | Análise de atividade e tendências |
| **Leaderboard** | Ranking dos membros mais ativos |
| **Alertas** | Notificações automáticas de problemas |
| **Exportação** | Dados em JSON/CSV |

## 📋 Comandos

| Comando | Descrição | Permissão |
|---------|-----------|-----------|
| `/guildlens-health` | Saúde do servidor | — |
| `/guildlens-insights` | Insights de atividade | — |
| `/guildlens-stats` | Estatísticas | — |
| `/guildlens-leaderboard` | Ranking de membros | — |
| `/guildlens-alerts` | Configurar alertas | ManageGuild |
| `/guildlens-export` | Exportar dados | ManageGuild |
| `/guildlens-actions` | Ações recomendadas | ManageGuild |
| `/guildlens-premium` | Ver planos | — |
| `/guildlens-help` | Lista de comandos | — |
| `/guildlens-about` | Sobre o bot | — |
| `/guildlens-community` | Sugestões e bugs | — |
| `/guildlens-admin` | Admin (owner only) | Administrator |

## 🚀 Instalação

### Requisitos
- Node.js 18+
- PostgreSQL
- Token de bot Discord

### Setup

```bash
# Clone
git clone https://github.com/SavioCodes/GuildLens-bot.git
cd GuildLens-bot

# Instale dependências
npm install

# Configure ambiente
cp env.example.txt .env
# Edite .env com suas credenciais

# Inicie
npm start
```

### Variáveis de Ambiente

```env
DISCORD_TOKEN=seu_token
DISCORD_CLIENT_ID=seu_client_id
DATABASE_URL=postgres://user:pass@host:5432/db
BOT_OWNER_ID=seu_id
```

## 📁 Estrutura

```
src/
├── discord/
│   ├── commands/     # Comandos slash
│   ├── handlers/     # Event handlers
│   └── services/     # Tickets, Guardian
├── db/
│   └── repositories/ # Acesso ao banco
├── services/         # Analytics, Alertas
└── utils/            # Embeds, Validação
```

## 💎 Planos

| Recurso | Free | PRO | GROWTH |
|---------|------|-----|--------|
| Membros | 500 | ∞ | ∞ |
| Histórico | 7 dias | 90 dias | 365 dias |
| Servidores | 1 | 1 | 5 |
| Exportação | ❌ | ✅ | ✅ |
| Suporte VIP | ❌ | ❌ | ✅ |

**PRO:** R$ 19,90/mês  
**GROWTH:** R$ 39,90/mês

## 🔧 Desenvolvimento

```bash
# Rodar em dev
npm run dev

# Testes
npm test

# Deploy de comandos
npm run deploy
```

## 📞 Suporte

- **Servidor:** [discord.gg/tVrGPC7Z](https://discord.gg/tVrGPC7Z)
- **Desenvolvedor:** Sávio Brito

## 📄 Licença

Proprietário © 2024 Sávio Brito
