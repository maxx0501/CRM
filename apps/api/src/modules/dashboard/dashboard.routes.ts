import { Router } from 'express'
import { prisma } from '@crm/database'
import { requireWorkspace } from '../../plugins/tenant'

const router: Router = Router()

/**
 * Dashboard routes — all require requireWorkspace.
 *
 * GET /dashboard/summary         → aggregate KPIs for the current month
 * GET /dashboard/recent-activity → recent leads, appointments, transactions as activity feed
 * GET /dashboard/metrics         → alias for /summary (backward compat)
 * GET /dashboard/funnel          → lead counts and values per stage (default pipeline)
 */
router.use(requireWorkspace)

// ─── GET /summary ────────────────────────────────────────────
router.get('/summary', async (req, res) => {
  try {
    const { workspaceId } = req

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfToday = new Date(startOfToday)
    endOfToday.setDate(endOfToday.getDate() + 1)

    const [
      totalLeads,
      newLeadsThisMonth,
      wonLeads,
      revenueResult,
      appointmentsToday,
      upcomingAppointments,
      unreadMessages,
    ] = await Promise.all([
      prisma.lead.count({ where: { workspaceId } }),
      prisma.lead.count({
        where: { workspaceId, createdAt: { gte: startOfMonth } },
      }),
      prisma.lead.count({
        where: { workspaceId, wonAt: { not: null } },
      }),
      prisma.transaction.aggregate({
        where: {
          workspaceId,
          type: 'INCOME',
          isPaid: true,
          paidAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
      prisma.appointment.count({
        where: {
          workspaceId,
          startsAt: { gte: startOfToday, lt: endOfToday },
          status: { in: ['SCHEDULED', 'CONFIRMED'] },
        },
      }),
      prisma.appointment.count({
        where: {
          workspaceId,
          startsAt: { gte: now },
          status: { in: ['SCHEDULED', 'CONFIRMED'] },
        },
      }),
      prisma.message.count({
        where: {
          conversation: { workspaceId },
          direction: 'INBOUND',
          status: { in: ['PENDING', 'DELIVERED'] },
        },
      }),
    ])

    const conversionRate = totalLeads > 0 ? Number(((wonLeads / totalLeads) * 100).toFixed(2)) : 0
    const monthRevenue = Number(revenueResult._sum.amount ?? 0)

    return res.json({
      success: true,
      data: {
        totalLeads,
        newLeadsThisMonth,
        wonLeads,
        conversionRate,
        monthRevenue,
        appointmentsToday,
        upcomingAppointments,
        unreadMessages,
      },
    })
  } catch (err) {
    console.error('[GET /dashboard/summary]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── GET /recent-activity ────────────────────────────────────
router.get('/recent-activity', async (req, res) => {
  try {
    const { workspaceId } = req
    const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) ?? '20', 10)))

    // Fetch recent activity from each category in parallel
    const [recentLeads, recentAppointments, recentTransactions] = await Promise.all([
      prisma.lead.findMany({
        where: { workspaceId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          source: true,
          createdAt: true,
          stage: { select: { id: true, name: true, color: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.appointment.findMany({
        where: { workspaceId },
        select: {
          id: true,
          title: true,
          status: true,
          startsAt: true,
          endsAt: true,
          createdAt: true,
          lead: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.transaction.findMany({
        where: { workspaceId },
        select: {
          id: true,
          type: true,
          description: true,
          amount: true,
          isPaid: true,
          createdAt: true,
          lead: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
    ])

    // Merge and normalise into a unified activity feed sorted by date descending
    const feed = [
      ...recentLeads.map((l) => ({
        type: 'lead_created' as const,
        id: l.id,
        label: `Novo lead: ${l.name}`,
        detail: l.stage?.name ?? null,
        createdAt: l.createdAt,
        ref: l,
      })),
      ...recentAppointments.map((a) => ({
        type: 'appointment' as const,
        id: a.id,
        label: `Agendamento: ${a.title}`,
        detail: a.status,
        createdAt: a.createdAt,
        ref: a,
      })),
      ...recentTransactions.map((t) => ({
        type: 'transaction' as const,
        id: t.id,
        label: `${t.type === 'INCOME' ? 'Receita' : 'Despesa'}: ${t.description}`,
        detail: `R$ ${Number(t.amount).toFixed(2)}`,
        createdAt: t.createdAt,
        ref: t,
      })),
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)

    return res.json({ success: true, data: feed })
  } catch (err) {
    console.error('[GET /dashboard/recent-activity]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── GET /metrics ────────────────────────────────────────────
// Alias for /summary — kept for backward compatibility
router.get('/metrics', async (req, res) => {
  try {
    const { workspaceId } = req

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      totalLeads,
      newLeadsThisMonth,
      wonLeads,
      revenueResult,
      upcomingAppointments,
      unreadMessages,
    ] = await Promise.all([
      prisma.lead.count({ where: { workspaceId } }),
      prisma.lead.count({
        where: { workspaceId, createdAt: { gte: startOfMonth } },
      }),
      prisma.lead.count({
        where: { workspaceId, wonAt: { not: null } },
      }),
      prisma.transaction.aggregate({
        where: {
          workspaceId,
          type: 'INCOME',
          isPaid: true,
          paidAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
      prisma.appointment.count({
        where: {
          workspaceId,
          startsAt: { gte: now },
          status: { in: ['SCHEDULED', 'CONFIRMED'] },
        },
      }),
      prisma.message.count({
        where: {
          conversation: { workspaceId },
          direction: 'INBOUND',
          status: { in: ['PENDING', 'DELIVERED'] },
        },
      }),
    ])

    const conversionRate = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0
    const revenueThisMonth = Number(revenueResult._sum.amount ?? 0)

    return res.json({
      success: true,
      data: {
        totalLeads,
        newLeadsThisMonth,
        conversionRate,
        averageDealValue: 0,
        revenueThisMonth,
        upcomingAppointments,
        unreadMessages,
      },
    })
  } catch (err) {
    console.error('[GET /dashboard/metrics]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── GET /funnel ─────────────────────────────────────────────
router.get('/funnel', async (req, res) => {
  try {
    const { workspaceId } = req

    const pipeline = await prisma.pipeline.findFirst({
      where: { workspaceId, isDefault: true },
      include: {
        stages: {
          orderBy: { position: 'asc' },
          include: {
            _count: { select: { leads: true } },
            leads: { select: { value: true } },
          },
        },
      },
    })

    if (!pipeline) {
      return res.json({ success: true, data: [] })
    }

    const funnel = pipeline.stages.map((stage) => ({
      stageId: stage.id,
      stageName: stage.name,
      color: stage.color,
      count: stage._count.leads,
      value: stage.leads.reduce((sum, l) => sum + Number(l.value ?? 0), 0),
    }))

    return res.json({ success: true, data: funnel })
  } catch (err) {
    console.error('[GET /dashboard/funnel]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

export { router as dashboardRoutes }
