# Decisões de Arquitetura e Planejamento

> Documento para o Claude se atualizar sobre o que foi decidido e implementado no VZBet.

## Estado Atual (Jul 2026)

### O que funciona HOJE (backend + frontend completos — deploy ainda não começou)

**✅ Backend completo, revisado e testado (Clean Architecture, 6 módulos):**
- `auth` — registro (sempre `TORCEDOR`, sem campo `role` no input), login com JWT, `JwtAuthGuard` +
  `RolesGuard`/`@Roles()`
- `teams` — criar/listar/buscar times
- `players` — adicionar/listar jogadores de um time (`POST /teams/:teamId/players`)
- `championships` — criar/listar campeonatos (`PONTOS_CORRIDOS` ou `MATA_MATA`)
- `matches` — agendar, cancelar e listar partidas (com filtros `teamId`/`championshipId`/`status`)
- `predictions` — submeter/editar palpite até o apito inicial, registrar resultado (atômico via
  `$transaction`), ranking (`GetRankingUseCase`, puro e testado), `GET /predictions/me`

**✅ Regra de pontuação implementada como função pura**, sem dependência de framework/banco:
`calculatePredictionPoints(guess, result)` em `backend/src/predictions/domain/scoring.ts` — placar
exato = 3 pontos, acertou só o resultado (vitória casa/fora/empate) = 1 ponto, errou tudo = 0
pontos. Partida cancelada nunca pontua.

**✅ Sistema de erros de domínio** (`NotFoundError`/`ValidationError`/`ConflictError`/
`UnauthorizedError` + `DomainErrorFilter` global) mapeando para 404/400/409/401 automaticamente, sem
try/catch por controller.

**✅ Segurança revisada:** bcrypt (cost 10), payload de JWT mínimo (`{ sub, role }`), proteção
contra timing attack no login (bcrypt.compare sempre roda, mesmo pra e-mail inexistente), fail-fast
se `JWT_SECRET` não estiver setado (o app recusa subir sem ele).

**✅ 12 suites / 32 testes passando** (Jest, TDD RED→GREEN) como da última revisão.

**✅ Frontend completo (React 19 + Vite + TypeScript + Tailwind 4), construído depois do backend:**
- **11 telas**: Login, Cadastro, Painel (home após login), Partidas (com palpite embutido),
  Meus Palpites, Ranking, Campeonatos, Classificação, Página do time, NavBar + rotas protegidas.
- **Padrão de arquitetura:** tudo que é cálculo vive em funções puras em `frontend/src/lib/`
  (`standings`, `performance`, `badges`, `pointsProgression`, `teamsAccompanied`, `teamStats`,
  `jwt`) — cada uma com teste unitário próprio; componentes de tela são finos por cima, consumindo
  as mesmas APIs do backend (TanStack Query).
- **Features entregues** (fluxo spec → plano → TDD, documentado em
  `docs/superpowers/specs/` + `plans/`): painel inicial com emblemas/próximos jogos/top-3/últimos
  resultados de times acompanhados; emblemas de conquista (4 categorias, bronze/prata/ouro, confete
  CSS puro, celebração única por navegador via `localStorage`); gráfico de evolução de pontos
  (recharts) em Meus Palpites; ícones de emblema com lucide-react; escudo SVG com iniciais por time;
  seção de estatísticas por time (casa/fora, médias de gols, forma recente) — os 3 pedaços do pedido
  de "dashboards detalhados" estão prontos.
- **34 suites / 74 testes Vitest + RTL passando** (TDD RED→GREEN, mesmo padrão do backend) e build
  de produção limpo (`tsc --noEmit && vite build`).
- **Seed com dados reais** de Copa Metal Ferraz e Copa das Comunidades (`backend/prisma/seed.ts`),
  mais um script de seed de admin.

