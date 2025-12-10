# Changelog

Todas as mudanças notáveis no projeto GuildLens serão documentadas neste arquivo.

## [1.3.0] - 2025-12-10
### Adicionado (Security & Polish)
- **Guardian Mode:** Proteção automática para o servidor oficial.
    - Auto-restauração de canais importantes (ex: `#regras`).
    - Moderação automática de vendas e xingamentos.
    - Logs secretos de infrações.
- **Service Rate Limiter:** Refatoração completa do sistema anti-spam.
- **Cooldowns:** Proteção contra spam de comandos Slash (3s).
- **Smart Welcome:** Mensagem de boas-vindas amigável ao entrar em novos servidores.

### Melhorado
- Performance geral do bot com serviços isolados.
- Organização do código (`handlers/interactionCreate.js`).

## [1.2.0] - 2025-12-09
### Adicionado (Admin & Community)
- **Painel Admin:** Estatísticas financeiras (MRR) e de uso.
- **Manutenção:** Modo de bloqueio global para updates.
- **Comandos de Comunidade:** `/guildlens-community suggest` e `/report-bug`.
- **Ajuda:** Comando `/guildlens-help` com guia interativo.
- **God Mode:** Comandos de super-admin (`view-server`, `system`, `broadcast`).

## [1.1.0] - 2025-12-08
### Adicionado (Payments)
- **Pagamentos Manuais (PIX):** Integração via comando `/premium`.
- **Ativação Manual:** Comando `/admin set-plan` para liberar Premium.
- **Planos Growth:** Funcionalidades exclusivas documentadas.

## [1.0.0] - 2025-12-01
### Lançamento Inicial
- **Core Bot:** Estrutura Discord.js + PostgreSQL (Supabase).
- **Análise:** Monitoramento de mensagens e canais.
- **Insights:** Geração de relatórios básicos.
- **Setup:** Comando `/guildlens-setup` para configuração.
