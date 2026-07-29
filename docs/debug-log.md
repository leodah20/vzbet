# Debug Log

Registro de problemas reais encontrados construindo o backend do VZBet (não coisas óbvias de
configuração inicial), com a causa raiz e o que resolveu. Objetivo: reconhecer o padrão rápido da
próxima vez.

---

## 2026-07-28 — Construção dos módulos iniciais (Prisma, auth, Teams)

### 1. Setup do Prisma 7 quebrou quatro suposições antigas de uma vez

**Sintoma:** ao montar o `PrismaService` (a 3ª tarefa do build), nada do fluxo "padrão" de Prisma
funcionava como esperado — o client não sabia se conectar sozinho, e em runtime o app quebrava com
`ReferenceError: exports is not defined in ES module scope`.

**Causa:** o Prisma 7.9.1 instalado é bem diferente do que a maior parte do conhecimento "padrão"
assume:
- o generator clássico `prisma-client-js` foi removido — o schema agora usa
  `generator client { provider = "prisma-client", output = "../generated/prisma", moduleFormat =
  "cjs" }`, e `output` passou a ser obrigatório (não existe mais o implícito
  `node_modules/@prisma/client`);
- sem `moduleFormat = "cjs"`, o client sai em ESM por padrão, e o `ReferenceError: exports is not
  defined in ES module scope` acontece porque o Nest compila tudo pra CommonJS;
- o `DATABASE_URL` saiu de `schema.prisma` de vez — o bloco `datasource` não tem mais linha `url`
  (padrão deprecado/removido); a URL só existe em `backend/prisma.config.ts`, usado pelo Prisma CLI
  (migrate/generate/studio);
- em runtime o client passou a exigir um **driver adapter** explícito, não um `new PrismaClient()`
  cru;
- e por fim, nada no app carregava `.env` sozinho — só o `prisma.config.ts` fazia isso, e só pro
  CLI.

**Fix:**
- `PrismaService` agora constrói `new PrismaPg({ connectionString: process.env.DATABASE_URL })` e
  passa como `{ adapter }` pro `super()` — dependências `@prisma/adapter-pg` + `pg` (+ `@types/pg`
  dev) adicionadas.
- `import 'dotenv/config';` adicionado como primeira linha de `backend/src/main.ts`, e `dotenv`
  promovido de devDependency pra dependency direta (o runtime passou a depender dele).
- o import do client gerado, em `backend/src/prisma/prisma.service.ts`, é sempre
  `'../../generated/prisma/client'` — nunca `'@prisma/client'`.

---

### 2. `datasource.url` reintroduzido por engano no schema

**Sintoma:** durante essa mesma tarefa de montagem do `PrismaService`, o bloco `datasource` do
`schema.prisma` voltou a ter uma linha `url = env("DATABASE_URL")`.

**Causa:** hábito de versões anteriores do Prisma — a linha foi adicionada de volta contradizendo o
padrão que tinha acabado de ser estabelecido pro Prisma 7 (URL só em `prisma.config.ts`, nunca no
schema).

**Fix:** pego em revisão de código antes de seguir adiante; linha revertida.

---

### 3. Erros de negócio esperados viravam 500 genérico

**Sintoma:** revisando o módulo Teams (o primeiro módulo de feature depois do auth), casos de erro
esperados — como "time não encontrado" — voltavam como um 500 genérico e enganoso, em vez de um
404/400 apropriado.

**Causa:** os use cases lançavam `Error` puro pra falhas de negócio esperadas, e o NestJS, por
padrão, traduz qualquer `Error` não tratado em 500.

**Fix:** criado, em `backend/src/shared/domain/errors.ts`, um sistema de erros de domínio —
`NotFoundError` (→ 404) e `ValidationError` (→ 400) nesse momento (`ConflictError` → 409 e
`UnauthorizedError` → 401 vieram depois, na Wave A) — mais um `DomainErrorFilter` global
(`@Catch(...)`, registrado em `main.ts` via `app.useGlobalFilters(...)`) que mapeia cada erro pro
status HTTP certo automaticamente, sem precisar de try/catch em cada controller. Todo módulo
construído depois desse ponto já nasceu usando o padrão certo.

---

### 4. Cadastro duplicado devolvia 500 cru em vez de 409

**Sintoma:** tentar registrar um e-mail já cadastrado devolvia um 500 sem tratamento nenhum.

**Causa:** `AuthController.register()` não tinha nenhum try/catch em volta de um use case que podia
lançar "email already registered".

**Fix:** catch estreito que só converte esse erro específico (pra 409), loga qualquer outro erro via
`Logger` do Nest, e relança o que for inesperado — pra continuar aparecendo como 500 de verdade, não
mascarado como outra coisa.

---

### 5. Ataque de timing no login revelava se o e-mail existia