**❌ Deploy:** ainda não iniciado. Alvo planejado é Render (Web Service free tier + PostgreSQL
gerenciado), mas nada foi publicado ainda — não existe URL, não existe app rodando em lugar nenhum
além do ambiente local.

### Decisões de Arquitetura

#### 1. Pivô: pool de palpites, nunca aposta com dinheiro real
- **Decisão:** o app é um jogo de prever placares por pontos/ranking. Nenhum valor monetário
  circula dentro do app; qualquer prêmio combinado por um grupo é resolvido inteiramente fora dele.
- **Motivo:** a Lei 14.790/2023 exige autorização SPA/MF para apostas de quota fixa com dinheiro
  real, com exigências de capital (R$30M capital social, R$30M outorga, R$5M reserva) inviáveis
  para um projeto indie.
- **Impacto:** a marca e o escopo inteiro do produto giram em torno de "palpite por pontos", nunca
  de aposta. Isso também definiu o nome: VZBet (renomeado em 2026-07-29 a partir do título de
  trabalho "Várzea Palpites").

#### 2. Prisma 7 como ORM obrigatório (não opcional como em outros projetos)
- **Decisão:** usar Prisma 7.9.1 como ORM, com PostgreSQL 16 como banco.
- **Motivo:** ao contrário de projetos onde o banco é opcional, o VZBet só existe se times,
  partidas e palpites forem persistidos com relações reais de chave estrangeira — não dá pra rodar
  "sem banco".
- **Impacto:** trouxe uma série de mudanças de comportamento do Prisma 7 que tiveram que ser
  descobertas e corrigidas durante o build (ver seção "Prisma 7 — armadilhas já pagas" abaixo).

#### 3. Sistema de erros de domínio (não estava no plano original)
- **Decisão:** criar `NotFoundError`, `ValidationError`, `ConflictError`, `UnauthorizedError` em
  `backend/src/shared/domain/errors.ts` + um `DomainErrorFilter` global (`@Catch(...)`) que mapeia
  cada um para o HTTP status correto.
- **Motivo:** uma revisão de código do módulo `teams` (o primeiro módulo de feature revisado) achou
  que erros de negócio esperados ("time não encontrado") estavam sendo lançados como `Error` puro,
  virando 500 genérico em vez de 404/400 de verdade.
