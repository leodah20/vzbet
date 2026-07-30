# VZBet — Gráfico de evolução + ícones de emblema profissionais

## Contexto

Segundo de três pedaços do pedido original de "dashboards detalhados" (o primeiro, o painel
inicial, já está pronto). Este cobre o gráfico de evolução de pontos do torcedor. Durante a
conversa, o usuário pediu para incluir junto uma troca dos ícones dos emblemas (hoje desenhados
à mão em SVG) por uma biblioteca de ícones profissional — as duas mudanças envolvem adicionar
uma biblioteca nova ao projeto e mexer em polimento visual, então ficam nesta mesma spec.

O terceiro pedaço ("mais estatística por time") continua fora, para uma spec futura separada.

## Decisões

1. **Gráfico de linha da evolução de pontos**, na tela de Meus Palpites, logo acima do
   histórico já existente. Eixo X = data da partida, eixo Y = pontos acumulados (soma
   progressiva de `pointsEarned`, considerando só predições já pontuadas, ordenadas por
   `kickoffAt` da partida).
2. **Biblioteca `recharts`** para desenhar o gráfico — escolha explícita do usuário sobre o
   hand-rolled SVG que vínhamos usando até aqui (`TeamCrest`, `BadgeCard`), porque já vem com
   tooltip, animação de entrada e eixos automáticos prontos. Única exceção deliberada ao hábito
   de manter dependências enxutas.
3. **Paleta e acessibilidade do gráfico seguem a skill `dataviz`** do projeto — consultada no
   momento de implementar o componente (paleta dentro do azul/branco da marca, contraste
   adequado, sem depender só de cor pra transmitir informação).
4. **Ícones dos emblemas trocam de "desenhados à mão" para a biblioteca `lucide-react`** —
   troféu (`Trophy`), chama (`Flame`), bandeira (`Flag`) e alvo (`Target`), um pra um substituindo
   os `<svg>` manuais dentro de `BadgeCard`. O formato do medalhão (círculo com gradiente
   metálico bronze/prata/ouro, borda, sombra, fitinha) **não muda** — só o desenho do ícone
   dentro dele, que passa a ter um traço mais consistente e profissional.

## Cálculo da evolução de pontos

Nova função pura `frontend/src/lib/pointsProgression.ts`:

```ts
export interface PointsProgressionEntry {
  date: string // ISO date da partida
  cumulativePoints: number
}

export function calculatePointsProgression(predictions: Prediction[], matches: Match[]): PointsProgressionEntry[]
```

Junta `predictions` com `matches` pelo `matchId`, filtra só as já pontuadas
(`pointsEarned !== null`), ordena pela `kickoffAt` da partida, e devolve a lista com a soma
progressiva de pontos — pronta para virar o eixo Y do gráfico.

## Componente do gráfico

Novo `frontend/src/features/predictions/PointsProgressionChart.tsx`, usando
`ResponsiveContainer` + `LineChart` do `recharts`, com uma linha suave (`type="monotone"`),
preenchimento em gradiente sutil sob a curva, cor dentro da paleta azul da marca, e tooltip
mostrando data + pontos acumulados ao passar o mouse/tocar. Se o torcedor ainda não tem nenhuma
predição pontuada, mostra uma mensagem simples no lugar do gráfico ("Ainda sem palpites
pontuados") em vez de um gráfico vazio.

## Troca dos ícones dos emblemas

Em `frontend/src/components/BadgeCard.tsx`, a função `CategoryIcon` passa a importar e renderizar
os componentes do `lucide-react` em vez dos `<svg>` manuais — mesmo mapeamento categoria→ícone
(ranking→Trophy, sequencia→Flame, participacao→Flag, multipla→Target), mesmo tamanho e cor
(`className` herdada). Nenhuma outra parte do `BadgeCard` muda.

## Testes

- `pointsProgression.test.ts`: função pura — casos com predições pontuadas em ordem, predições
  ainda não pontuadas (excluídas), e nenhuma predição pontuada (lista vazia).
- `PointsProgressionChart.test.tsx`: renderiza a mensagem de "ainda sem palpites pontuados"
  quando a lista está vazia; renderiza o gráfico (via um teste que verifica a presença do
  container do Recharts) quando há dados.
- `BadgeCard.test.tsx` (já existente): continua passando sem alteração, já que os testes
  verificam texto/rótulos, não o desenho interno do ícone — só precisa confirmar que os ícones
  do Lucide renderizam sem quebrar o teste de confete/tiers já existente.

## Fora do escopo

- Estatísticas extras por time (aproveitamento casa/fora, média de gols, forma recente) — spec
  futura separada.
- Qualquer outro gráfico (gols por time, pontuação de todos os torcedores) além da evolução de
  pontos do próprio torcedor.
- Trocar o formato do medalhão em si (gradiente, fita, borda) — só o ícone interno muda.
