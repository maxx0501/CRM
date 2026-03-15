import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'

import { authRoutes } from './modules/auth/auth.routes'
import { workspaceRoutes } from './modules/workspace/workspace.routes'
import { pipelineRoutes } from './modules/pipeline/pipeline.routes'
import { leadRoutes } from './modules/lead/lead.routes'
import { appointmentRoutes } from './modules/appointment/appointment.routes'
import { conversationRoutes } from './modules/conversation/conversation.routes'
import { webhookRoutes } from './modules/webhook/webhook.routes'
import { financeRoutes } from './modules/finance/finance.routes'
import { campaignRoutes } from './modules/campaign/campaign.routes'
import { automationRoutes } from './modules/automation/automation.routes'
import { dashboardRoutes } from './modules/dashboard/dashboard.routes'
import { startCronJobs } from './jobs/index'

const app = express()

// ── Global middleware ─────────────────────────────────────────
app.use(helmet())
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  }),
)
app.use(express.json())
app.use(
  rateLimit({
    windowMs: 60_000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  }),
)

// ── Health check ─────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() })
})

// ── Public routes (no auth) ───────────────────────────────────
app.use('/auth', authRoutes)
app.use('/webhooks', webhookRoutes)

// ── Protected routes (auth enforced per router) ───────────────
app.use('/workspaces', workspaceRoutes)
app.use('/pipelines', pipelineRoutes)
app.use('/leads', leadRoutes)
app.use('/appointments', appointmentRoutes)
app.use('/conversations', conversationRoutes)
app.use('/finances', financeRoutes)
app.use('/campaigns', campaignRoutes)
app.use('/automations', automationRoutes)
app.use('/dashboard', dashboardRoutes)

// ── 404 fallback ─────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' })
})

// ── Global error handler ──────────────────────────────────────
// Must have exactly 4 parameters so Express recognises it as an error handler.
// Catches any error thrown (or passed to next()) from async route handlers.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[unhandled error]', err)

  // Avoid sending headers twice if a partial response was already sent
  if (res.headersSent) return

  const message =
    err instanceof Error ? err.message : 'Internal server error'

  res.status(500).json({ success: false, error: message })
})

// ── Start ─────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3333

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API running on http://localhost:${PORT}`)
  startCronJobs()
})
