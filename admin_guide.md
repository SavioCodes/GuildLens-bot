# 👑 Guia de Administração e Pagamentos

Tudo foi configurado para o seu modelo de negócio **Discord-Only**.

## 1. Configuração Inicial
1.  Renomeie `.env.example` para `.env` (se ainda não fez).
2.  Preencha as variáveis (O `OWNER_IDS` já está com o seu ID `976586934455513159`).
    *   `PIX_KEY`: A chave PIX da sua empresa.
    *   `PIX_NAME`: Nome do beneficiário (opcional).

## 2. O Fluxo de Venda (O que o cliente vê)
O cliente digita `/guildlens-premium`:
1.  Vê os benefícios (Free vs Pro vs Growth).
2.  Vê sua chave PIX.
3.  Vê um link direto para **#criar-ticket** no seu servidor oficial (`1448094379632885782`).

## 3. O Fluxo de Ativação (O que VOCÊ faz)
Você recebe o comprovante no ticket.
1.  Pega o ID do servidor do cliente e quantos dias ele pagou.
2.  Usa o comando (de qualquer lugar):
    ```
    /guildlens-admin activate-growth server_id:CLIENT_GUILD_ID dias:30
    ```
3.  Pronto! O bot ativa o plano na hora.

## 4. Servidor Oficial (God Mode)
Para forçar as permissões corretas (público vs privado) e ativar as boas-vindas:
```
/guildlens-admin fix-permissions
```
Recomendo rodar sempre que mudar algo na estrutura de canais.

## 5. Dashboard Financeiro
Para ver quanto dinheiro o bot está dando e as métricas de crescimento:
```
/guildlens-admin dashboard
```
Isso mostra um painel completo com MRR (Receita Mensal), total de assinantes e últimas vendas.
