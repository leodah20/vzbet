# VZBet

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

- [Casos de uso](docs/use-cases.md)
- [Diagrama ER](docs/er-diagram.md)
- [Spec de design](docs/superpowers/specs/2026-07-28-var-apostas-varzea-design.md)
