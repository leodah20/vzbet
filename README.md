# VZBet

📍 [Mapa interativo da arquitetura](https://claude.ai/code/artifact/11f4c693-f7b1-432b-8667-3ba8368a08cc) — visão geral navegável do backend (camadas, módulos, dados, endpoints, decisões).

App de palpites de placar para times de futebol de várzea (amador/local). Torcedores dão o palpite do placar de cada partida, ganham pontos conforme a regra abaixo, e disputam um ranking. O app nunca movimenta dinheiro real — qualquer prêmio é combinado pelo grupo por fora.

## Regra de pontuação

- Placar exato: 3 pontos
- Resultado certo (vitória/empate/derrota), placar errado: 1 ponto
- Resultado errado: 0 pontos

## Stack

- Backend: NestJS + Prisma + PostgreSQL (Clean Architecture: domain/use-cases/data/presentation)
- Frontend: React + Vite (PWA) — ver plano separado
- Deploy: Render

## Rodando localmente

```bash
cd backend
npm install
cp .env.example .env   # preencher DATABASE_URL e JWT_SECRET
npx prisma migrate dev
npm run start:dev
```

## Testes

```bash
cd backend
npm test
```

## Documentação

- [Arquitetura](docs/architecture.md) — visão geral, diagrama, camadas, decisões-chave
- [Padrões de código](docs/coding-standards.md)
- [Diagrama ER](docs/entity-relationship-diagram.md)
- [Casos de uso](docs/use-cases.md)
- [Fluxo de palpite](docs/flowcharts/prediction-flow.md)
- [Legal & Compliance](docs/legal-compliance.md)
- [Setup de desenvolvimento](docs/dev-setup.md)
- [Decisões e planejamento](docs/decisions-and-planning.md)
- [Deploy do backend na nuvem](docs/deploy-backend-cloud.md)
- [Debug log](docs/debug-log.md)
- [Changelog](docs/changelog.md)
- [Spec de design original](docs/superpowers/specs/2026-07-28-var-apostas-varzea-design.md)
