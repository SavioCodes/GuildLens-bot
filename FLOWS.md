# Fluxos Funcionais (Auditado)

Este documento descreve o comportamento **real** do bot em produção.

## 1. Fluxo de Tickets e Suporte

1.  **Abertura**:
    -   Usuário clica em "Abrir Ticket".
    -   Canal `ticket-usuario` criado na categoria Tickets.
    -   Mensagem de Boas-vindas com opções: Suporte ou Premium.
2.  **Fechamento**:
    -   Clique em "Fechar".
    -   **Transcript**: Um arquivo `.txt` é gerado com as mensagens.
    -   Enviado para o canal de Logs de Ticket (se configurado).
    -   Canal deletado.

## 2. Fluxo de Vendas e Ativação

**Importante:** A ativação é MANUAL. O botão no ticket não altera o banco de dados.

1.  **Venda**:
    -   Usuário escolhe plano no ticket.
    -   Bot envia Chave Pix (Texto e Chave Aleatória).
2.  **Confirmação**:
    -   Usuário envia imagem do comprovante.
    -   Bot avisa staff: "Comprovante Identificado".
3.  **Ativação (Staff)**:
    -   Dono/Admin verifica o Pix no banco real.
    -   Dono roda comando: `/guildlens-admin activate-pro server_id:XXX dias:30`.
    -   Bot confirma: "Plano Pro Ativado".
    -   Staff fecha o ticket.

## 3. Fluxo de Verificação e Guardian

### Verificação (Entrada)
1.  Usuário entra no servidor oficial.
2.  Bot concede cargo `Membro` automaticamente (se configurado em `officialServer.js`).
3.  Bot envia Boas-vindas no canal de entrada e DM.
4.  No canal `#verificacao`, usuário pode clicar para ganhar cargo `Verificado` (redundância visual).

### Guardian (Proteção)
1.  **Monitoramento**: O `guardian.js` lê todas as mensagens.
2.  **Filtros**:
    -   **Vendas**: Palavras como "vendo", "preço" são bloqueadas (exceto Staff).
    -   **Ofensas**: Lista de palavras tóxicas.
3.  **Punição**:
    -   Mensagem deletada.
    -   Aviso via DM.
    -   Log enviado para canal secreto de logs.
4.  **Restauração**: Periodicamente, o Guardian checa se as mensagens dos canais oficiais (Regras, Planos) foram deletadas e as reposta.

## 4. Fluxo de Analytics e Exportação

1.  **Health Score**:
    -   Calculado sob demanda.
    -   Analisa últimos 7 dias.
2.  **Exportação (`/guildlens-export`)**:
    -   **Restrição**: Exclusivo para plano **GROWTH**. (Usuários Pro recebem aviso de upgrade).
    -   **Formatos**:
        -   JSON: Estrutura completa.
        -   CSV: Tabela compatível com Excel/Sheets.
    -   Dados: Mensagens recentes, lista de canais ou estatísticas agregadas.
