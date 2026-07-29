# Deploy do Backend na Nuvem (Render)

> **Este guia ainda não foi executado.** Hoje o backend do VZBet só roda localmente (NestJS +
> Prisma + PostgreSQL via Docker, na porta 5433). O frontend (React + Vite, PWA) também ainda não
> foi iniciado. Este documento descreve os passos a seguir **quando** o deploy do backend for
> feito, para que a configuração saia correta de primeira — em especial o Start Command, que já
> teve um bug real encontrado e corrigido no código antes mesmo de qualquer tentativa de deploy
> (ver destaque no passo 3).

## Pré-requisito

- Conta no GitHub com o repositório [`vzbet`](https://github.com/leodah20/vzbet) sincronizado
- Backend buildando localmente sem erros: `cd backend && npm run build`
- Testes passando localmente: `cd backend && npm test` (12 suites / 32 testes, conforme o último
  commit)
- Um valor para `JWT_SECRET` definido (qualquer string aleatória longa) — o app se recusa a subir
  sem essa variável; isso é intencional (fail-fast), não um bug a contornar
- Diferente de um app sem persistência, o VZBet **depende de PostgreSQL** para funcionar (times,
  partidas e palpites são dados reais), então criar o banco gerenciado é parte obrigatória do
  deploy, não um passo opcional

## Passo a passo

### 1. Criar conta no Render

1. Acesse https://render.com
2. Clique em **"Get Started"** → **"Sign up with GitHub"**
3. Autorize o Render a acessar o repositório `vzbet`
4. **Não precisa de cartão de crédito** — o plano free de Web Services do Render não exige

### 2. Criar o banco de dados PostgreSQL

O Web Service precisa de um Postgres já existente antes de subir (ele vai ler `DATABASE_URL` do
banco no boot).

1. No dashboard do Render, clique em **"New +"** → **"PostgreSQL"**
2. Nome sugerido: `vzbet-db` (mesmo nome já usado para o container Docker local, por consistência)
3. Plan: **Free**
4. Depois de criado, o Render mostra uma **Internal Database URL** e uma **External Database URL**
   — como o Web Service vai rodar no próprio Render, use a **Internal** em `DATABASE_URL` (passo 4)

> Em aberto: como as migrations (`npx prisma migrate deploy`) serão aplicadas nesse banco de
> produção — rodadas manualmente uma vez, ou encaixadas no Build Command — ainda não foi decidido.
> Resolver isso é parte do próprio primeiro deploy, não algo já definido hoje.

### 3. Criar o Web Service

1. No dashboard do Render, clique em **"New +"** → **"Web Service"**
2. Conecte o repositório `vzbet`
3. Configure:

| Campo | Valor |
|-------|-------|
| **Name** | `vzbet-backend` |
| **Root Directory** | `backend` |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `node dist/src/main` |
| **Plan** | **Free** ✅ |

> **Atenção ao Start Command: `node dist/src/main`, nunca `node dist/main`.**
> Isso não é estilo — é um bug real, já encontrado e corrigido no código durante a revisão final do
> backend, antes de qualquer tentativa de deploy. Como `prisma.config.ts` fica na raiz de
> `backend/` (fora de `src/`), o TypeScript amplia o `rootDir` inferido, e o entry point compilado
> acaba aninhado em `dist/src/main.js`, não em `dist/main.js`. Configurar `node dist/main` no
> Render travaria o boot do serviço (arquivo não encontrado) — documentar o valor certo aqui existe
> justamente para não reintroduzir esse mesmo erro na hora do deploy.

### 4. Adicionar variáveis de ambiente

Em **"Environment Variables"**, adicione as duas obrigatórias:

| Chave | Valor |
|-------|-------|
| `DATABASE_URL` | Internal Database URL do Postgres criado no passo 2 |
| `JWT_SECRET` | uma string aleatória longa e secreta (o app não sobe sem ela) |

> Em aberto: se o `main.ts` já escuta na porta fornecida por `process.env.PORT` (padrão exigido
> pelo Render) — vale conferir isso no código antes do deploy, já que não está confirmado aqui.

### 5. Deploy

1. Clique em **"Create Web Service"**
2. O Render vai puxar o código, instalar dependências, buildar e iniciar o backend
3. Aguarde o status ficar **"Live"** ✅

### 6. Testar a URL

Ao final do deploy, o Render gera uma URL no formato:

```
https://vzbet-backend.onrender.com
```

(o nome exato depende do que for escolhido no passo 3). Teste com uma rota pública, por exemplo:

```bash
# Substitua pela URL real gerada pelo Render
curl https://vzbet-backend.onrender.com/teams
```

### 7. Quando o frontend existir

O frontend (React + Vite, PWA) ainda não foi iniciado. Quando ele existir e também estiver
publicado, dois ajustes ficam pendentes:

- Apontar a base URL da API do frontend para a URL do backend gerada no passo 6
- Restringir o CORS do backend à origem real do frontend — hoje `app.enableCors()` está habilitado
  sem allowlist (aceita qualquer origem), o que é aceitável em desenvolvimento mas deve ser
  restringido antes de expor o backend em produção

## Limitações do plano Free

- **Sleep após inatividade** — no plano free, um Web Service do Render "dorme" depois de um período
  sem receber requisições; a primeira requisição depois disso demora bem mais para responder,
  enquanto o serviço acorda
- **Limite de transferência mensal** — o plano free tem um teto de banda mensal, suficiente para
  testes/beta mas não para tráfego alto
- **Postgres free tem limitações próprias** (armazenamento reduzido, e historicamente expiração
  automática do banco após um período sem upgrade) — como essas políticas mudam com o tempo,
  confira os termos atuais no dashboard do Render antes de criar o banco do passo 2

## Alternativas pagas (quando fizer sentido)

- **Railway** — não coloca o serviço para dormir, tem PostgreSQL incluso
- **Fly.io** — tem um free tier próprio que também não dorme

Nenhuma das duas foi testada neste projeto ainda; ambas aparecem aqui como opções conhecidas caso
as limitações do plano free do Render (acima) se tornem um problema real.
