# GuildLens-bot

## Visao Geral
Bot de analytics para comunidades Discord com foco em saude do servidor, insights e automacoes.

## Status do Projeto
| Item | Valor |
|:--|:--|
| Maturidade | Em evolucao ativa |
| Tipo | Bot + backend |
| Ultima atualizacao relevante | 2026-02 |

## Stack
| Camada | Tecnologias |
|:--|:--|
| Runtime | Node.js 20+ |
| Plataforma | discord.js |
| Banco | PostgreSQL |
| Testes | Jest |

## Estrutura
- `src/`: codigo principal.
- `tests/`: testes automatizados.
- `schema.sql`: estrutura de dados.
- `ARCHITECTURE.md`, `FLOWS.md`, `DEV_GUIDE.md`: docs tecnicas.

## Como Executar
```bash
git clone https://github.com/SavioCodes/GuildLens-bot.git
cd GuildLens-bot
npm install
cp .env.example .env
npm start
```

## Testes
```bash
npm test
```

## CI
Workflow padronizado em `.github/workflows/ci.yml`.

## Deploy
Sem URL publica fixa no README.

## Roadmap
- melhorar cobertura de testes por comando
- refinar monitoramento e logs
- evoluir automacoes administrativas

## Licenca
MIT (`LICENSE`).