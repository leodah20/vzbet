# VZBet — Painel inicial (dashboard)

## Contexto

O usuário pediu "dashboards detalhados" — na verdade três pedaços de escopo distintos:
gráficos de verdade, mais estatística por time, e um painel único de visão geral. Decidimos
atacar um de cada vez, começando pelo painel, que funciona como o "esqueleto" onde as outras
duas peças (gráficos, estatísticas extras) podem entrar depois.

Esta spec cobre só o painel de visão geral — gráficos e estatísticas extras por time ficam
para specs futuras, separadas.

## Decisões

1. **O painel vira a tela inicial**, substituindo o redirecionamento direto para `/partidas`
   depois do login. A rota `/` (index), hoje um redirect incondicional para `/login`, passa a
   ficar dentro do grupo de rotas protegidas: sem sessão, `ProtectedRoute` já redireciona para
   `/login` (comportamento que já existe); com sessão, `/` renderiza o painel.
2. **Sem mudança de backend.** Todo o conteúdo do painel é recalculado a cada visita, a partir
   dos mesmos endpoints já usados em outras telas (`GET /matches`, `GET /teams`,
   `GET /predictions/me`, `GET /ranking`) — mesmo padrão de classificação, meus palpites e
   emblemas.
3. **Quatro seções**, cada uma com link "ver mais" para a tela cheia correspondente:
   - **Emblemas em destaque** — reaproveita `calculateBadges` + `BadgeCard` (mesmo componente
     de Meus Palpites), no topo do painel.
   - **Próximos jogos** — as 3 partidas mais próximas (`status=AGENDADA`, ordenadas por
     `kickoffAt`), versão enxuta com escudo (`TeamCrest`) e nomes dos times, sem formulário de
     palpite embutido — o palpite continua sendo dado em `/partidas`. Link "Ver todas as
     partidas".
   - **Top 3 do ranking geral** — os 3 primeiros de `GET /ranking`, com destaque visual se o
     torcedor logado estiver entre eles. Link "Ver ranking completo".
   - **Últimos resultados dos times que você acompanha** — até 3 partidas `FINALIZADA`
     envolvendo qualquer time que já apareceu em algum palpite do torcedor (mandante ou
     visitante), ordenadas da mais recente pra mais antiga, sem repetir a mesma partida duas
     vezes mesmo que os dois times dela sejam "acompanhados". Link "Ver meus palpites".
4. **"Time acompanhado"** = qualquer time que já apareceu em algum palpite do torcedor logado.
   Não existe conceito de "favoritar" um time — decisão deliberada para não precisar de um
   dado novo persistido (nem local, nem no banco). Um torcedor que ainda não deu nenhum palpite
   simplesmente não vê essa seção (lista vazia).
5. **Celebração de emblemas continua funcionando exatamente igual.** Como o rastreamento de
   "já comemorado" (`useBadgeCelebration`) usa uma chave de `localStorage` compartilhada entre
   telas, se o painel for a primeira tela que o torcedor visita depois de conquistar um novo
   nível, a festa de confete acontece aqui; se ele for depois para Meus Palpites, não repete.
   Nenhuma mudança necessária no hook em si.

## Cálculo dos times acompanhados

Nova função pura `frontend/src/lib/teamsAccompanied.ts`:

```ts
export function getAccompaniedTeamIds(predictions: Prediction[], matches: Match[]): Set<string>
```

Junta `predictions` com `matches` pelo `matchId`, e devolve o conjunto de `homeTeamId`/
`awayTeamId` de cada partida que o torcedor já palpitou.

## Roteamento e navegação

- `router.tsx`: mover a rota `index` para dentro do grupo `<ProtectedRoute />`, apontando para
  `PainelPage` em vez do `Navigate` incondicional para `/login` — a checagem de sessão
  continua acontecendo (agora via `ProtectedRoute`, não mais um redirect direto).
- `LoginPage.tsx`: depois do login bem-sucedido, navegar para `/` em vez de `/partidas`.
- `NavBar.tsx`: adicionar um link "Painel" apontando para `/`, junto dos já existentes.

## Testes

- `teamsAccompanied.test.ts`: função pura, casos com predições em times diferentes, partidas
  não encontradas, e nenhuma predição ainda (conjunto vazio).
- `PainelPage.test.tsx`: mocka os quatro endpoints e confirma que cada seção renderiza os dados
  esperados, incluindo o caso "torcedor sem nenhum palpite ainda" (seção de times acompanhados
  fica vazia, sem quebrar as outras três).
- Ajustar `LoginPage.test.tsx` (navega para `/` em vez de `/partidas`) e `App.test.tsx` (visita
  anônima continua caindo em `/login`; visita autenticada agora renderiza o painel em vez de
  redirecionar para `/partidas`).

## Fora do escopo

- Gráficos (barras/linhas) — spec futura separada.
- Estatísticas extras por time (aproveitamento casa/fora, média de gols, forma recente) — spec
  futura separada.
- Qualquer conceito de "favoritar" um time manualmente.
