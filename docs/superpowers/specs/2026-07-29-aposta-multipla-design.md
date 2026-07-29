# VZBet — Aposta Múltipla (nova mecânica de palpite)

## Contexto

O mecanismo de palpite atual (implementado, testado, documentado como o "mecanismo
principal" do projeto em `docs/architecture.md`) só aceita um palpite de placar por
partida: `predictedHome`/`predictedAway`, com placar exato valendo 3 pontos e acerto só
do resultado (V/E/D) valendo 1 ponto. O usuário considerou essa mecânica genérica demais
e pediu uma versão mais rica, inspirada em apostas múltiplas (parlay): o torcedor arrisca
duas "pernas" separadas — resultado e placar exato — e só ganha o valor cheio se acertar
as duas, com risco real de zerar se arriscar demais e errar.

Esta spec substitui a mecânica de palpite atual (não é aditiva — o formato antigo de
"sempre dar um placar" deixa de existir).

## Decisões

1. **Duas pernas por palpite**: `resultado` (CASA/EMPATE/FORA) é sempre obrigatório.
   `placar exato` é opcional — só existe quando o torcedor decide arriscar a múltipla.
2. **Consistência obrigatória**: se o torcedor informa um placar, o resultado derivado
   desse placar tem que ser exatamente o `resultado` escolhido. O backend rejeita
   (`ValidationError`) qualquer combinação inconsistente — não existe a possibilidade de
   apostar "empate" no resultado e "2x1" no placar ao mesmo tempo.
3. **Pontuação**:
   - **Simples** (só resultado, sem placar): resultado certo = **3 pontos**, errado =
     **0**.
   - **Múltipla** (resultado + placar, consistentes): as duas pernas têm que bater ou o
     torcedor não ganha nada — **7 pontos** se o placar exato bater (o que já garante o
     resultado certo também, por construção), **0 pontos** se o placar errar, mesmo que o
     resultado que ele teria escolhido coincidentemente bata. É risco real: arriscar a
     múltipla troca a garantia dos 3 pontos simples por uma chance de 7, tudo ou nada.
4. **Sem validação cruzada no formulário que trave o torcedor** — a UI deriva o
   `resultado` automaticamente a partir do placar digitado (ver seção Frontend), então a
   inconsistência nunca chega a acontecer na prática; a validação do backend existe como
   defesa em profundidade (mesmo padrão dos outros módulos: nunca confiar cegamente no
   frontend).

## Modelo de dados

`Prediction` muda de "sempre um placar" para "resultado obrigatório, placar opcional":

```prisma
enum PredictedOutcome {
  CASA
  EMPATE
  FORA
}

model Prediction {
  id                String           @id @default(uuid())
  userId            String
  user              User             @relation(fields: [userId], references: [id])
  matchId           String
  match             Match            @relation(fields: [matchId], references: [id])
  predictedOutcome  PredictedOutcome
  predictedHome     Int?
  predictedAway     Int?
  pointsEarned      Int?
  createdAt         DateTime         @default(now())

  @@unique([userId, matchId])
}
```

`predictedHome`/`predictedAway` são **ambos nulos** (aposta simples) ou **ambos
preenchidos** (aposta múltipla) — nunca um só. Isso precisa de uma migration nova (o
projeto ainda não tem usuários reais em produção, então não há dado histórico a migrar
com cuidado — a migration pode recriar a coluna livremente).

## Backend

**`SubmitPredictionDto`** ganha `predictedOutcome` (obrigatório, enum) e
`predictedHome`/`predictedAway` viram opcionais. Validação (`class-validator` +
checagem manual no use-case):
- Se um dos dois placares vier preenchido, o outro também precisa vir.
- Se os dois vierem preenchidos, o resultado derivado deles tem que bater com
  `predictedOutcome` — senão `ValidationError`.

**`backend/src/predictions/domain/scoring.ts`** é reescrito:

```ts
export interface MatchResult {
  homeScore: number;
  awayScore: number;
}

export interface PredictionGuess {
  predictedOutcome: 'CASA' | 'EMPATE' | 'FORA';
  predictedHome: number | null;
  predictedAway: number | null;
}

function outcomeOf(home: number, away: number): 'CASA' | 'EMPATE' | 'FORA' {
  if (home > away) return 'CASA';
  if (home < away) return 'FORA';
  return 'EMPATE';
}

export function calculatePredictionPoints(guess: PredictionGuess, result: MatchResult): number {
  const actualOutcome = outcomeOf(result.homeScore, result.awayScore);
  const isMultipla = guess.predictedHome !== null && guess.predictedAway !== null;

  if (!isMultipla) {
    return guess.predictedOutcome === actualOutcome ? 3 : 0;
  }

  const scoreCorrect = guess.predictedHome === result.homeScore && guess.predictedAway === result.awayScore;
  return scoreCorrect ? 7 : 0;
}
```

`SubmitPredictionUseCase` passa a validar a consistência resultado/placar antes de
persistir (`ValidationError` se inconsistente). `RegisterMatchResultUseCase` não muda de
forma nenhuma — já delega inteiramente para `calculatePredictionPoints`, então a troca de
regra é transparente pra ele.

## Frontend

`MatchCard` é reconstruído:
- Três botões grandes: **Casa vence** / **Empate** / **Fora vence** — seleção única,
  sempre visível.
- Um link/toggle discreto abaixo: **"Quer arriscar o placar exato? (múltipla, vale mais)"**
  — ao clicar, revela dois campos numéricos.
- Ao digitar um placar nos dois campos, o botão de resultado correspondente é selecionado
  automaticamente e os outros dois ficam desabilitados (a UI nunca permite uma
  combinação inconsistente).
- Legenda fixa no card: "Simples: 3 pts · Múltipla: 7 pts (tudo ou nada)".
- Envio: `POST /predictions` com `{ matchId, predictedOutcome, predictedHome?,
  predictedAway? }`.

`src/types/api.ts` e `src/api/predictions.ts` são atualizados para o novo formato de
payload/resposta.

## Testes

Mesma disciplina TDD do resto do projeto:
- `scoring.spec.ts` reescrito cobrindo: simples certo/errado, múltipla certa, múltipla
  com placar errado mas resultado certo (tem que pagar 0 — é o caso mais importante de
  testar, já que é a regra "tudo ou nada" que dá sentido à mecânica).
- `SubmitPredictionUseCase` ganha teste de rejeição por inconsistência
  resultado/placar.
- Frontend: `MatchCard.test.tsx` reescrito pros três botões + toggle da múltipla +
  auto-seleção do resultado ao digitar o placar.

## Fora do escopo

- Múltiplas combinando mais de uma partida (parlay entre jogos diferentes) — a múltipla
  aqui é só dentro de uma única partida (resultado + placar dela mesma).
- Qualquer variação de valor de pontos por campeonato/rodada — os valores (3/0 simples,
  7/0 múltipla) são fixos em todo o app.
