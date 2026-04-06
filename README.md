# CRM SaaS

Sistema de CRM (Customer Relationship Management) multi-tenant para empreendedores e pequenas empresas. Gerencie leads, vendas, agendamentos, campanhas e finanças em um lugar so.

## Funcionalidades

- **Pipeline (Kanban)** — Funil de vendas visual com drag-and-drop. Crie colunas personalizadas e arraste leads entre etapas.
- **Leads** — Cadastro e gerenciamento de potenciais clientes com busca, filtros e detalhes.
- **Dashboard** — Painel com metricas de vendas, receita, leads por estagio e atividades recentes.
- **Financeiro** — Controle de receitas e despesas com resumos e graficos por categoria.
- **Agendamentos** — Agenda de reunioes e compromissos vinculados aos leads.
- **Campanhas** — Rastreamento de acoes de marketing (UTM, orcamento, ROI).
- **Automacoes** — Regras de follow-up automatico (ex: recontatar lead apos X dias).
- **Conversas** — Inbox centralizado para mensagens (integracao WhatsApp).
- **Multi-tenant** — Cada workspace e isolado. Usuarios podem pertencer a multiplos workspaces.
- **Tema claro/escuro** — Interface responsiva com suporte a dark mode.

## Tech Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS, shadcn/ui |
| Backend | Express.js, TypeScript (ESM) |
| Banco de dados | PostgreSQL, Prisma ORM |
| Cache | Redis |
| Auth | NextAuth.js v5 (credentials) + JWT |
| State | TanStack Query |
| Drag-and-drop | @dnd-kit |
| Validacao | Zod (compartilhado entre FE e BE) |
| Monorepo | Turborepo + pnpm workspaces |

## Estrutura do Projeto

```
crm/
├── apps/
│   ├── web/          # Frontend Next.js (porta 3000)
│   └── api/          # Backend Express (porta 3333)
├── packages/
│   ├── database/     # Prisma schema, migrations, seed
│   ├── shared/       # Validators Zod, types, constantes
│   └── tsconfig/     # Configs TypeScript compartilhadas
├── turbo.json
└── package.json
```

## Pre-requisitos

- Node.js >= 20
- pnpm >= 10
- Docker (para PostgreSQL e Redis)

## Setup Local

```bash
# 1. Instalar dependencias
pnpm install

# 2. Subir banco de dados e Redis
docker compose up -d

# 3. Configurar variaveis de ambiente
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 4. Rodar migrations e gerar Prisma Client
pnpm db:migrate
pnpm db:generate

# 5. (Opcional) Popular com dados de exemplo
pnpm db:seed

# 6. Iniciar em modo desenvolvimento
pnpm dev
```

O frontend estara em http://localhost:3000 e a API em http://localhost:3333.

## Comandos

| Comando | Descricao |
|---|---|
| `pnpm dev` | Inicia todos os apps em modo dev |
| `pnpm build` | Build de producao |
| `pnpm lint` | Linting em todos os packages |
| `pnpm type-check` | Verificacao de tipos |
| `pnpm db:generate` | Gerar Prisma Client |
| `pnpm db:migrate` | Rodar migrations |
| `pnpm db:seed` | Popular banco com dados de exemplo |
| `pnpm db:studio` | Abrir Prisma Studio |

## Deploy

- **Frontend (Vercel)** — Root Directory: `apps/web`
- **Backend (Railway)** — Build: `pnpm build`, Start: `pnpm --filter @crm/api start`
- **Banco de dados** — PostgreSQL no Railway ou qualquer provedor

### Variaveis de ambiente

**Frontend (Vercel):**
- `NEXT_PUBLIC_API_URL` — URL da API (ex: `https://sua-api.up.railway.app`)
- `AUTH_SECRET` — Secret do NextAuth
- `AUTH_TRUST_HOST` — `true`

**Backend (Railway):**
- `DATABASE_URL` — Connection string do PostgreSQL
- `JWT_SECRET` — Secret para tokens JWT
- `FRONTEND_URL` — URL do frontend (ex: `https://seu-app.vercel.app`)
- `NODE_ENV` — `production`
- `PORT` — `8080`

## Licenca

Projeto privado.
