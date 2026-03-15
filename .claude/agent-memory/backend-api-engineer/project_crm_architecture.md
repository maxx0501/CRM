---
name: CRM project architecture
description: Core stack, module pattern, auth middleware, response format, CommonJS import rules after Express migration
type: project
---

Monorepo at `C:/Users/mateu/OneDrive/Área de Trabalho/CRM` managed with pnpm workspaces + Turborepo.

**MIGRATED 2026-03-15: Fastify 5/ESM → Express 5/CommonJS** (Node.js 24 ESM module resolution errors with @crm/shared were the trigger).

Key packages:
- `@crm/database` — PrismaClient singleton, re-exports all Prisma types (`packages/database/src/index.ts`, `"main": "./src/index.ts"`)
- `@crm/shared` — Zod validators, constants, types (`"main": "./src/index.ts"`, no build step required)
- `@crm/api` — Express 5 API (`apps/api/`, CommonJS, no `"type": "module"`)

API stack: Express 5, jsonwebtoken, cors, helmet, express-rate-limit, Prisma (PostgreSQL), Zod, bcryptjs, node-cron.
Dev server: `ts-node-dev --respawn src/server.ts` (port 3333).

Auth middleware (Express pattern, not Fastify decorators):
- `authenticate` (middleware fn in `plugins/auth.ts`) → validates Bearer JWT via `jsonwebtoken`, sets `req.userId`
- `requireWorkspace` (middleware fn in `plugins/tenant.ts`) → calls authenticate internally, reads `x-workspace-id` header, verifies WorkspaceMember in DB, sets `req.workspaceId`
- Express type augmentation declared in `plugins/auth.ts` (global namespace `Express.Request`)

Module pattern:
```
src/modules/<domain>/<domain>.routes.ts  — const router = Router(); export { router as xRoutes }
src/utils/prisma.ts                      — re-exports prisma from @crm/database
src/utils/whatsapp.ts                    — sendWhatsAppMessage() using workspace.whatsappApiUrl/Key
src/jobs/index.ts                        — startCronJobs() with node-cron
src/jobs/reminder.job.ts                 — appointment reminder (daily 20:00)
src/jobs/follow-up.job.ts               — automation follow-up (every 5 min)
```

Middleware attachment per router:
- `/auth`, `/webhooks` — public, no middleware
- `/workspaces` — `router.use(authenticate)` only (no workspace header needed)
- All others — `router.use(requireWorkspace)`

Response format: `{ success: true/false, data?: T, error?: string, meta?: { total, page, perPage, totalPages } }`

tsconfig: `"module": "CommonJS"`, `"moduleResolution": "node"` set in both `packages/tsconfig/node.json` and overridden in `apps/api/tsconfig.json`.
turbo.json: `dev` task has NO `"dependsOn": ["^build"]` (packages expose source directly).

**No `.js` extensions on imports** — CommonJS resolves without them.

**Why:** ESM + Node.js 24 caused module resolution errors with workspace packages.
**How to apply:** Never add `.js` to relative imports. Never use `import.meta`. Always use CommonJS-compatible patterns.
