# GuildLens

> **Bot de Analytics e Estratégia para Comunidades Discord**

O **GuildLens** é uma ferramenta de inteligência de dados projetada para donos de servidores que desejam crescer sua comunidade com base em métricas reais.

## 🚀 O que o GuildLens faz?

- **Health Score (0-100)**: Uma nota única que resume a saúde da sua comunidade em tempo real.
- **Relatórios & Insights**: Análise de texto que mostra horários de pico (`Peak Hours`) e canais mais ativos.
- **Leaderboard**: Ranking dos membros que mais geram engajamento.
- **AutoMod "Guardian"**: Proteção automática contra spam de vendas, ofensas e toxicidade no chat.
- **Alertas de Queda**: Avisa quando o movimento cai drasticamente (ex: -30% na semana).
- **Exportação de Dados**: Baixe o histórico de mensagens e canais (Exclusivo Growth).

---

## 💎 Planos e Limites (Verificado 2025)

> **Nota:** A ativação dos planos é manual via Ticket/Pix.

| Recurso | FREE (Grátis) | PRO (R$ 19,90/mês) | GROWTH (R$ 39,90/mês) |
| :--- | :---: | :---: | :---: |
| **Membros no Server** | Até 200 | Até 5.000 | **Ilimitado** |
| **Histórico Analisado** | 7 dias | 60 dias | **180 dias** |
| **Limite de Servidores** | 1 | 1 | **3** |
| **Health Score** | Básico | ✅ Completo | ✅ Completo |
| **Insights & Alertas** | ❌ | ✅ | ✅ |
| **Exportação (JSON/CSV)** | ❌ | ❌ | ✅ **Sim** |
| **Suporte** | Comunidade | Prioritário | **VIP** |

---

## 🛠️ Principais Comandos

Todos os comandos são do tipo Slash (`/`).

### 📊 Analytics
- `/guildlens-health`: Calcula a nota de saúde (0-100).
- `/guildlens-insights`: (Pro+) Mostra canais mais ativos, horários de pico e novos autores.
- `/guildlens-stats`: Visão geral de mensagens e membros ativos na semana.
- `/guildlens-leaderboard`: Ranking dos Top 10 membros mais engajados.
- `/guildlens-export`: (Growth) Gera arquivo `.json` ou `.csv` com dados brutos.

### ⚙️ Configuração
- `/guildlens-alerts`: Define canal de alertas.
- `/guildlens-actions`: Sugere ações práticas.
- `/guildlens-setup`: Configuração inicial.
- `/guildlens-premium`: Mostra o status da assinatura.
- `/guildlens-help`: Lista de comandos.

### 🛡️ Administração (Dono)
- `/guildlens-admin`: Painel para ativar planos (`activate-pro`, `activate-growth`) e resetar configurações.

---

## 📦 Instalação e Execução

### Requisitos
- **Node.js** 18+
- **PostgreSQL** (Banco de dados)

### Como Rodar
1.  **Clone e Instale**:
    ```bash
    git clone https://github.com/SavioCodes/GuildLens.git
    npm install
    ```
2.  **Configure**:
    -   Copie `.env.example` para `.env`.
    -   Configure `DISCORD_TOKEN`, `DATABASE_URL` e `PIX_KEY`.
3.  **Execute**:
    ```bash
    npm start
    ```

---

## 📚 Documentação Técnica

- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: Estrutura de pastas e lógica.
- **[FLOWS.md](./FLOWS.md)**: Manual de operação (Tickets, Vendas, Verificação).
- **[DEV_GUIDE.md](./DEV_GUIDE.md)**: Guia de manutenção e QA.
