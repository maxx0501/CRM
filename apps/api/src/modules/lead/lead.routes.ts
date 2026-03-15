import { Router } from 'express'
import { prisma } from '@crm/database'
import {
  createLeadSchema,
  updateLeadSchema,
  moveLeadSchema,
  createNoteSchema,
  createTagSchema,
} from '@crm/shared'
import { requireWorkspace } from '../../plugins/tenant'

const router: Router = Router()

/**
 * Lead routes — all require requireWorkspace.
 *
 * GET    /leads                    → list leads (optional ?stageId, ?search, ?page, ?pipelineId, ?status)
 * POST   /leads                    → create lead
 * GET    /leads/:id                → get lead detail
 * PATCH  /leads/:id                → update lead
 * DELETE /leads/:id                → delete lead
 * PATCH  /leads/:id/move           → move lead to different stage (logs Activity)
 * GET    /leads/:id/timeline       → get activity timeline
 *
 * Notes sub-routes:
 * GET    /leads/:id/notes          → list notes
 * POST   /leads/:id/notes          → add note
 * DELETE /leads/:id/notes/:noteId  → delete note
 *
 * Tags sub-routes:
 * POST   /leads/:id/tags           → add tag to lead (creates Tag if needed)
 * DELETE /leads/:id/tags/:tagId    → remove tag from lead
 */
router.use(requireWorkspace)

