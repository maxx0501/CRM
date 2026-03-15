---
name: Routing Structure
description: Next.js App Router route group layout and URL mapping for the CRM web app
type: project
---

Route groups used in `apps/web/app/`:

- `(auth)/` — login, register pages (no sidebar/header)
- `(dashboard)/` — authenticated app layout with Sidebar + Header
  - `page.tsx` at group root → server redirect to `/dashboard`
  - `dashboard/page.tsx` → `/dashboard` (main metrics page)
  - `pipeline/`, `leads/` (+ `leads/[id]/`), `appointments/`, `conversations/`, `finances/`, `campaigns/`, `automations/`, `settings/`
- `page.tsx` (root, no group) → public landing page at `/`

Pages fully implemented (production-ready, 2026-03-15):
- `finances/page.tsx` — transactions table, summary cards, category breakdown, CRUD modals
- `campaigns/page.tsx` — campaign cards with UTM tags, detail drawer, toggle active/inactive
- `automations/page.tsx` — automation cards with trigger→action flow, toggle switch, creator modal
- `conversations/page.tsx` — WhatsApp-style split panel, message bubbles, auto-scroll, mobile responsive
- `dashboard/page.tsx` — stat cards, CSS bar charts (revenue + leads by stage), activity feed, upcoming appointments, quick actions. Calls /dashboard/summary with /dashboard/metrics fallback.
- `pipeline/page.tsx` — pipeline selector dropdown, optimistic DnD kanban, create pipeline modal, add lead modal, lead detail drawer. Calls /pipelines, /pipelines/:id, /leads (POST/PATCH).

New shared components (2026-03-15):
- `components/leads/lead-detail-drawer.tsx` — slide-over drawer with lead info, inline editing, score bar, WhatsApp/view full buttons
- `components/kanban/kanban-board.tsx` — KanbanLead type now includes `tags?: KanbanTag[]`, TouchSensor added for mobile
- `components/kanban/kanban-card.tsx` — shows tags, value, score with star, relative date, grip handle on hover
- `components/kanban/kanban-column.tsx` — color-coded header for won/lost stages, total value display, max-height scroll

**Why:** Landing page at `/` needed its own route outside the `(dashboard)` group to avoid conflict with the dashboard's root page.

**How to apply:** When adding new app routes, place them inside `(dashboard)/` to inherit the sidebar+header layout.
