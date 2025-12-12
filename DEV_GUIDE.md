# Guia de Desenvolvimento

## ⚙️ Setup Rápido

1.  Dependências: `Node.js 18`, `PostgreSQL`.
2.  Env: `DISCORD_TOKEN`, `DATABASE_URL`, `PIX_KEY`.
3.  Start: `npm start`.

## ⚠️ Limitações e Regras de Negócio (Hard Truths)

Estas regras estão definidas no código e devem ser respeitadas:

-   **Exportação é só Growth**:
    -   Definido em `src/utils/planEnforcement.js`.
    -   Mesmo que o JSON pareça simples, ele é bloqueado para Free e Pro.
-   **CSV Export**:
    -   Implementado manualmente em `src/discord/commands/export.js`.
    -   Gera um CSV simples (headers + rows).
-   **Ativação Manual**:
    -   O código de tickets (`TicketController.js`) **não** importa o `subscriptionsRepo`.
    -   A ativação deve ser feita via comando `/guildlens-admin` (que chama `AdminGrowth.js`).
-   **Verificação**:
    -   O arquivo `officialServer.js` concede o cargo de Membro na entrada (`guildMemberAdd`).
    -   O botão de verificar serve para confirmação explícita e logs.

## 🧠 Mapa de Arquivos Importantes

| Funcionalidade | Arquivo Principal |
| :--- | :--- |
| **Preços/Planos** | `src/config/plans.js` |
| **Limites (Gate)** | `src/utils/planEnforcement.js` |
| **Tickets** | `src/discord/services/tickets/TicketController.js` |
| **Admin Cmds** | `src/discord/services/admin/AdminGrowth.js` |
| **AutoMod** | `src/discord/services/guardian.js` |
| **Health Calc** | `src/services/analytics.js` |

## 🐛 Checklist de QA

Antes de liberar versão:

-   [ ] **Plan Check**: Growth consegue exportar CSV? Pro recebe bloqueio?
-   [ ] **Admin**: O comando `activate-pro` persiste no banco? (Verifique data de expiração).
-   [ ] **Guardian**: Tente digitar "vendo conta" no chat geral com conta secundária (deve deletar).
-   [ ] **PIX**: A chave Pix aparece correta no ticket?