// ─── GET / ───────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const {
      stageId,
      pipelineId,
      search,
      status,
      sort = 'position',
      page = '1',
      limit = '50',
    } = req.query as {
      stageId?: string
      pipelineId?: string
      search?: string
      status?: string
      sort?: string
      page?: string
      limit?: string
    }

    const pageNum = Math.max(1, parseInt(page, 10))
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)))
    const skip = (pageNum - 1) * limitNum

    // Build dynamic where clause
    const where: Record<string, unknown> = {
      workspaceId: req.workspaceId,
    }

    if (stageId) where.stageId = stageId

    if (pipelineId) {
      where.stage = { pipelineId }
    }

    // Map status shortcuts to Prisma conditions
    if (status === 'won') {
      where.wonAt = { not: null }
    } else if (status === 'lost') {
      where.lostAt = { not: null }
    } else if (status === 'active') {
      where.wonAt = null
      where.lostAt = null
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ]
    }

    // Build orderBy clause
    const validSortFields: Record<string, unknown> = {
      position: [{ position: 'asc' }, { createdAt: 'desc' }],
      createdAt: { createdAt: 'desc' },
      name: { name: 'asc' },
      value: { value: 'desc' },
      score: { score: 'desc' },
    }
    const orderBy = validSortFields[sort] ?? [{ position: 'asc' }, { createdAt: 'desc' }]

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          stage: { include: { pipeline: { select: { id: true, name: true } } } },
          tags: { include: { tag: true } },
          _count: { select: { notes: true, activities: true, appointments: true } },
        },
        orderBy,
        skip,
        take: limitNum,
      }),
      prisma.lead.count({ where }),
    ])

    return res.json({
      success: true,
      data: leads,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    })
  } catch (err) {
    console.error('[GET /leads]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── POST / ──────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const parsed = createLeadSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.errors[0]?.message ?? 'Dados inválidos',
      })
    }

    // Verify the stage belongs to this workspace
    const stage = await prisma.pipelineStage.findFirst({
      where: {
        id: parsed.data.stageId,
        pipeline: { workspaceId: req.workspaceId },
      },
    })

    if (!stage) {
      return res.status(400).json({ success: false, error: 'stageId inválido' })
    }

    // If a campaignId was provided, verify it belongs to this workspace
    if (parsed.data.campaignId) {
      const campaign = await prisma.campaign.findFirst({
        where: { id: parsed.data.campaignId, workspaceId: req.workspaceId },
      })
      if (!campaign) {
        return res.status(400).json({ success: false, error: 'campaignId inválido' })
      }
    }

    // Assign position after the last lead in that stage
    const lastLead = await prisma.lead.findFirst({
      where: { stageId: parsed.data.stageId },
      orderBy: { position: 'desc' },
    })
    const position = lastLead ? lastLead.position + 1 : 0

    const lead = await prisma.$transaction(async (tx) => {
      const newLead = await tx.lead.create({
        data: {
          workspaceId: req.workspaceId!,
          stageId: parsed.data.stageId,
          name: parsed.data.name,
          email: parsed.data.email || undefined,
          phone: parsed.data.phone,
          source: parsed.data.source ?? 'MANUAL',
          value: parsed.data.value,
          position,
          utmSource: parsed.data.utmSource,
          utmMedium: parsed.data.utmMedium,
          utmCampaign: parsed.data.utmCampaign,
          utmTerm: parsed.data.utmTerm,
          utmContent: parsed.data.utmContent,
          campaignId: parsed.data.campaignId,
        },
        include: {
          stage: { include: { pipeline: { select: { id: true, name: true } } } },
          tags: { include: { tag: true } },
        },
      })

      await tx.activity.create({
        data: {
          leadId: newLead.id,
          type: 'LEAD_CREATED',
          description: `Lead criado no stage "${stage.name}"`,
          metadata: { stageName: stage.name },
        },
      })

      return newLead
    })

    return res.status(201).json({ success: true, data: lead })
  } catch (err) {
    console.error('[POST /leads]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── GET /:id ────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId },
      include: {
        stage: { include: { pipeline: true } },
        tags: { include: { tag: true } },
        notes: { orderBy: { createdAt: 'desc' } },
        appointments: { orderBy: { startsAt: 'asc' }, include: { lead: { select: { id: true, name: true } } } },
        transactions: { orderBy: { createdAt: 'desc' } },
        activities: { orderBy: { createdAt: 'desc' }, take: 50 },
        customValues: { include: { field: true } },
      },
    })

    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead não encontrado' })
    }

    return res.json({ success: true, data: lead })
  } catch (err) {
    console.error('[GET /leads/:id]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── PATCH /:id ──────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  try {
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId },
    })

    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead não encontrado' })
    }

    const parsed = updateLeadSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.errors[0]?.message ?? 'Dados inválidos',
      })
    }

    if (parsed.data.stageId && parsed.data.stageId !== lead.stageId) {
      const stage = await prisma.pipelineStage.findFirst({
        where: {
          id: parsed.data.stageId,
          pipeline: { workspaceId: req.workspaceId },
        },
      })
      if (!stage) {
        return res.status(400).json({ success: false, error: 'stageId inválido' })
      }
    }

    if (parsed.data.campaignId) {
      const campaign = await prisma.campaign.findFirst({
        where: { id: parsed.data.campaignId, workspaceId: req.workspaceId },
      })
      if (!campaign) {
        return res.status(400).json({ success: false, error: 'campaignId inválido' })
      }
    }

    const updated = await prisma.lead.update({
      where: { id: lead.id },
      data: {
        ...parsed.data,
        email: parsed.data.email === '' ? null : parsed.data.email,
      },
      include: {
        stage: { include: { pipeline: { select: { id: true, name: true } } } },
        tags: { include: { tag: true } },
      },
    })

    return res.json({ success: true, data: updated })
  } catch (err) {
    console.error('[PATCH /leads/:id]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── DELETE /:id ─────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId },
    })

    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead não encontrado' })
    }

    await prisma.lead.delete({ where: { id: lead.id } })

    return res.json({ success: true, data: null })
  } catch (err) {
    console.error('[DELETE /leads/:id]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── PATCH /:id/move ─────────────────────────────────────────
router.patch('/:id/move', async (req, res) => {
  try {
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId },
      include: { stage: true },
    })

    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead não encontrado' })
    }

    const parsed = moveLeadSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.errors[0]?.message ?? 'Dados inválidos',
      })
    }

    const { stageId, position } = parsed.data

    const targetStage = await prisma.pipelineStage.findFirst({
      where: {
        id: stageId,
        pipeline: { workspaceId: req.workspaceId },
      },
    })

    if (!targetStage) {
      return res.status(400).json({ success: false, error: 'stageId inválido' })
    }

    const isStageChange = stageId !== lead.stageId

    const updated = await prisma.$transaction(async (tx) => {
      const updatedLead = await tx.lead.update({
        where: { id: lead.id },
        data: {
          stageId,
          position,
          // Mark won/lost timestamps on first transition
          wonAt: targetStage.isWonStage && !lead.wonAt ? new Date() : lead.wonAt,
          lostAt: targetStage.isLostStage && !lead.lostAt ? new Date() : lead.lostAt,
        },
        include: { stage: true },
      })

      if (isStageChange) {
        await tx.activity.create({
          data: {
            leadId: lead.id,
            type: 'STAGE_CHANGED',
            description: `Movido de "${lead.stage.name}" para "${targetStage.name}"`,
            metadata: {
              fromStageId: lead.stageId,
              fromStageName: lead.stage.name,
              toStageId: stageId,
              toStageName: targetStage.name,
            },
          },
        })
      }

      return updatedLead
    })

    return res.json({ success: true, data: updated })
  } catch (err) {
    console.error('[PATCH /leads/:id/move]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── GET /:id/timeline ───────────────────────────────────────
router.get('/:id/timeline', async (req, res) => {
  try {
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId },
    })

    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead não encontrado' })
    }

    const { page = '1', limit = '20' } = req.query as { page?: string; limit?: string }
    const pageNum = Math.max(1, parseInt(page, 10))
    const limitNum = Math.min(100, parseInt(limit, 10))

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where: { leadId: lead.id },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.activity.count({ where: { leadId: lead.id } }),
    ])

    return res.json({
      success: true,
      data: activities,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    })
  } catch (err) {
    console.error('[GET /leads/:id/timeline]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── GET /:id/notes ──────────────────────────────────────────
router.get('/:id/notes', async (req, res) => {
  try {
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId },
    })

    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead não encontrado' })
    }

    const notes = await prisma.note.findMany({
      where: { leadId: lead.id },
      orderBy: { createdAt: 'desc' },
    })

    return res.json({ success: true, data: notes })
  } catch (err) {
    console.error('[GET /leads/:id/notes]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── POST /:id/notes ─────────────────────────────────────────
router.post('/:id/notes', async (req, res) => {
  try {
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId },
    })

    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead não encontrado' })
    }

    const parsed = createNoteSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.errors[0]?.message ?? 'Dados inválidos',
      })
    }

    const note = await prisma.$transaction(async (tx) => {
      const newNote = await tx.note.create({
        data: { leadId: lead.id, content: parsed.data.content },
      })

      await tx.activity.create({
        data: {
          leadId: lead.id,
          type: 'NOTE_ADDED',
          description: 'Nota adicionada',
          metadata: { noteId: newNote.id, preview: parsed.data.content.slice(0, 80) },
        },
      })

      return newNote
    })

    return res.status(201).json({ success: true, data: note })
  } catch (err) {
    console.error('[POST /leads/:id/notes]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── DELETE /:id/notes/:noteId ───────────────────────────────
router.delete('/:id/notes/:noteId', async (req, res) => {
  try {
    const note = await prisma.note.findFirst({
      where: {
        id: req.params.noteId,
        leadId: req.params.id,
        lead: { workspaceId: req.workspaceId },
      },
    })

    if (!note) {
      return res.status(404).json({ success: false, error: 'Nota não encontrada' })
    }

    await prisma.note.delete({ where: { id: note.id } })

    return res.json({ success: true, data: null })
  } catch (err) {
    console.error('[DELETE /leads/:id/notes/:noteId]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── POST /:id/tags ──────────────────────────────────────────
router.post('/:id/tags', async (req, res) => {
  try {
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId },
    })

    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead não encontrado' })
    }

    const parsed = createTagSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.errors[0]?.message ?? 'Dados inválidos',
      })
    }

    const result = await prisma.$transaction(async (tx) => {
      // Upsert tag so we can reuse existing tags by name
      const tag = await tx.tag.upsert({
        where: {
          workspaceId_name: {
            workspaceId: req.workspaceId!,
            name: parsed.data.name,
          },
        },
        update: {},
        create: {
          workspaceId: req.workspaceId!,
          name: parsed.data.name,
          color: parsed.data.color ?? '#6366f1',
        },
      })

      // Idempotent: create if not already linked
      await tx.leadTag.upsert({
        where: { leadId_tagId: { leadId: lead.id, tagId: tag.id } },
        update: {},
        create: { leadId: lead.id, tagId: tag.id },
      })

      await tx.activity.create({
        data: {
          leadId: lead.id,
          type: 'TAG_ADDED',
          description: `Tag "${tag.name}" adicionada`,
          metadata: { tagId: tag.id, tagName: tag.name },
        },
      })

      return tag
    })

    return res.status(201).json({ success: true, data: result })
  } catch (err) {
    console.error('[POST /leads/:id/tags]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── DELETE /:id/tags/:tagId ─────────────────────────────────
router.delete('/:id/tags/:tagId', async (req, res) => {
  try {
    const leadTag = await prisma.leadTag.findFirst({
      where: {
        leadId: req.params.id,
        tagId: req.params.tagId,
        lead: { workspaceId: req.workspaceId },
      },
      include: { tag: true },
    })

    if (!leadTag) {
      return res.status(404).json({ success: false, error: 'Associação de tag não encontrada' })
    }

    await prisma.$transaction(async (tx) => {
      await tx.leadTag.delete({
        where: {
          leadId_tagId: { leadId: req.params.id, tagId: req.params.tagId },
        },
      })

      await tx.activity.create({
        data: {
          leadId: req.params.id,
          type: 'TAG_REMOVED',
          description: `Tag "${leadTag.tag.name}" removida`,
          metadata: { tagId: leadTag.tag.id, tagName: leadTag.tag.name },
        },
      })
    })

    return res.json({ success: true, data: null })
  } catch (err) {
    console.error('[DELETE /leads/:id/tags/:tagId]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

export { router as leadRoutes }