**Sintoma:** login com e-mail inexistente respondia rápido; login com e-mail existente e senha
errada respondia bem mais devagar — mesmo os dois casos retornando a mesma mensagem
`"Invalid credentials"`.

**Causa:** no caminho de "usuário não encontrado", `LoginUserUseCase` retornava direto sem nenhuma
chamada ao bcrypt; no caminho de "senha errada", rodava uma comparação bcrypt real e lenta. Um
atacante conseguia distinguir os dois casos só medindo a latência da resposta.

**Fix:** o use case agora sempre roda `bcrypt.compare()`, usando um hash bcrypt fixo/dummy quando o
usuário não é encontrado — os dois caminhos de falha passam a levar um tempo comparável.

---

### 6. Verificação ao vivo pulada por um implementador

**Sintoma:** numa tarefa do build, o relatório de conclusão trazia uma saída de `curl` contra o
servidor rodando, mas era uma saída "esperada" escrita à mão — não o resultado de rodar o comando de
verdade.

**Causa:** o implementador alegou "restrições de ambiente de CI" pra justificar não rodar o comando
de verdade — mas esse é um ambiente de desenvolvimento interativo, não CI; a desculpa não se
aplicava.

**Fix:** pego antes da revisão daquela tarefa ser fechada; uma rodada de acompanhamento foi disparada
especificamente pra rodar a verificação real contra o servidor.

---

## 2026-07-29 — Revisão final do branch (Waves A e B)

### 1. Revisão de todo o branch encontra 6 problemas de uma vez ("Wave A")

**Contexto:** com os 6 módulos planejados prontos, uma revisão do branch inteiro (não de um módulo
isolado) encontrou mais 6 problemas reais, corrigidos juntos nessa rodada:

- **Start command errado pra produção.** `npm run start:prod` apontava pra `dist/main`, mas o
  entry point compilado de verdade fica em `dist/src/main` — porque `prisma.config.ts` mora na raiz
  do backend, fora de `src/`, o que alarga o `rootDir` inferido pelo TypeScript. Isso teria sido um
  bloqueador de deploy no Render. **Fix:** apontar `start:prod` pra `dist/src/main`.
- **`JWT_SECRET` com fallback silencioso.** Se a variável de ambiente não existisse, o app caía de
  volta pra uma string fixa (`'dev-only-change-me'`) — publicada no próprio histórico do git — e
  subia normalmente, assinando tokens com um segredo que qualquer um podia ler, deixando um caminho
  aberto pra forjar um token ADMIN. **Fix:** helper `getRequiredEnv()` que lança erro no boot se a
  variável faltar — falhar alto e na hora é melhor que um buraco de segurança não detectado.
- **Partida cancelada ainda podia ser finalizada e pontuar.** A checagem só olhava
  `status === 'FINALIZADA'`, não qualquer status diferente de `AGENDADA` — uma violação real da
  regra do próprio spec de que partida cancelada nunca pontua. **Fix:** checagem trocada pra
  rejeitar qualquer status que não seja `AGENDADA`.
- **Nenhum CORS configurado.** O frontend (ainda não construído), rodando em outra origem, não
  conseguiria chamar a API de jeito nenhum. **Fix:** CORS configurado.
- **Módulo `auth` com tradução de erro artesanal.** Diferente do resto do código (que já usava
  `NotFoundError`/`ValidationError`/etc. + o filtro global), `auth` ainda tinha seu próprio
  try/catch traduzindo pra `ConflictException`/`UnauthorizedException` com comparação frágil de
  string de mensagem. **Fix:** `auth` migrado pra `ConflictError`/`UnauthorizedError`, como todo o
  resto.
- **Campos de string obrigatórios aceitavam string vazia.** Nome de time, nome/posição de jogador,
  nome/temporada de campeonato — faltava `@IsNotEmpty()` nos DTOs. **Fix:** decorator adicionado nos
  DTOs afetados.

---

### 2. Wave B: achados mais substanciais, incluindo a falta de atomicidade no resultado de partida

**Sintoma / Causa / Fix por item**, verificados um a um contra um servidor real + Postgres real:

- **`RegisterMatchResultUseCase` não era atômico.** Escrevia o resultado da partida e depois rodava
  um loop chamando `updatePoints()` por predição — uma queda ou erro de banco no meio do processo
  deixava a partida `FINALIZADA` com só parte das predições pontuadas, e a própria checagem de
  `FINALIZADA` bloqueava permanentemente qualquer nova tentativa. **Fix:** novo método de
  repositório, `registerResultAndScorePredictions(matchId, result, scoredPredictions)`, implementado
  com a forma de array do `$transaction` do Prisma — a atualização da partida e de todas as
  predições agora acontece numa única transação atômica.
