# Design: App de Palpites para Times de Várzea

**Data:** 2026-07-28
**Status:** Aprovado para planejamento (pendente revisão final do usuário)

## Contexto e motivação

Ideia original: um app de "apostas" para times de futebol de várzea (amador/local). Apostas de quota fixa com dinheiro real no Brasil são reguladas pela Lei 14.790/2023 e exigem autorização da SPA/MF, com requisitos financeiros incompatíveis com um projeto indie (R$30M de capital social, R$30M de outorga, R$5M de reserva). Esse caminho foi descartado.

Em vez disso, o produto segue um padrão de mercado já validado (apps como WagerLab e Bet with Friends): um **pool de palpites de placar** onde o app nunca movimenta dinheiro — ele só registra palpites, calcula pontos e mantém um ranking. Qualquer prêmio real é combinado pelo grupo por fora do app. Isso elimina o problema regulatório por completo.

O diferencial em relação a apps de bolão genéricos (ex: LocalBet, que não foi possível verificar como produto ativo, mas ilustra o padrão) é o foco 100% em times de várzea locais: cadastro de times/jogadores/campeonatos amadores da região, não um bolão genérico para qualquer esporte/liga profissional.

## Escopo do MVP

**Incluído:**
- Cadastro de times, jogadores e tabela de jogos (feito pelo admin)
- Palpite de placar por partida + ranking entre torcedores
- Perfil do time com histórico e estatísticas básicas

**Explicitamente fora do MVP (backlog futuro):**
- Feed social (fotos/comentários dos jogos) — funcionalidade boa, mas grande demais para o MVP
- Múltiplos "mercados" de palpite estilo casas de aposta profissionais (artilheiro da rodada, cartões, escanteios, etc.), com tempero de cultura de várzea — adiado porque não há fonte de dados confiável para estatísticas além do placar final em jogos amadores
- Cadastro aberto/crowdsourced de times (capitão ou comunidade cadastrando) — MVP é curado pelo admin
- Qualquer fluxo de dinheiro real, pagamento, KYC — fora de escopo enquanto o modelo for "sem dinheiro no app"

**Escopo geográfico:** hiperlocal — cidade/região do usuário, curado manualmente, não aberto para o Brasil todo desde o dia 1.

## Regras de negócio

**Papéis:** `ADMIN` (cadastra times, jogadores, campeonatos, partidas e lança resultados — conta criada manualmente, sem cadastro público de admin) e `TORCEDOR` (cadastro público simples, dá palpites).

**Pontuação de palpite:**
- Placar exato: 3 pontos
- Resultado correto (vitória/empate/derrota) mas placar errado: 1 ponto
- Resultado errado: 0 pontos
- Partida cancelada: nenhum palpite daquela partida pontua

**Prazo de palpite:** pode ser enviado ou editado até o horário de início da partida; depois disso a API rejeita (validação no backend, não só no frontend).

**Ranking:** não é uma entidade própria — é a soma de `pontos_ganhos` das `Predictions` de cada usuário, agregável por campeonato ou geral.

## Arquitetura

```
[React PWA] <--HTTP/REST (JSON)--> [NestJS API] <--Prisma--> [PostgreSQL]
                                                                   ^
                                                 Render Web Service + Render PostgreSQL
```

Monólito com dois projetos separados (frontend/backend). Sem fila de mensagens, sem cache, sem microsserviços — volume de dados de um MVP hiperlocal não justifica essa complexidade.

**Camadas do backend (Clean Architecture, mesma disciplina do projeto Pokémon Trainer Companion):**
- `domain/` — entidades e interfaces de repositório, sem dependência de framework
- `use-cases/` — regras de negócio puras (`CreateTeamUseCase`, `RegisterMatchResultUseCase`, `SubmitPredictionUseCase`, `CalculateRankingUseCase`)
- `data/` — implementação dos repositórios com Prisma
- `presentation/` — controllers NestJS + DTOs

**Alternativas consideradas e descartadas:**
- Full-stack Next.js (API routes como backend): menos peças móveis e SSR de graça, mas mistura camadas frontend/backend, contra a disciplina de Clean Architecture que o usuário está treinando deliberadamente.
- Backend-as-a-Service (Supabase/Firebase): mais rápido de prototipar, mas prende a um vendor e não constrói a habilidade de desenhar o próprio backend, que é um objetivo explícito de aprendizado do usuário.

## Modelo de dados (entidades principais)

```
User         (id, nome, email, senha_hash, role: ADMIN | TORCEDOR)
Team         (id, nome, bairro/regiao, ano_fundacao?, logo_url?, descricao?)
Player       (id, nome, teamId, posicao, numero, foto_url?)
Championship (id, nome, temporada, formato: PONTOS_CORRIDOS | MATA_MATA, data_inicio, data_fim)
Match        (id, championshipId, timeCasaId, timeForaId, data_hora, rodada, placar_casa, placar_fora, status: AGENDADA | FINALIZADA | CANCELADA)
Prediction   (id, userId, matchId, palpite_casa, palpite_fora, pontos_ganhos, criado_em)
```

Relações: `Team` 1—N `Player`; `Championship` 1—N `Match`; `Match` N—1 `Team` (casa e fora); `User` 1—N `Prediction`; `Match` 1—N `Prediction`.

## Fluxo principal

1. Admin cadastra campeonato, times, jogadores e partidas da rodada (status `AGENDADA`).
2. Torcedor vê partidas futuras e envia palpite (placar casa x fora); pode editar até o início da partida.
3. Após a partida, admin lança o placar real e marca `FINALIZADA`.
4. `CalculateRankingUseCase` compara cada palpite da partida com o resultado real e atribui pontos.
5. Ranking é a soma de pontos por usuário, geral ou por campeonato.

## Erros e testes

Erros de validação (DTO inválido, palpite fora do prazo, permissão insuficiente) retornam 400/403 padrão do NestJS com mensagem clara. Testes unitários cobrem os `use-cases`, especialmente a regra de pontuação (casos exato/parcial/errado/cancelado); testes de integração cobrem os endpoints principais (criar palpite, lançar resultado, consultar ranking). Sem necessidade de E2E pesado no MVP.

## Stack técnica

- Backend: NestJS + Prisma + PostgreSQL (TypeScript)
- Frontend: React + Vite, empacotado como PWA
- Hospedagem: Render (Web Service + PostgreSQL gerenciado)
- Autenticação: JWT, dois papéis (ADMIN, TORCEDOR)

## Preferências de colaboração aplicáveis a este projeto

- Explicar cada tecnologia/ferramenta no momento em que for introduzida durante a implementação, não tudo de uma vez antes de começar (evita "limbo de tutorial").
- Documentação (README, casos de uso, diagrama ER, arquitetura, notas de estudo) atualizada a cada implementação e push — não como tarefa à parte.
- Código, comentários e mensagens de commit em inglês; conversa em português.
- Manter a stack e as dependências enxutas — YAGNI, sem complexidade adicional não justificada pelo volume/escopo do MVP.

## Próximos passos

Após aprovação deste documento pelo usuário: criar um repositório dedicado para o projeto fora do Google Drive (ex: `C:\dev\...`), seguindo a mesma lição aprendida no projeto Pokémon Trainer Companion (sync do Drive corrompe lockfiles/builds). Esta spec permanece em `docs/superpowers/specs/` neste workspace; o código vive no novo repositório. Em seguida, invocar a skill `writing-plans` para gerar o plano de implementação detalhado.
