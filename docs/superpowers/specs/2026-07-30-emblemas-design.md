# VZBet — Emblemas de conquista

## Contexto

O painel estilo Sofascore (spec anterior) entregou um "resuminho de desempenho"
puramente numérico (pontos totais, % de acerto, maior sequência) na tela de Meus
Palpites, deliberadamente deixando de fora um sistema de emblemas/conquistas de
verdade. O usuário pediu essa segunda leva agora: emblemas visuais, com nome, ícone
e uma animação de desbloqueio "cheia de efeito, tipo game de verdade" — consistente
com o gosto do usuário por design que prende a atenção do torcedor ("igual vagalume
na luz").

Esta spec cobre só os emblemas — brasão/escudo dos times é um assunto separado, já
combinado anteriormente (SVG simples com iniciais, já que não há como recriar os
escudos reais das ligas) e ainda não implementado; não faz parte deste documento.

## Decisões

1. **Sem persistência no banco.** Cada emblema é calculado a cada visita, a partir
   de dados que a API já expõe (`GET /predictions/me`, `GET /ranking`) — nenhuma
   tabela nova, nenhum endpoint novo, nenhuma migration. Trade-off aceito: não existe
   um "conquistado em tal data" histórico — o emblema reflete o estado atual do
   torcedor, e pode teoricamente "desaparecer" se, por exemplo, ele cair do top 3 do
   ranking depois de tê-lo alcançado (comportamento aceito conscientemente, não é bug).
2. **Quatro categorias, cada uma com 2-3 níveis** (bronze/prata/ouro conforme a
   categoria) — mostra sempre só o nível mais alto já alcançado por categoria, com uma
   barra de progresso simples até o próximo nível, pra não virar bagunça visual:

   | Categoria | Bronze | Prata | Ouro |
   |---|---|---|---|
   | Sequência de acertos | 3 seguidos | 5 seguidos | — |
   | Ranking geral | Top 3 | — | Líder (1º lugar) |
   | Participação | 1º palpite | 10 palpites | 25 palpites |
   | Ousadia na múltipla | 1 múltipla certa | 3 múltiplas certas | — |

3. **Exibição:** nova seção no topo de `MeusPalpitesPage`, acima do resuminho
   numérico que já existe — não é uma tela separada.
4. **Animação de desbloqueio "tipo game":** ícone SVG em círculo, cinza/apagado
   quando não conquistado, colorido (azul/branco, dourado no nível ouro) quando
   conquistado. Ao detectar um emblema **recém-desbloqueado** — isto é, um nível que
   passou a ser verdadeiro e ainda não foi marcado como "já comemorado" no
   `localStorage` do navegador — o ícone pulsa/brilha e uma chuva de confete
   (implementada em CSS puro, sem biblioteca nova) cai sobre a seção por ~2 segundos.
   Depois disso, o emblema é marcado como comemorado nesse navegador e a animação não
   se repete.
5. **Sem áudio.** Som de desbloqueio exigiria uma interação prévia do usuário na
   página pra não ser bloqueado pela política de autoplay dos navegadores — decisão
   consciente de deixar isso fora desta leva.

## Cálculo dos emblemas

Nova função pura `frontend/src/lib/badges.ts`:

```ts
export type BadgeCategory = 'sequencia' | 'ranking' | 'participacao' | 'multipla'
export type BadgeTier = 'bronze' | 'prata' | 'ouro' | null // null = nenhum nível ainda

export interface BadgeStatus {
  category: BadgeCategory
  tier: BadgeTier
  progressToNext: { current: number; target: number } | null // null se já no nível máximo
}

export function calculateBadges(
  predictions: Prediction[],
  rankingPosition: number | null, // posição do torcedor no ranking geral, ou null se ele ainda não pontuou
): BadgeStatus[]
```

- **Sequência**: reaproveita a mesma lógica de sequência de acertos já usada em
  `calculatePerformanceSummary` (`frontend/src/lib/performance.ts`).
- **Ranking**: usa `rankingPosition` (buscado via novo `GET /ranking` na
  `MeusPalpitesPage`, localizando a entrada cujo `userId` bate com o usuário logado
  — id disponível via `useAuth()`).
- **Participação**: conta total de `predictions` (independente de já ter sido
  pontuada ou não).
- **Múltipla**: conta predições com `pointsEarned === 7` (múltipla batida em cheio —
  o único jeito de valer 7 pontos, então não precisa checar mais nada).

## Componente visual

Novo `frontend/src/components/BadgeCard.tsx` — recebe um `BadgeStatus`, renderiza o
ícone (mapa fixo categoria→SVG embutido no componente, sem carregar imagem externa),
o nome do nível, e a barra de progresso quando aplicável. Um hook
`frontend/src/lib/useBadgeCelebration.ts` decide, por categoria+tier, se a animação
de desbloqueio deve rodar nesta visita (consultando/gravando
`localStorage['vzbet-badges-seen']`, um array de chaves `${category}:${tier}` já
comemoradas).

## Testes

- `badges.test.ts`: casos por categoria (nenhum nível, bronze, prata, ouro,
  progresso até o próximo nível) — função pura, sem precisar de componente.
- `useBadgeCelebration` testado isoladamente (localStorage limpo → celebra; já
  presente no localStorage → não celebra de novo).
- `BadgeCard.test.tsx`: renderiza nível conquistado vs não conquistado, dispara (ou
  não) a classe/estado de celebração conforme o hook.

## Fora do escopo

- Persistência no banco (histórico de "conquistado em tal data").
- Áudio no desbloqueio.
- Brasão/escudo dos times (assunto separado, já combinado, ainda pendente).
- Emblemas baseados em eventos que exigiriam nova infraestrutura de rastreamento
  (ex: "compareceu a X rodadas seguidas", "foi o primeiro a palpitar numa partida").
