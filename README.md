# 📝 Gerenciador de Tarefas

Gerenciador de tarefas com quadro estilo **post-it** (arrastar e soltar), **3 metas diárias**, **objetivos** com tarefas vinculadas e **prioridades**.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · MongoDB Atlas (Mongoose) · dnd-kit · Deploy na Vercel

## ✨ Funcionalidades

| Tela | O que faz |
|---|---|
| **Quadro** (`/`) | Post-its em 3 colunas: **Pendentes**, **Em atraso** e **Concluídas**. Arraste para concluir ou reabrir. Filtros por prioridade, objetivo e busca. |
| **Metas do dia** (`/metas-diarias`) | Escolha até **3 tarefas por dia**, acompanhe o progresso, navegue entre dias e veja o histórico dos últimos 7 dias (com sequência 🔥). |
| **Objetivos** (`/objetivos`) | Cadastre objetivos (com prazo e cor) e as tarefas relacionadas; barra de progresso automática. |

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
