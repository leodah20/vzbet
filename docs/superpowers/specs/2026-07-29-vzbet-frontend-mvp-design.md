# VZBet — Frontend MVP (torcedor)

## Contexto

O backend (NestJS + Prisma + PostgreSQL) está completo, testado e documentado — 6 módulos
(auth, teams, players, championships, matches, predictions) seguindo Clean Architecture, rodando
só localmente (`http://localhost:3000`). Nenhum frontend existe ainda. Esta spec cobre a primeira
leva do frontend: as telas do torcedor (cadastro, login, ver partidas e dar palpite, ver ranking).
Telas de admin (cadastrar time/jogador/campeonato/partida, lançar resultado) ficam para uma
segunda spec, depois que esta primeira leva estiver funcionando ponta a ponta.

Identidade visual: azul e branco, zero verde (vermelho reservado só para avisos reais de
erro/perigo) — mesma identidade já usada no resto do projeto (README, docs, mapa interativo da
arquitetura).

## Decisões

- **Mesmo app para torcedor e admin**, com views condicionais por `role` — não dois apps
  separados. Menos código pra manter num projeto solo; a Fase 2 (admin) reaproveita auth, layout e
  API client já prontos desta fase.
- **Escopo desta spec: só torcedor.** Login/cadastro, lista de partidas com palpite inline,
  ranking. Sem CRUD de admin ainda.
- **Tailwind CSS** para estilização — tema azul/branco definido em poucas linhas de config, sem
  dependência de um design system de terceiros.
- **TanStack Query (React Query)** para chamadas à API — cache, loading/error state e
  revalidação automática (ex: lista de partidas se atualiza sozinha depois de um palpite) sem
  precisar de um estado global tipo Redux.
- **JWT em `localStorage`** — simples, persiste entre sessões numa PWA instalada. Aceitável aqui
  porque não há dinheiro real em jogo (só palpites/ranking), diferente de um app financeiro de
  verdade.
- **React Router** para navegação entre telas — URLs reais (`/partidas`, `/ranking`),
  compartilháveis/favoritáveis, essencial pra uma PWA que cresce.
- **Deploy planejado: Vercel** (quando o MVP local estiver validado) — fora do escopo de
  implementação desta spec, só definindo a plataforma-alvo desde já.
- **Fetch nativo, sem axios** — mantém dependências enxutas; um client HTTP fino em `src/api/`.

## Arquitetura

```
[React PWA] <--REST (JSON)--> [NestJS API já existente] <--Prisma--> [PostgreSQL]
```

`frontend/` como pasta irmã de `backend/`, no mesmo repo `vzbet`. Projeto Vite + React + TypeScript.

```
frontend/src/
  api/            # client HTTP fino (fetch), um arquivo por recurso: auth.ts, matches.ts,
                  # predictions.ts, ranking.ts, teams.ts — tipado com os mesmos formatos dos
                  # DTOs do backend
  features/       # uma pasta por tela: auth/, matches/, ranking/ — componente de página + hooks
                  # do TanStack Query que chamam api/
  context/
    AuthContext.tsx   # usuário logado (id, name, role) + token; lido do localStorage no boot;
                       # expõe login()/logout()
  router.tsx      # rotas públicas (/login, /cadastro) e protegidas (/partidas, /ranking) —
                  # protegidas redirecionam pra /login sem token
```

A URL base da API é configurável via `VITE_API_URL` (default `http://localhost:3000` em dev),
para trocar sem rebuild de código quando o backend for implantado no Render.

## Telas

### `/cadastro`
Formulário: nome, email, senha (mínimo 8 caracteres, mesma regra do backend
`RegisterUserDto`). Envia `POST /auth/register`. Sucesso → redireciona para `/login` com uma
mensagem "conta criada, faça login".

### `/login`
Formulário: email, senha. Envia `POST /auth/login`, que devolve `{ accessToken }`. O token é um
JWT com payload `{ sub, role }` — decodificado no frontend (sem verificar assinatura, só leitura)
para saber o `role` do usuário logado. Token salvo em `localStorage`. Sucesso → redireciona para
`/partidas`.

### `/partidas` (tela principal)
- Busca `GET /matches` (filtra por `status=AGENDADA` por padrão) e `GET /teams` uma vez, para
  montar um mapa `id → nome do time` — `Match` só tem `homeTeamId`/`awayTeamId`, sem nome
  embutido, então o join dos nomes dos times acontece no frontend, não no backend.
- Cada partida é um card: nomes dos dois times, data/hora do jogo (`kickoffAt`), e dois campos
  numéricos (placar mandante/visitante) para o palpite.
- Busca também `GET /predictions/me` para pré-preencher os campos se o torcedor já tiver
  palpitado naquela partida, permitindo editar até o horário do jogo. Depois do `kickoffAt`, os
  campos ficam desabilitados com um aviso "prazo encerrado" (o backend também rejeita, mas a UI
  evita a tentativa).
- Enviar palpite → `POST /predictions` com `{ matchId, predictedHome, predictedAway }`
  (mesmo formato do `SubmitPredictionDto`).

### `/ranking`
Busca `GET /ranking` (aceita `?championshipId=` opcional no backend, mas a v1 da UI não expõe
esse filtro — mostra sempre o ranking geral). Lista ordenada por posição, nome, pontos totais.

### Navegação
Barra superior fixa (mobile-first): links Partidas / Ranking / Sair, visível só quando logado.
Layout pensado mobile-first porque o uso real esperado é PWA instalada no celular.

## Tratamento de erro e loading

- Erros de API (`400`/`401`/`404`/`409`, já formatados pelo `DomainErrorFilter` do backend)
  aparecem como toast ou mensagem inline no formulário, usando o `message` que a API já devolve —
  sem reescrever textos genéricos no frontend.
- `401` em qualquer chamada (token ausente/expirado) é interceptado uma única vez num wrapper
  central do client HTTP: limpa o `localStorage` e redireciona para `/login` — não é tratado
  repetidamente em cada tela.
- Loading: `isLoading`/`isFetching` do TanStack Query alimentam skeletons/spinners simples nos
  cards de partida e na lista de ranking, sem biblioteca extra de skeleton.

## Testes

Mesma disciplina de TDD do backend, adaptada ao frontend: **Vitest + React Testing Library**
(padrão para projetos Vite). Cobertura: hooks de API (mockando `fetch`), componentes de tela
(renderização condicional por `role`, validação de formulário, estado de erro). Sem testes E2E
nesta fase — ficam para quando o backend estiver implantado e houver um ambiente real para
rodar contra.

## Fora do escopo desta spec

- Telas de admin (cadastrar time/jogador/campeonato/partida, lançar resultado) — spec e plano
  separados, depois que esta fase estiver funcionando ponta a ponta.
- Deploy na Vercel — plataforma já decidida, mas a execução do deploy é uma etapa futura separada
  (mesmo padrão do `deploy-backend-cloud.md`, que documenta o guia do Render antes de executá-lo).
- Filtro de ranking por campeonato na UI (o backend já aceita `championshipId`, só não é exposto
  ainda).
- Restringir o CORS do backend à origem real do frontend — depende do domínio final do deploy na
  Vercel, tratado junto com o deploy do backend.