- **Impacto:** todo módulo construído depois desse ponto usa o padrão corretamente. O módulo `auth`
  (construído mais cedo) tinha sua própria tradução manual via try/catch com comparação de string —
  isso foi identificado como dívida técnica e corrigido na "Wave A" da revisão final (ver "Bugs reais
  encontrados" abaixo).

#### 4. Controllers instanciam use-cases diretamente, sem DI container
- **Decisão:** todo controller cria o use-case na mão (`new CreateTeamUseCase(this.teamRepository)`)
  em vez de registrar no container de injeção de dependência do NestJS.
- **Motivo:** é um padrão consistente e deliberado adotado em todos os controllers do projeto, não
  uma inconsistência a "corrigir".
- **Impacto:** mantém os use-cases como classes TypeScript simples, testáveis isoladamente com
  repositórios mockados, sem acoplamento ao ciclo de vida do NestJS.

#### 5. Apenas dois papéis, promoção de ADMIN só via banco
- **Decisão:** `ADMIN` e `TORCEDOR`. Não existe cadastro público de ADMIN — a promoção é feita
  diretamente no banco de dados.
- **Motivo:** reduzir a superfície de risco: `RegisterUserInput` nem tem campo `role`, então não
  existe caminho de código para um usuário se auto-promover a ADMIN no registro.
- **Impacto:** é uma decisão consciente de escopo, não uma limitação acidental — mas cria uma
  dependência operacional (alguém precisa mexer no banco pra promover um admin), e como o JWT dura
  7 dias sem revogação, uma mudança de papel pode levar até 7 dias pra propagar de fato.

#### 6. Deploy planejado no Render (ainda não executado)
- **Decisão:** quando o deploy acontecer, será no Render — Web Service (free tier, sem cartão) +
  PostgreSQL gerenciado.
- **Motivo:** free tier viável para um projeto indie, e as configurações corretas (Root Directory
  `backend`, Start Command `node dist/src/main`) já foram descobertas e documentadas como parte da
  revisão final, evitando que o primeiro deploy real tropece nesse bloqueador.
- **Impacto:** essa é uma decisão de planejamento, ainda não uma ação concluída — nenhum backend do
  VZBet está hospedado em lugar nenhum hoje.

#### 7. Frontend calcula tudo no cliente — zero mudanças de backend pós-MVP
- **Decisão:** todas as features do frontend (classificação, desempenho, emblemas, evolução de
  pontos, times acompanhados, estatísticas por time) são derivadas no navegador a partir dos
  endpoints que já existem (`GET /matches`, `/teams`, `/predictions/me`, `/ranking`), em funções
  puras testadas.
- **Motivo:** o backend foi fechado após a revisão (Waves A/B); cada feature nova virou uma função
  pura + testes em vez de endpoint/migration novos.
- **Impacto:** consequências aceitas conscientemente: emblemas refletem o estado atual (sem
  "conquistado em tal data", podem "desaparecer" se o torcedor cair do top 3), e "time acompanhado"
  é derivado dos palpites existentes em vez de um conceito persistido de favorito.

#### 8. Dependências enxutas no frontend, com duas exceções deliberadas
- **Decisão:** `recharts` (gráfico de evolução de pontos — escolha explícita do usuário sobre o
  hand-rolled SVG, porque já entrega tooltip/animação/eixos) e `lucide-react` (ícones de emblema
  profissionais). Nenhuma outra dependência além de React, TanStack Query, React Router e Tailwind.
- **Motivo:** hábito do projeto de minimizar deps; as duas exceções são as únicas justificadas por
  valor visual/UX direto pro torcedor.
- **Impacto:** o hand-rolled SVG continua existindo só em `TeamCrest` (escudo com iniciais — não há
  como recriar os escudos reais das ligas).

### Prisma 7 — armadilhas já pagas

O Prisma instalado (7.9.1) difere de boa parte do conhecimento "padrão" mais antigo sobre a
ferramenta:

1. O gerador clássico `prisma-client-js` foi removido. O schema usa `generator client { provider =
   "prisma-client", output = "../generated/prisma", moduleFormat = "cjs" }` — `output` agora é
   obrigatório, e `moduleFormat = "cjs"` é necessário ou o NestJS quebra em runtime com
   `ReferenceError: exports is not defined in ES module scope` (Prisma 7 gera ESM por padrão; o Nest
   compila para CommonJS).
2. `DATABASE_URL` saiu do `schema.prisma` — o bloco `datasource` não tem mais linha `url`; ela vive
   só em `backend/prisma.config.ts`, usada pela CLI do Prisma (migrate/generate/studio).
3. O client em runtime precisa de um driver adapter explícito, não um `new PrismaClient()` cru —
   `PrismaService` constrói `new PrismaPg({ connectionString: process.env.DATABASE_URL })` e passa
   como `{ adapter }` pro `super()`. Exige `@prisma/adapter-pg` + `pg` (+ `@types/pg` dev).
4. O runtime da aplicação nunca carregava `.env` por padrão (só `prisma.config.ts` carregava, para a
   CLI) — corrigido adicionando `import 'dotenv/config';` como primeira linha de
   `backend/src/main.ts`, e promovendo `dotenv` de devDependency para dependency de verdade.
5. O caminho de import do client gerado, a partir de `backend/src/prisma/prisma.service.ts`, é
   `'../../generated/prisma/client'` — nunca `'@prisma/client'`.

### Bugs reais encontrados e corrigidos (em ordem cronológica)

1. **Gerador removido do Prisma 7 + descompasso ESM/CJS + driver adapter faltando** — descoberto
   construindo o `PrismaService`.
2. **Linha `datasource.url` deprecada reintroduzida por engano** durante a mesma tarefa — pega em
   revisão de código, revertida.
3. **Erros de negócio virando 500 genérico** — motivou a criação do sistema de erros de domínio
   (ver Decisão 3 acima), descoberto revisando o módulo `teams`.
4. **Registro duplicado retornava 500 cru** em vez de 409 limpo — `AuthController.register()` não
   tinha try/catch em volta de um use-case que podia lançar "e-mail já registrado". Corrigido com um
   catch estreito que só converte esse erro específico, loga qualquer outro via `Logger` do Nest, e
   relança o resto como 500 de verdade.
5. **Canal lateral de timing no login** — e-mail inexistente respondia rápido (sem bcrypt), senha
   errada rodava um bcrypt de verdade — um atacante podia distinguir "conta não existe" de "senha
   errada" só medindo a latência, mesmo com a mesma mensagem de erro. Corrigido rodando sempre
   `bcrypt.compare()`, com hash fixo dummy quando o usuário não existe.
6. **Uma verificação ao vivo obrigatória foi pulada silenciosamente uma vez**, com saída de curl
   "esperada" escrita em vez de rodada de verdade — pego antes da revisão daquela tarefa, corrigido
   em um follow-up.
7. **Revisão final do branch inteiro (após todos os módulos planejados) achou mais 6 problemas
   reais — "Wave A":**
   - `npm run start:prod` apontava pra `dist/main`, mas o entrypoint compilado de verdade é
     `dist/src/main` (porque `prisma.config.ts` fica na raiz do backend, fora de `src/`, o que
     alarga o `rootDir` inferido do TypeScript) — teria sido um bloqueador de deploy no Render.
   - Fallback silencioso de `JWT_SECRET`: se a variável de ambiente não estivesse setada, o app
     caía num valor hardcoded (`'dev-only-change-me'`), publicado no próprio histórico do git —
     corrigido com um `getRequiredEnv()` que falha ao subir se a variável estiver faltando.
   - Uma partida cancelada ainda podia ser finalizada e ter seus palpites pontuados (só
     `status === 'FINALIZADA'` era checado, não qualquer status diferente de `AGENDADA`) — violação
     real da própria regra do produto de que partida cancelada não pontua.
   - Nenhum CORS configurado — o frontend (ainda não construído), rodando em outra origem, não
     conseguiria chamar a API.
   - Tradução manual de erro do módulo `auth` (ver Decisão 3) — corrigida para usar
     `ConflictError`/`UnauthorizedError` como todo o resto.
   - Campos de string obrigatórios em DTOs (nome de time, nome/posição de jogador, nome/temporada de
     campeonato) aceitavam string vazia — faltava `@IsNotEmpty()`.
8. **"Wave B" — correções mais substanciais, cada uma verificada contra servidor + Postgres reais:**
   - `RegisterMatchResultUseCase` não era atômico (gravava o resultado, depois fazia loop chamando
     `updatePoints()` por palpite) — uma falha no meio deixava a partida `FINALIZADA` com só alguns
     palpites pontuados, e o guard de `FINALIZADA` bloqueava qualquer nova tentativa pra sempre.
     Corrigido com `registerResultAndScorePredictions(matchId, result, scoredPredictions)`, via
     `$transaction` em forma de array do Prisma — update da partida e pontuação de todos os palpites
     acontecem em uma única transação atômica.
   - Agregação de ranking vivia dentro de `PrismaPredictionRepository.getRanking()` (impossível de
     testar sem banco ao vivo, e sem o filtro por campeonato que o próprio produto exigia). Movida
     para `GetRankingUseCase` (função pura e testada), com filtro `championshipId` e desempate
     alfabético (`localeCompare(..., 'pt-BR')`) para pontuação igual.
   - Fãs conseguiam submeter/editar palpites mas nunca ler de volta — adicionado
     `GET /predictions/me`.
   - `GET /matches` retornava toda partida incondicionalmente, sem forma de buscar o histórico de um
     time — adicionados os filtros opcionais `teamId`/`championshipId`/`status`.
9. **Uma rodada de correção após a própria revisão da Wave B** removeu código morto (os métodos
   antigos e não-atômicos `MatchRepository.registerResult`/`PredictionRepository.updatePoints`
   ficaram sem nenhum chamador depois da correção da transação, mas continuavam no código — um
   futuro contribuidor que os usasse reabriria exatamente o bug já corrigido) e adicionou validação
   ao novo filtro `status` (um valor inválido como `?status=FOO` antes causava um 500 não tratado via
   `PrismaClientValidationError` cru, por não ser um dos 4 erros de domínio tipados que o filtro
   global reconhece).

### Pendências conhecidas (deliberadamente adiadas — não são bugs a "corrigir" aqui)

- `backend/test/app.e2e-spec.ts` (o smoke test padrão gerado pelo CLI do NestJS) está quebrado
  porque o ts-jest não resolve os imports estilo ESM do client gerado pelo Prisma. Parcialmente
  mitigado (`moduleNameMapper` + um `setupFiles` de dotenv), mas não totalmente resolvido — segue
  como item aberto rastreado. A estratégia real de testes do projeto são os testes unitários com
  repositórios mockados (32 passando), não esse smoke test legado.
- Não existem endpoints de update/delete para teams, players, championships ou matches — a API hoje
  é "CR" (create + read), não CRUD completo. É uma decisão deliberada de escopo do MVP, não um
  descuido.
- Não há rate limiting em `/auth/login`.
- `app.enableCors()` está habilitado para qualquer origem (sem allowlist) — correto pra
  desenvolvimento, mas precisa ser restrito à origem real do frontend antes do deploy de produção.
- Mudança de papel (role) pode levar até 7 dias para propagar (JWT `expiresIn: '7d'`, sem
  revogação) — relevante porque a promoção a ADMIN é feita manualmente, direto no banco.

### Plano de Ação

#### ✅ Concluído (backend)
- [x] **Arquitetura Clean Architecture** nos 6 módulos (auth, teams, players, championships,
      matches, predictions), cada um com `domain/`, `use-cases/`, `data/`, `presentation/`
- [x] **Sistema de erros de domínio** + `DomainErrorFilter` global
- [x] **Autenticação JWT** + bcrypt + correção de timing attack no login
- [x] **Fail-fast de `JWT_SECRET`** no boot
- [x] **Transação atômica** em `RegisterMatchResultUseCase` ($transaction)
- [x] **Ranking testável** (`GetRankingUseCase` puro, com filtro por campeonato e desempate)
- [x] **16 endpoints** implementados (ver tabela de rotas)
- [x] **12 suites / 32 testes passando** (Jest, TDD RED→GREEN)
- [x] **Revisão final do branch** — Wave A (6 correções) + Wave B (4 correções) + rodada de limpeza
      pós-Wave B
- [x] **Rebrand para VZBet** — repo, remote e pasta local renomeados a partir de "Várzea Palpites"

#### ✅ Concluído (frontend)
- [x] **MVP de telas do torcedor** — login/cadastro, partidas com palpite, meus palpites, ranking,
      campeonatos, classificação, página do time (11 telas, rotas protegidas, NavBar)
- [x] **Painel inicial como home pós-login** — emblemas em destaque, próximos jogos, top 3 do
      ranking, últimos resultados de times acompanhados, cada seção com "ver mais"
- [x] **Emblemas de conquista** — 4 categorias, bronze/prata/ouro, progresso até o próximo nível,
      celebração de desbloqueio com confete CSS puro (uma vez por navegador)
- [x] **Gráfico de evolução de pontos** (recharts) em Meus Palpites + ícones de emblema com
      lucide-react
- [x] **Estatísticas extras por time** — aproveitamento casa/fora, média de gols, forma recente
      (último dos 3 pedaços de "dashboards detalhados")
- [x] **Escudo SVG com iniciais** por time (`TeamCrest`), usado em partidas, página do time e
      classificação
- [x] **34 suites / 74 testes Vitest passando** (TDD RED→GREEN) + build de produção limpo
- [x] **Seed com resultados históricos reais** de Copa Metal Ferraz e Copa das Comunidades

#### 🔵 Em aberto, rastreado (não é trabalho ativo agora)
- [ ] Resolver o `app.e2e-spec.ts` quebrado (ts-jest + import ESM do Prisma)
- [ ] Rate limiting em `/auth/login`
- [ ] Restringir `app.enableCors()` a uma origem específica (hoje aceita qualquer origem)

#### Curto prazo
- [ ] Fazer o primeiro deploy do backend no Render (Web Service free tier + PostgreSQL gerenciado)
- [ ] Restringir o CORS à origem real do frontend (agora que o frontend existe e tem origem definida
      em produção)
- [ ] Empacotar o frontend como PWA instalável (o plano original sempre previu PWA, o código atual
      ainda não tem service worker/manifest)

#### Médio prazo
- [ ] Endpoints de update/delete (CRUD completo) para teams, players, championships e matches
- [ ] Deploy do frontend e integração ponta a ponta com o backend em produção

#### Longo prazo
- [ ] Revisar a política de expiração/revogação de JWT (hoje 7 dias, sem revogação)
- [ ] Reavaliar a estratégia de promoção de ADMIN (hoje só via banco, manual)

### Comandos Úteis (para o Claude)

```bash
# Subir Postgres local via Docker (porta 5433, não a 5432 padrão)
docker run --name vzbet-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=varzea_palpites -p 5433:5432 -d postgres:16

# Setup inicial do backend
cd backend
npm install
cp .env.example .env   # preencher DATABASE_URL e JWT_SECRET (obrigatório)
npx prisma migrate dev
npm run start:dev

# Rodar os testes
cd backend
npm test   # 12 suites / 32 testes (Jest, repositórios mockados)

# Frontend
cd frontend
npm install
npm test        # 34 suites / 74 testes (Vitest + RTL)
npm run build   # tsc --noEmit && vite build
npm run dev     # dev server Vite

# Git
git add -A
git commit -m "mensagem"
git push origin main
```

### Notas sobre o Projeto

- **O que é:** um app de palpites de placar (não aposta com dinheiro real) para times/campeonatos
  de futebol amador ("várzea") no Brasil. Fãs se cadastram, veem times/jogadores/campeonatos/
  partidas, enviam um palpite de placar antes do apito inicial e acompanham um ranking por acerto.
- **Marca:** VZBet, identidade visual azul e branco (sem verde), vermelho reservado só para avisos
  de risco genuíno (ex.: risco legal), nunca como decoração de marca.
- **Escopo atual:** backend e frontend completos e testados localmente. Deploy (Render) e
  empacotamento PWA são as próximas fases — não há app rodando em celular nem backend hospedado em
  lugar nenhum hoje.
- **Framework:** NestJS 11 + TypeScript no backend; React 19 + Vite + Tailwind 4 no frontend.
- **ORM/Banco:** Prisma 7.9.1 + PostgreSQL 16 (Docker localmente; Render-managed é o plano para
  produção).
- **Testes:** Jest no backend (12 suites / 32 testes) e Vitest + RTL no frontend (34 suites / 74
  testes), ambos em disciplina TDD RED→GREEN.
- **Motivo regulatório do modelo sem dinheiro real:** Lei 14.790/2023 exige autorização SPA/MF e
  capital fora do alcance de um projeto indie para apostas de quota fixa com dinheiro real — daí o
  pivô deliberado para um jogo de pontos/ranking, com qualquer prêmio combinado fora do app.
