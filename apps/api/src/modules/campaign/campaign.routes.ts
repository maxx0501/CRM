import { Router } from 'express'
import { prisma } from '@crm/database'
import { createCampaignSchema, updateCampaignSchema } from '@crm/shared'
import { requireWorkspace } from '../../plugins/tenant'

const router: Router = Router()

/**
 * Campaign routes — all require requireWorkspace.
 *
 * GET    /campaigns           → list campaigns
 * POST   /campaigns           → create campaign
 * GET    /campaigns/:id/stats → lead count, won count, conversion rate, revenue
 * GET    /campaigns/:id       → get campaign detail
 * PATCH  /campaigns/:id       → update campaign
 * DELETE /campaigns/:id       → delete campaign
 */
router.use(requireWorkspace)

// ─── GET / ───────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { isActive } = req.query as { isActive?: string }

    const campaigns = await prisma.campaign.findMany({
      where: {
        workspaceId: req.workspaceId,
        ...(isActive !== undefined ? { isActive: isActive === 'true' } : {}),
      },
      include: { _count: { select: { leads: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return res.json({ success: true, data: campaigns })
  } catch (err) {
    console.error('[GET /campaigns]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── POST / ──────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const parsed = createCampaignSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.errors[0]?.message ?? 'Dados inválidos',
      })
    }

    const campaign = await prisma.campaign.create({
      data: {
        workspaceId: req.workspaceId!,
        name: parsed.data.name,
        utmSource: parsed.data.utmSource,
        utmMedium: parsed.data.utmMedium,
        utmCampaign: parsed.data.utmCampaign,
        utmTerm: parsed.data.utmTerm,
        utmContent: parsed.data.utmContent,
        budget: parsed.data.budget,
        isActive: parsed.data.isActive ?? true,
      },
    })

    return res.status(201).json({ success: true, data: campaign })
  } catch (err) {
    console.error('[POST /campaigns]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── GET /:id/stats ──────────────────────────────────────────
// Must be before /:id to avoid conflict
router.get('/:id/stats', async (req, res) => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId },
    })

    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campanha não encontrada' })
    }

    const [totalLeads, wonLeads, revenueAgg] = await Promise.all([
      prisma.lead.count({
        where: { campaignId: campaign.id, workspaceId: req.workspaceId },
      }),
      prisma.lead.count({
        where: {
          campaignId: campaign.id,
          workspaceId: req.workspaceId,
          wonAt: { not: null },
        },
      }),
      prisma.transaction.aggregate({
        where: {
          workspaceId: req.workspaceId,
          type: 'INCOME',
          isPaid: true,
          lead: { campaignId: campaign.id },
        },
        _sum: { amount: true },
      }),
    ])

    const revenue = Number(revenueAgg._sum.amount ?? 0)
    const conversionRate =
      totalLeads > 0 ? Number(((wonLeads / totalLeads) * 100).toFixed(2)) : 0

    const roi =
      campaign.budget && Number(campaign.budget) > 0
        ? Number(
            (
              ((revenue - Number(campaign.budget)) / Number(campaign.budget)) *
              100
            ).toFixed(2),
          )
        : null

    return res.json({
      success: true,
      data: {
        campaignId: campaign.id,
        campaignName: campaign.name,
        totalLeads,
        wonLeads,
        conversionRate,
        revenue,
        budget: campaign.budget ? Number(campaign.budget) : null,
        roi,
      },
    })
  } catch (err) {
    console.error('[GET /campaigns/:id/stats]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── GET /:id ────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId },
      include: { _count: { select: { leads: true } } },
    })

    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campanha não encontrada' })
    }

    return res.json({ success: true, data: campaign })
  } catch (err) {
    console.error('[GET /campaigns/:id]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── PATCH /:id ──────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId },
    })

    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campanha não encontrada' })
    }

    const parsed = updateCampaignSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.errors[0]?.message ?? 'Dados inválidos',
      })
    }

    const updated = await prisma.campaign.update({
      where: { id: campaign.id },
      data: parsed.data,
    })

    return res.json({ success: true, data: updated })
  } catch (err) {
    console.error('[PATCH /campaigns/:id]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── DELETE /:id ─────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId },
    })

    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campanha não encontrada' })
    }

    // Nullify campaign references on leads before deleting
    await prisma.$transaction([
      prisma.lead.updateMany({
        where: { campaignId: campaign.id },
        data: { campaignId: null },
      }),
      prisma.campaign.delete({ where: { id: campaign.id } }),
    ])

    return res.json({ success: true, data: null })
  } catch (err) {
    console.error('[DELETE /campaigns/:id]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

export { router as campaignRoutes }