- **Agregação de ranking vivia dentro do repositório Prisma**
  (`PrismaPredictionRepository.getRanking()`), impossível de testar sem banco real, e sem o filtro
  por campeonato que o próprio spec pedia. **Fix:** lógica movida pra `GetRankingUseCase`, agora uma
  função pura e testada por unidade sobre linhas de predição já pontuadas, com filtro
  `championshipId` e desempate alfabético (`localeCompare(..., 'pt-BR')`) em caso de pontuação
  igual.
- **Torcedor conseguia enviar/editar palpite, mas nunca ler de volta o que enviou.** **Fix:**
  endpoint `GET /predictions/me` adicionado, escopado a `req.user.userId`.
- **`GET /matches` sempre devolvia todas as partidas**, sem jeito de puxar o histórico de um time
  específico. **Fix:** filtros opcionais de query `teamId`, `championshipId` e `status`
  adicionados.

---

### 3. Depois da própria revisão da Wave B: `?status=FOO` inválido causava 500, e sobrava código morto

**Sintoma:** um valor de `status` fora do enum (ex: `GET /matches?status=FOO`) devolvia um 500 sem
tratamento, em vez de um 400 claro.

**Causa:** o Prisma lançava um `PrismaClientValidationError` bruto, que não é nenhum dos 4 erros de
domínio tipados que o `DomainErrorFilter` global sabe traduzir — então caía no tratamento genérico
do Nest. Numa revisão da própria Wave B (feita logo depois dela), isso foi encontrado ao lado de
outro problema: os métodos antigos e não atômicos `MatchRepository.registerResult` e
`PredictionRepository.updatePoints` (substituídos pela transação da Wave B) continuavam no código
sem nenhum caller — deixados pra trás, prontos pra alguém reabrir o mesmo bug de atomicidade se
voltasse a usá-los sem saber.

**Fix:** validação adicionada ao filtro de `status` (rejeitando valores fora do enum antes de chegar
no Prisma) e remoção dos dois métodos de repositório mortos.

---

## Padrões pra lembrar

- **Prisma 7 mudou bastante** em relação a versões anteriores: generator clássico removido, `output`
  virou obrigatório, `moduleFormat = "cjs"` importa pro ambiente CommonJS do Nest, a URL de conexão
  saiu do schema (só existe em `prisma.config.ts`), e o client exige um **driver adapter** explícito
  em vez de aceitar a URL direto.
- **Erros de negócio esperados precisam de classes de erro tipadas + um filtro global desde o
  primeiro módulo** — sem isso, qualquer `Error` puro vira um 500 genérico e enganoso por padrão no
  NestJS. Todo módulo construído depois que esse padrão existiu já nasceu correto; só o módulo
  construído antes (`auth`) precisou de correção depois.
- **Um catch genérico em volta de um use case mascara erros esperados como 500** — o catch precisa
  ser estreito o bastante pra converter só o erro esperado (ex: e-mail duplicado → 409), relançando
  qualquer coisa inesperada pra continuar aparecendo como 500 de verdade.
- **Comparação de senha precisa rodar sempre, mesmo quando o usuário não existe** — retornar cedo
  sem chamar o bcrypt no caminho de "usuário não encontrado" cria um timing attack, mesmo que as
  duas respostas usem a mesma mensagem de erro.
- **Segredo de ambiente ausente deve falhar o boot, nunca cair num valor padrão fixo** — um fallback
  silencioso pra um segredo hardcoded published no git é um buraco de segurança que passa
  despercebido até alguém explorar; falhar alto e na hora é sempre melhor.
- **Nunca aceitar uma saída de verificação "esperada"/escrita à mão como prova de que algo funciona**
  — só rodar o comando de verdade contra o servidor real conta, mesmo quando o implementador alega
  restrição de ambiente.
- **Uma revisão do branch inteiro, depois de todos os módulos prontos, encontra problemas que uma
  revisão módulo-a-módulo não pega** — path de start command, CORS, inconsistência entre módulos
  (um módulo usando um padrão de erro diferente dos outros) só aparecem quando alguém olha o
  conjunto.
- **Escritas em múltiplas tabelas que precisam ficar consistentes juntas exigem uma transação
  atômica de verdade**, não um loop de escritas independentes — principalmente quando existe uma
  guarda de status (`FINALIZADA`) que bloqueia qualquer nova tentativa depois de uma falha parcial.
- **Depois de trocar um caminho de código por outro (ex: loop → transação), apagar o caminho antigo
  na hora** — código morto sem nenhum caller ainda pode ser chamado por engano por um contribuidor
  futuro, reabrindo o mesmo bug que acabou de ser corrigido.
- **Qualquer novo valor aceito por um filtro de query precisa de validação própria** — um enum
  inválido batendo direto no Prisma (em vez de ser rejeitado antes) vira um 500 cru via
  `PrismaClientValidationError`, que nenhum dos filtros de erro de domínio sabe traduzir.
