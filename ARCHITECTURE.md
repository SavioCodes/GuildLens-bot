# Arquitetura do GuildLens

## 🧱 Visão Geral

-   **Runtime**: Node.js v18+
-   **Database**: PostgreSQL
-   **Framework**: Discord.js v14
-   **Arquitetura**: Layered (Handlers -> Services -> Repositories)

---

## 📂 Estrutura de Pastas e Módulos

### `src/config/` (Fonte da Verdade)
-   `plans.js`: Definição de objetos dos planos e limites.
-   `constants.js`: Cores, Emojis, Emojis, Limites técnicos.
-   `pix.js`: Getter de chave Pix segura.

### `src/discord/` (Interface)
-   `handlers/`:
    -   `interactionCreate.js`: Router central.
    -   `messageCreate.js`: Monitoramento e Guardian (AutoMod).
    -   `officialServer.js`: Lógica de boas-vindas e verificação.
-   `services/`:
    -   `guardian.js`: Sistema de AutoMod (Regex para vendas/ofensas) e Restauração de Conteúdo.
    -   `tickets/`: Sistema completo de tickets (`TicketController`, `TicketViews`).
    -   `admin/`:
        -   `AdminGrowth.js`: Ativação de planos (`activatePro`, `activateGrowth`).
        -   `AdminSystem.js`: Métricas do sistema.
-   `commands/`:
    -   `export.js`: Lógica de geração de arquivos (Restrito a Growth).

### `src/services/` (Core Logic)
-   `analytics.js`: Cálculo de Health Score, Insights e Alertas.
-   `upsell.js`: Lógica de verificação para oferta de upgrade.

### `src/utils/`
-   `planEnforcement.js`: Middleware que verifica permissões (`enforceFeature`).
    -   *Nota: Define regras rígidas de acesso (ex: Export só para Growth).*

---

## 🔄 Fluxos de Dados Principais

### 1. Comando de Saúde
`User` -> `/guildlens-health` -> `health.js` -> `analytics.calculateHealthScore` -> `messagesRepo.getMessageCount` -> `DB`

### 2. Ativação de Plano (Manual)
`Admin` -> `/guildlens-admin activate-pro` -> `AdminGrowth.activatePro` -> `subscriptionsRepo.activatePro` -> `DB (subscriptions table)`

### 3. Guardian (AutoMod)
`User` -> `Message` -> `messageCreate` -> `guardian.checkContentSafety` -> `Regex Check` -> `Delete/Log`

---

## 🛠️ Decisões Técnicas

-   **Plan Restrictions**: A restrição de features ocorre em `planEnforcement.js`. Mesmo que `plans.js` liste um recurso, se `planEnforcement` exigir nível superior, o código prevalece.
-   **Tickets**: Não usam banco de dados. O estado é mantido em memória (`TicketState.js`) para rapidez, com persistência temporária no canal do Discord.
-   **Transcripts**: Gerados em `.txt` puro usando o histórico de chat do Discord no momento do fechamento.
