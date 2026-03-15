---
name: Dark Mode & Theme Setup
description: How dark mode is configured and toggled in the CRM web app
type: project
---

Dark mode is fully configured:

- Tailwind `darkMode: 'class'` in `tailwind.config.ts`
- CSS variables for light/dark in `app/globals.css` (`:root` and `.dark` selectors)
- `next-themes` package installed; `ThemeProvider` wraps the app in `components/providers.tsx` with `attribute="class" defaultTheme="system" enableSystem`
- `<html>` tag in `app/layout.tsx` has `suppressHydrationWarning` (required by next-themes)
- `ThemeToggle` component at `components/layout/theme-toggle.tsx` — uses `useTheme()`, renders Sun/Moon icon, handles mounted state to avoid hydration mismatch
- Toggle is placed in the `Header` component (dashboard) and inline in the `LandingPage` navbar

**How to apply:** To add theme toggle elsewhere, import `ThemeToggle` from `@/components/layout/theme-toggle`. Always guard `useTheme()` reads with a `mounted` state check.
