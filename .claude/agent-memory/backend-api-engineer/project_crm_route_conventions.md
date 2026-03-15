---
name: CRM API Route Conventions
description: Route mounting prefixes, pagination params, error message language, and all confirmed routes after the 2026-03-15 full audit
type: project
---

## Route Mounting (server.ts)

All routes are mounted in `apps/api/src/server.ts`:

- `/auth` — authRoutes (public)
- `/webhooks` — webhookRoutes (public, key-authenticated)
- `/workspaces` — workspaceRoutes (JWT only, no workspace header)
- `/pipelines` — pipelineRoutes (requireWorkspace)
- `/leads` — leadRoutes (requireWorkspace)
- `/appointments` — appointmentRoutes (requireWorkspace)
- `/conversations` — conversationRoutes (requireWorkspace)
- `/finances` — financeRoutes (requireWorkspace) — NOTE: was incorrectly mounted at `/transactions` before the 2026-03-15 audit
- `/campaigns` — campaignRoutes (requireWorkspace)
- `/automations` — automationRoutes (requireWorkspace)
- `/dashboard` — dashboardRoutes (requireWorkspace)

**Why:** Finance routes were being mounted at `/transactions` which did not match the spec. Fixed to `/finances`.

## Pagination Query Params

After the audit, list endpoints use `page` + `limit` (not `perPage`):
- `?page=1&limit=20` (appointments, finances, conversations, leads, dashboard/recent-activity)
- `?page=1&limit=50` (leads default, conversations/messages)

**How to apply:** When adding new list endpoints, use `page` and `limit` query params with defaults.

## Error Messages

All user-facing error messages are in pt-BR (Portuguese Brazilian).
Code comments and variable names remain in English.

## Try/Catch Pattern

Every async route handler must wrap its body in `try/catch`:
```ts
router.get('/', async (req, res) => {
  try {
    // ... logic
  } catch (err) {
    console.error('[GET /route]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})
```

**Why:** Express 5 propagates async errors automatically, but explicit try/catch provides better log context (which route failed) and Portuguese error messages consistent with the rest of the API.

## Confirmed Available Routes (2026-03-15 audit)

### Auth
- POST /auth/register
- POST /auth/login
- GET  /auth/me (ADDED in audit)

### Workspaces
- GET    /workspaces
- POST   /workspaces
- GET    /workspaces/current
- PATCH  /workspaces/current
- GET    /workspaces/:id
- PATCH  /workspaces/:id
- DELETE /workspaces/:id

### Pipelines
- GET    /pipelines
- POST   /pipelines
- GET    /pipelines/default
- GET    /pipelines/:id
- PATCH  /pipelines/:id
- DELETE /pipelines/:id (blocked if isDefault=true)
- POST   /pipelines/:id/stages
- PATCH  /pipelines/:id/stages/:stageId
- DELETE /pipelines/:id/stages/:stageId (blocked if has leads)
- PUT    /pipelines/:id/stages/reorder (ADDED in audit — spec says PUT)
- PATCH  /pipelines/stages/reorder (kept for backward compat)

### Leads
- GET    /leads (filters: stageId, pipelineId, search, status, sort, page, limit)
- POST   /leads
- GET    /leads/:id
- PATCH  /leads/:id
- DELETE /leads/:id
- PATCH  /leads/:id/move
- GET    /leads/:id/timeline
- GET    /leads/:id/notes
- POST   /leads/:id/notes
- DELETE /leads/:id/notes/:noteId
- POST   /leads/:id/tags
- DELETE /leads/:id/tags/:tagId

### Appointments
- GET    /appointments (filters: leadId, status, from, to, upcoming, page, limit)
- POST   /appointments
- GET    /appointments/upcoming
- GET    /appointments/:id
- PATCH  /appointments/:id
- DELETE /appointments/:id

### Finances
- GET    /finances/summary
- GET    /finances (filters: type, isPaid, leadId, from, to, page, limit)
- POST   /finances
- GET    /finances/:id
- PATCH  /finances/:id
- DELETE /finances/:id

### Campaigns
- GET    /campaigns
- POST   /campaigns
- GET    /campaigns/:id/stats
- GET    /campaigns/:id
- PATCH  /campaigns/:id
- DELETE /campaigns/:id

### Automations
- GET    /automations
- POST   /automations
- GET    /automations/:id
- PATCH  /automations/:id
- DELETE /automations/:id
- POST   /automations/:id/steps
- PATCH  /automations/:id/steps/:stepId
- DELETE /automations/:id/steps/:stepId
- POST   /automations/:id/enroll/:leadId
- DELETE /automations/:id/enroll/:leadId

### Conversations
- GET    /conversations (filters: leadId, search, page, limit)
- GET    /conversations/:id
- GET    /conversations/:id/messages
- POST   /conversations/:id/messages

### Dashboard
- GET    /dashboard/summary (ADDED — KPIs incl. appointmentsToday)
- GET    /dashboard/recent-activity (ADDED — unified activity feed)
- GET    /dashboard/metrics (alias for /summary, backward compat)
- GET    /dashboard/funnel

### Webhooks
- POST   /webhooks/whatsapp/:workspaceId
