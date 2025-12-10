# 🗺️ GuildLens Strategy & Implementation Plan

## 🎯 Objetivo
Um sistema de analytics e gestão para servidores do Discord **100% integrado ao Discord**, sem dashboard web externo. Foco em robustez, exclusividade e atendimento premium.
**Modelo de Negócio**: Freemium com upgrade via **PIX** e atendimento manual via Tickets.

## 👥 Fluxo do Usuário (Discord Only)
1.  **Instalação**: Usuário adiciona o bot.
2.  **Onboarding**: Mensagem de boas-vindas com comando `/setup`.
3.  **Uso Gratuito**: Acesso a stats básicos (`/stats`).
4.  **Upgrade (Premium)**:
    *   Usuário digita `/premium` ou `/upgrade`.
    *   Bot mostra Embed bonita com benefícios e botão "Falar com Suporte" ou instruções: "Abra um ticket e envie um PIX para a chave X".
    *   Usuário envia comprovante no ticket.
    *   **Admin/Suporte** usa comando `/admin set-plan <guild_id> <plan> <days>` para ativar.
    *   Bot notifica no servidor do cliente: "🚀 Este servidor agora é **GROWTH**!"

---

## 🏗️ Fases de Implementação

### ✅ Fase 1: Fundação Zero-Bug (Concluída)
- [x] Linter configurado e passando sem erros.
- [x] Testes unitários rodando.
- [x] Correção de crashes de inicialização.

### 🛠️ Fase 2: Robustez e Segurança (Refinamento)
*Garantir que o bot nunca caia e dados nunca sejam perdidos.*
- **Database Resilience**: Garantir reconexão automática do Postgres com backoff exponencial (Já implementado, revisar).
- **Error Handling Centralizado**: Todas as interações devem ter `try/catch` user-friendly (Nada de "Interaction failed" silencioso).
- **Sharding**: Preparar `index.js` para suportar sharding futuro (necessário para >2.5k servidores).

### 💎 Fase 3: Experiência Premium (UX/UI)
*O bot deve ser lindo.*
- **Embeds Padronizadas**: Revisar todas as cores e emojis. Usar identidade visual cyan/dark.
- **Comando `/premium`**: Criar comando vitrine que mostra os planos.
- **Comando `/admin set-plan`**: Criar comando restrito a IDs configurados (Você) para dar upgrade manual.
- **Ajuda Interativa**: `/help` com dropdown menus para navegar por categorias.

### 🚀 Fase 4: Otimização de Performance
- **Caching**: Adicionar cache em memória (LRU) para configurações de guildas (evitar hits no DB a cada mensagem).
- **Batch Processing**: Processar stats de mensagens em lotes (batching) se o tráfego aumentar muito.

---

## ⚠️ Requisitos Pendentes (Preencher Antes do Deploy)

Para o sistema funcionar em produção, você precisará fornecer/configurar:

### 1. Ambiente (.env)
```ini
DISCORD_TOKEN=seutokenaqui
DATABASE_URL=postgres://user:pass@host:5432/db
NODE_ENV=production
OWNER_IDS=seu_id_discord,outro_admin_id
SUPPORT_ROLE_ID=id_do_cargo_de_suporte_no_seu_servidor_oficial
PIX_KEY=sua_chave_pix
```

### 2. Infraestrutura
- **Servidor VPS/Cloud**: Para rodar o bot 24/7.
- **PostgreSQL**: Banco de dados persistente.

---

## 📋 Lista de Tarefas Imediatas (Próximos Passos)

1.  **Criar comando `/admin set-plan`**: Essencial para o fluxo de pagamento manual.
2.  **Criar comando `/premium`**: A "Landing Page" dentro do Discord.
3.  **Revisão de Segurança**: Impedir que comandos de admin sejam usados por qualquer um.
4.  **Deploy de Teste**: Rodar em um servidor real para testar o fluxo.

---

> **Nota**: Não faremos site. Todo o foco será na qualidade das mensagens e comandos dentro do Discord.
