# VZBet — Painel estilo Sofascore

## Contexto

O usuário quer que o app tenha mais camadas pra explorar/estudar, no estilo do
Sofascore: classificação de campeonato, página de time com elenco, e histórico pessoal
de palpites. Diferente da spec da aposta múltipla, este é um conjunto **puramente
aditivo** — nenhuma tabela ou regra de negócio existente muda, só telas novas em cima de
dados que já existem (times, jogadores, partidas, campeonatos, predictions).

Descoberta importante ao levantar o que já existe: **nenhuma mudança de backend é
necessária**. `GET /matches?championshipId=&status=` já devolve tudo que precisa pra
calcular a classificação, `GET /teams/:id` + `GET /teams/:teamId/players` já dão a
página do time, e `GET /predictions/me` já dá o histórico — tudo é computado no
frontend a partir de dados já expostos pela API.

## Decisões

1. **Classificação do campeonato**: P/J/V/E/D/GP/GC/SG calculados no frontend a partir
   de `GET /matches?championshipId=X&status=FINALIZADA`, no mesmo formato das tabelas
   reais que o usuário mostrou (Copa Metal Ferraz). Pontos de classificação (3
   vitória/1 empate/0 derrota) são um conceito **totalmente separado** dos pontos de
   palpite do torcedor — nomeado com cuidado no código pra não confundir os dois.
2. Como hoje não existe nenhuma tela pra escolher/ver um campeonato específico (o
   torcedor só vê uma lista única de partidas sem separar por campeonato), esta spec
   inclui uma tela nova **"Campeonatos"** (lista) que leva pra dentro da classificação
   de cada um.
3. **Página do time**: escudo (ou iniciais, já que `logoUrl` está vazio nos times
   cadastrados), elenco (`GET /teams/:teamId/players`), e as partidas do time
   (`GET /matches?teamId=X`) divididas em "Próximos jogos" (status AGENDADA) e
   "Últimos resultados" (status FINALIZADA).
4. **Confronto direto**: dentro da página do time, ao clicar num adversário específico
   nos "últimos resultados", filtra (no frontend, sem chamada nova) as partidas entre
   aqueles dois times específicos.
5. **Meus palpites**: nova tela com todo o histórico de `GET /predictions/me`,
   enriquecido no frontend com dados de `GET /matches` e `GET /teams` (mesmo padrão de
   join client-side já usado em `MatchesPage`) — data, times, o que foi apostado
   (resultado e/ou placar), resultado real, pontos ganhos.
6. **Resuminho de desempenho** (versão leve de "emblema", sem sistema de conquistas
   novo): no topo da tela de Meus Palpites, três números calculados no frontend a partir
   do próprio histórico — total de pontos, % de acerto, maior sequência de acertos
   seguidos. Nada disso é persistido — é derivado on-the-fly do que a API já devolve.

## Telas novas

### `/campeonatos`
Lista simples: nome, temporada, formato. Cada item leva para `/campeonatos/:id`.

### `/campeonatos/:id`
Busca `GET /championships` (pra pegar nome/dados do campeonato pelo id) e
`GET /matches?championshipId=:id&status=FINALIZADA` + `GET /teams` (pra nomes). Calcula
e renderiza a tabela de classificação ordenada por pontos de classificação, com
desempate por saldo de gols e depois gols pró (convenção padrão de futebol).

### `/times/:id`
Busca `GET /teams/:id`, `GET /teams/:id/players`, `GET /matches?teamId=:id` +
`GET /teams` (pra nomes dos adversários). Seções: cabeçalho (nome/região), elenco,
próximos jogos, últimos resultados (cada resultado clicável pra filtrar confronto
direto contra aquele adversário específico).

### `/meus-palpites`
Busca `GET /predictions/me` + `GET /matches` + `GET /teams`, junta no frontend. Lista
cronológica com resuminho de desempenho no topo.

### Navegação
Nomes de time em qualquer tela (card de partida, classificação, ranking) viram links
pra `/times/:id`. NavBar ganha mais dois links: Campeonatos, Meus Palpites.

## Testes

Cada tela nova ganha teste de componente (Vitest + RTL) mockando as funções de API já
existentes, no mesmo padrão das telas atuais. A lógica de cálculo de classificação
(pontos/saldo de gols/desempate) é extraída pra uma função pura testável
isoladamente (`calculateStandings(matches, teams): StandingsEntry[]`), sem depender de
render de componente pra cobrir os casos de desempate.

## Fora do escopo

- Sistema de emblemas/conquistas persistido (com definição de regras, ícones, etc.) —
  o "resuminho de desempenho" desta spec é deliberadamente simples e não-persistido.
- Escalação/lances ao vivo — não existe infraestrutura de captura desses dados em
  tempo real pra uma liga de várzea administrada por uma pessoa só.
- Edição de escudo de time (`logoUrl`) pela UI — fica pro admin (fora do escopo do
  torcedor) numa fase futura.
