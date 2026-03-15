---
name: CRM API Migration Fastify to Express
description: Context on the Fastify→Express migration and the post-migration bugs fixed
type: project
---

The CRM API was migrated from Fastify to Express 5. After migration, several frontend issues were found and fixed.

**Why:** Migration introduced subtle incompatibilities between the old Fastify response format assumptions and Express 5 behavior.

**How to apply:** When touching route handlers, always verify: (1) error handler exists in server.ts, (2) async routes are covered by Express 5 automatic promise rejection, (3) response field names match frontend expectations.

## Bugs found and fixed (2026-03-15)

### 1 — Missing global error handler in server.ts
Express 5 auto-catches async errors but still needs a 4-parameter error handler to send a JSON response. Without it, unhandled errors returned an empty response, causing silent mutation failures on the frontend.
Fix: added `app.use((err, _req, res, _next) => { ... })` at the bottom of server.ts.

### 2 — Missing leads listing page
`apps/web/app/(dashboard)/leads/` only had `[id]/page.tsx`. The sidebar linked to `/leads` but no `page.tsx` existed at that level, causing a 404.
Fix: created `apps/web/app/(dashboard)/leads/page.tsx` with search + create modal.

### 3 — Dashboard infinite login loop
`(dashboard)/layout.tsx` was a plain Server Component with no auth guard. Unauthenticated users could reach the dashboard, API calls returned 401, but there was no redirect — causing NextAuth to loop.
Fix: converted layout to `'use client'`, added `useSession` with `useEffect` redirect on `status === 'unauthenticated'` and a loading spinner during session resolution.

### 4 — Finance summary field name mismatch
Frontend `/finances/page.tsx` expected `{ totalIncome, totalExpense, balance }` but API `/transactions/summary` returned `{ income, expense, balance }`.
Fix: finance.routes.ts now returns both `income`/`expense` AND `totalIncome`/`totalExpense` aliases.

### 5 — Mutations failing silently on create (appointments, transactions, campaigns, automations)
None of the create mutations had `onError` handlers. If the API returned an error (even a well-formed 400/500 JSON), the modal never showed feedback and never closed. Users thought "create loads nothing".
Fix: added `onError: (err) => setModalError(err.message)` and error display divs inside each modal.
