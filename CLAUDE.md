# CRM SaaS - Multi-tenant CRM for Solopreneurs

## Project Structure
Turborepo monorepo with pnpm workspaces.

- `apps/web` — Next.js 15 frontend (App Router, Tailwind, shadcn/ui)
- `apps/api` — Fastify 5 backend (TypeScript, ESM)
- `packages/database` — Prisma schema, migrations, seed
- `packages/shared` — Zod validators, types, constants
- `packages/tsconfig` — Shared TypeScript configs

## Commands
- `pnpm dev` — Start all apps (web: 3000, api: 3333)
- `pnpm build` — Build all
- `pnpm lint` — Lint all
- `pnpm type-check` — Type check all
- `pnpm db:generate` — Generate Prisma client
- `pnpm db:migrate` — Run migrations
- `pnpm db:seed` — Seed demo data
- `pnpm db:studio` — Open Prisma Studio
- `docker compose up -d` — Start PostgreSQL + Redis

## Architecture
- Multi-tenant via `x-workspace-id` header + membership verification
- Auth: NextAuth.js (credentials) → Fastify JWT
- All API routes return `{ success: boolean, data?: T, error?: string }`
- Kanban: @dnd-kit for drag-and-drop
- State: TanStack Query for server state

## Database
- PostgreSQL via Prisma ORM
- All tenant-scoped tables have `workspaceId` column
- Tenant isolation enforced in `apps/api/src/plugins/tenant.ts`

## Key Conventions
- API imports use `.js` extensions (ESM)
- Validators in `packages/shared/src/validators.ts` — use on both FE and BE
- Portuguese (pt-BR) for user-facing strings
