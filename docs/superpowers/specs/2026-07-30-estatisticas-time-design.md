# VZBet — Estatísticas extras por time

## Contexto

Terceiro e último pedaço do pedido original de "dashboards detalhados" (os outros dois —
painel inicial e gráfico + ícones — já estão prontos). Este cobre estatísticas extras na
página do time, além da tabela P/J/V/E/D/GP/GC/SG que já existe na classificação.

## Decisões

1. **Três estatísticas**, todas calculadas a partir de partidas `FINALIZADA` já buscadas por
   `TeamPage` (sem mudança de backend):
   - **Aproveitamento casa vs fora**: vitórias/empates/derrotas jogando em casa, separado de
     jogando fora.
   - **Média de gols marcados/sofridos** por partida.
   - **Forma recente**: os últimos 5 resultados (V/E/D), em ordem cronológica, mais recente à
     direita.
2. **Escopo: todas as partidas do time juntas**, sem separar por campeonato — mesmo padrão já
   usado nas seções "Próximos jogos"/"Últimos resultados" existentes na página do time. Não
   precisa de seletor de campeonato novo.
3. **Visual da forma recente**: bolinhas dentro da paleta azul/branco — círculo azul cheio com
   "V" pra vitória, contorno azul (vazio) com "E" pra empate, cinza com "D" pra derrota.
   Consistente com o estilo de medalha/escudo já aprovado no resto do app.
4. **Localização**: nova seção "Estatísticas" em `TeamPage.tsx`, entre o elenco e os próximos
   jogos.

## Cálculo

Nova função pura `frontend/src/lib/teamStats.ts`:

```ts
export interface TeamRecord {
  wins: number
  draws: number
  losses: number
}

export interface TeamStats {
  homeRecord: TeamRecord
  awayRecord: TeamRecord
  avgGoalsFor: number
  avgGoalsAgainst: number
  recentForm: Array<'V' | 'E' | 'D'>
}

export function calculateTeamStats(teamId: string, matches: Match[]): TeamStats
```

Filtra as partidas `FINALIZADA` envolvendo o `teamId` (mandante ou visitante), separa por
mandante/visitante pro aproveitamento casa/fora, soma gols pró/contra pra tirar a média, e
ordena por `kickoffAt` pra pegar os últimos 5 resultados (do ponto de vista do time, não do
mandante).

## Componente visual

Novo `frontend/src/components/FormaRecente.tsx` — recebe `Array<'V' | 'E' | 'D'>`, renderiza
uma fileira de bolinhas (`<span>` circular, mesma linguagem visual do `BadgeCard`/`TeamCrest`):
azul cheio + branco pra V, contorno azul + fundo branco pra E, cinza pra D, com a letra
centralizada dentro de cada uma.

## Testes

- `teamStats.test.ts`: casos com vitórias/empates/derrotas em casa e fora, média de gols com
  arredondamento, forma recente com menos de 5 partidas disponíveis (não quebra, só mostra o
  que existe).
- `FormaRecente.test.tsx`: renderiza as bolinhas certas pra cada letra.
- `TeamPage.test.tsx` (já existente): adicionar asserção de que a seção "Estatísticas" aparece
  com os números esperados.

## Fora do escopo

- Separar as estatísticas por campeonato (seletor novo) — tudo fica agregado, como já decidido.
- Qualquer estatística que dependa de dado que a API não expõe hoje (ex: posse de bola, cartões
  — não existe infraestrutura pra registrar isso numa liga de várzea).
