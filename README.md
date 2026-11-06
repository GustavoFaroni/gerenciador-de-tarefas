# 📝 Gerenciador de Tarefas

Gerenciador de tarefas com quadro estilo **post-it** (arrastar e soltar), **3 metas diárias**, **objetivos** com tarefas vinculadas e **prioridades**.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · MongoDB Atlas (Mongoose) · dnd-kit · Deploy na Vercel

## ✨ Funcionalidades

| Tela | O que faz |
|---|---|
| **Quadro** (`/`) | Post-its em 3 colunas: **Pendentes**, **Em atraso** e **Concluídas**. Arraste para concluir ou reabrir. Filtros por prioridade, objetivo e busca. |
| **Metas do dia** (`/metas-diarias`) | Escolha até **3 tarefas por dia**, acompanhe o progresso, navegue entre dias e veja o histórico dos últimos 7 dias (com sequência 🔥). |
| **Objetivos** (`/objetivos`) | Cadastre objetivos (com prazo e cor) e as tarefas relacionadas; barra de progresso automática. |
| **Calendário** (`/calendario`) | Semana inteira em blocos de 30 min (no celular, um dia por vez). Arraste os post-its sem horário para a grade, mova blocos entre horários, clique num espaço vazio para criar tarefa ali e marque a conclusão direto no bloco. |

### Regras de pontuação (`src/lib/points.ts`)
- Cada tarefa vale os **pontos definidos nela**. Sem valor: **Alta 20 · Média 10 · Baixa 5**.
- Concluída entre **06:00 e 11:59** → vale o **dobro** (calculado no servidor, no fuso do navegador).
- Tarefas **recorrentes** (todo dia, dias úteis ou dias da semana escolhidos) pontuam uma vez por ocorrência; concluir num dia não afeta os outros.
- O saldo total e o de hoje aparecem na barra lateral e no calendário.

### Tempo livre (`/tempo-livre`)
- **60 pontos = 30 minutos de tempo livre.** Resgate em blocos de 30 min (até 8h por vez).
- O saldo é **pontos ganhos − pontos resgatados**, conferido no servidor antes de aceitar o resgate.
- "Começar agora" liga um cronômetro com o tempo restante. Um resgate pode ser desfeito nos primeiros 10 minutos.

### Regras do quadro
- **Em atraso** é automático: tarefa pendente com prazo vencido.
- Arrastar para **Concluídas** → marca como concluída.
- Arrastar de **Em atraso** para **Pendentes** → reagenda o prazo para hoje.
- Arrastar de **Concluídas** para **Pendentes** → reabre a tarefa.
- Post-its são ordenados por prioridade (Alta → Baixa) e prazo. Cor do post-it = prioridade.

## 🚀 Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha MONGODB_URI
npm run dev                  # http://localhost:3000
```

## 🍃 Configurando o MongoDB Atlas
1. Crie um cluster gratuito (M0) em https://cloud.mongodb.com
2. **Database Access** → crie um usuário e senha.
3. **Network Access** → adicione `0.0.0.0/0` (necessário para a Vercel, que usa IPs dinâmicos).
4. **Connect → Drivers** → copie a string de conexão para `MONGODB_URI`.

As coleções `tasks` e `goals` são criadas automaticamente no banco definido em `MONGODB_DB`.

## ▲ Deploy na Vercel
1. Suba o projeto para o GitHub:
   ```bash
   git init && git add . && git commit -m "feat: gerenciador de tarefas"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/gerenciador-de-tarefas.git
   git push -u origin main
   ```
2. Em https://vercel.com/new importe o repositório (framework detectado: Next.js).
3. Em **Environment Variables** adicione `MONGODB_URI`, `MONGODB_DB` e `NEXTAUTH_SECRET`.
4. Deploy. Cada `git push` na `main` gera um novo deploy automaticamente.

## 🗂️ Estrutura

```
src/
├── middleware.ts                   protege as páginas (exige login)
├── app/
│   ├── login/ · cadastro/          telas de autenticação
│   ├── api/
│   │   ├── auth/[...nextauth]      NextAuth
│   │   ├── register/route.ts       cadastro de usuário
│   │   ├── tasks/route.ts          GET (filtros) · POST
│   │   ├── tasks/[id]/route.ts     PATCH · DELETE
│   │   ├── goals/route.ts          GET (com progresso) · POST
│   │   ├── goals/[id]/route.ts     PATCH · DELETE (?withTasks=true)
│   │   └── daily/route.ts          GET histórico · POST definir/remover meta
│   ├── metas-diarias/page.tsx
│   ├── objetivos/page.tsx
│   ├── layout.tsx · page.tsx · globals.css
├── components/                     Board, PostIt, DailyStrip, TaskModal, Sidebar, Store, Toast, Providers, AuthCard
├── lib/                            mongodb (conexão cacheada), auth/authOptions, validators (zod), dates, board
├── models/                         Task.ts · Goal.ts · User.ts (Mongoose)
└── types/
```

### Modelo de dados
- **Task**: `title, description, priority (alta|media|baixa), status (pendente|concluida), dueDate, goalId, dailyDate, completedAt, userId`
- **Goal**: `title, description, deadline, color, userId`
- **User**: `name, email, passwordHash`

Datas são salvas como `AAAA-MM-DD` para evitar problemas de fuso horário. O limite de 3 metas por dia é validado na API.

## 🔐 Login e senha
Feito com **NextAuth (Auth.js) v4** + provider de credenciais (e-mail e senha com `bcrypt`), sessão JWT de 30 dias.

- `/cadastro` cria a conta (senha mínima de 8 caracteres) e já entra automaticamente; `/login` para entrar.
- `src/middleware.ts` bloqueia todas as páginas para quem não está logado.
- Todas as rotas da API verificam a sessão e só retornam/alteram dados do próprio usuário (`userId`).
- O **primeiro usuário cadastrado** herda as tarefas e objetivos criados antes do login existir.

Variáveis necessárias: `NEXTAUTH_SECRET` (local e na Vercel) e `NEXTAUTH_URL` (só local). Gere o segredo com `openssl rand -base64 32` ou em https://generate-secret.vercel.app/32.

## Outras ideias
- [ ] Subtarefas / checklist dentro do post-it
- [ ] Posição livre dos post-its (salvar x/y)
- [ ] Notificações de prazo
- [ ] Modo claro
