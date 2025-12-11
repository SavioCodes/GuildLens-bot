# 🛡️ GuildLens

Bot de analytics para servidores Discord. Monitora atividade, gera insights e ajuda a crescer sua comunidade.

## ✨ Recursos

| Recurso | Descrição |
|---------|-----------|
| **Health Score** | Índice de saúde do servidor (0-100) |
| **Insights** | Análise de atividade e tendências |
| **Leaderboard** | Ranking dos membros mais ativos |
| **Alertas** | Notificações de queda de atividade |
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
| `/guildlens-setup` | Configurar bot | Administrator |
| `/guildlens-admin` | Admin (owner only) | Administrator |

## 💎 Planos

| Recurso | FREE | PRO | GROWTH |
|---------|------|-----|--------|
| **Preço** | Grátis | R$ 14,90/mês | R$ 34,90/mês |
| Membros | 200 | 5.000 | Ilimitado |
| Histórico | 7 dias | 60 dias | 180 dias |
| Servidores | 1 | 1 | 3 |
| Health Score | Básico | Completo | Completo |
| Insights | ❌ | ✅ | ✅ |
| Alertas | ❌ | ✅ | ✅ |
| Ações | ❌ | ✅ | ✅ |
| Exportação | ❌ | JSON | JSON + CSV |
| Suporte | Comunidade | Prioritário | VIP |
| Watermark | Sim | Não | Não |

## 🚀 Instalação

### Requisitos
- Node.js 18+
- PostgreSQL
- Token de bot Discord

### Setup

```bash
git clone https://github.com/SavioCodes/GuildLens-bot.git
cd GuildLens-bot
npm install
cp env.example.txt .env
# Edite .env com suas credenciais
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
├── config/           # Configurações (plans.js)
├── discord/
│   ├── commands/     # Comandos slash
│   ├── handlers/     # Event handlers
│   └── services/     # Tickets, Guardian
├── db/
│   └── repositories/ # Acesso ao banco
├── services/         # Analytics, Alertas
└── utils/            # Embeds, Validação
```

## 📞 Suporte

- **Servidor:** [discord.gg/tVrGPC7Z](https://discord.gg/tVrGPC7Z)
- **Desenvolvedor:** Sávio Brito

## 📄 Licença

Proprietário © 2024 Sávio Brito
