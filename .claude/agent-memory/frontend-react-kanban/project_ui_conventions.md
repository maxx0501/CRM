---
name: project_ui_conventions
description: UI component conventions, design patterns, and Tailwind class strategies used across the CRM pages
type: project
---

Shadcn/ui is installed but pages use raw Tailwind utility classes directly (no shadcn component imports in most pages). Use shadcn when needed but raw Tailwind is fine and preferred for consistency.

Key utility patterns:
- `cn()` from `@/lib/utils` (clsx + tailwind-merge) for conditional classes
- `formatCurrency()` — BRL formatting via Intl.NumberFormat pt-BR
- `formatDate()` — dd/mm/yyyy via Intl.DateTimeFormat pt-BR
- `formatDateTime()` — dd/mm/yyyy HH:mm

Common UI patterns established in finance/campaigns/automations/conversations pages:
- **Cards**: `rounded-xl border bg-card p-5 transition-all hover:shadow-md`
- **Modals**: `fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm`, inner div `rounded-2xl border bg-card shadow-2xl`
- **Inputs**: `flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **Primary button**: `rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors`
- **Ghost button**: `rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors`
- **Skeleton**: local component `<div className="animate-pulse rounded-md bg-muted/60" />`
- **Badges**: `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium` + color classes
- **Status colors**: emerald=active/income, red=error/expense, amber=warning/pending, violet=stats

Empty states: Always include icon in muted rounded-2xl container, heading, description, and CTA button.

**How to apply:** Copy these patterns directly. Never use `style={}` props on local Skeleton components (type error). Use inline `style` only on native HTML elements.
