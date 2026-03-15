import { Router } from 'express'
import { prisma } from '@crm/database'
import { createPipelineSchema, createStageSchema, reorderStagesSchema } from '@crm/shared'
import { requireWorkspace } from '../../plugins/tenant'

const router: Router = Router()

/**
 * Pipeline routes — all require requireWorkspace (JWT + x-workspace-id header).
 *
 * GET    /pipelines                         → list pipelines for workspace
 * POST   /pipelines                         → create pipeline
 * GET    /pipelines/default                 → get default pipeline with leads
 * GET    /pipelines/:id                     → get pipeline with stages
 * PATCH  /pipelines/:id                     → update pipeline
 * DELETE /pipelines/:id                     → delete pipeline
 * POST   /pipelines/:id/stages              → add stage to pipeline
 * PATCH  /pipelines/:id/stages/:stageId     → update stage
 * DELETE /pipelines/:id/stages/:stageId     → delete stage
 * PUT    /pipelines/:id/stages/reorder      → bulk-reorder stages
 */
router.use(requireWorkspace)

// ─── PUT /:id/stages/reorder ─────────────────────────────────
// NOTE: registered as PUT per spec; must also handle PATCH for compatibility
router.put('/:id/stages/reorder', async (req, res) => {
  try {
    const pipeline = await prisma.pipeline.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId },
    })

    if (!pipeline) {
      return res.status(404).json({ success: false, error: 'Pipeline não encontrado' })
    }

    const parsed = reorderStagesSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.errors[0]?.message ?? 'Dados inválidos',
      })
    }

    const { stages } = parsed.data

    // Verify all stages belong to this pipeline (which already belongs to the workspace)
    const stageIds = stages.map((s) => s.id)
    const existing = await prisma.pipelineStage.findMany({
      where: {
        id: { in: stageIds },
        pipelineId: pipeline.id,
      },
      select: { id: true },
    })

    if (existing.length !== stageIds.length) {
      return res.status(400).json({
        success: false,
        error: 'Um ou mais IDs de stage são inválidos ou não pertencem a este pipeline',
      })
    }

    // Batch-update positions inside a transaction
    await prisma.$transaction(
      stages.map((s) =>
        prisma.pipelineStage.update({
          where: { id: s.id },
          data: { position: s.position },
        }),
      ),
    )

    return res.json({ success: true, data: null })
  } catch (err) {
    console.error('[PUT /pipelines/:id/stages/reorder]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── PATCH /stages/reorder ───────────────────────────────────
// Kept for backward compatibility — delegates to the same logic
router.patch('/stages/reorder', async (req, res) => {
  try {
    const parsed = reorderStagesSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.errors[0]?.message ?? 'Dados inválidos',
      })
    }

    const { stages } = parsed.data

    // Verify all stages belong to this workspace before updating
    const stageIds = stages.map((s) => s.id)
    const existing = await prisma.pipelineStage.findMany({
      where: {
        id: { in: stageIds },
        pipeline: { workspaceId: req.workspaceId },
      },
      select: { id: true },
    })

    if (existing.length !== stageIds.length) {
      return res.status(400).json({
        success: false,
        error: 'Um ou mais IDs de stage são inválidos ou não pertencem a este workspace',
      })
    }

    // Batch-update positions inside a transaction
    await prisma.$transaction(
      stages.map((s) =>
        prisma.pipelineStage.update({
          where: { id: s.id },
          data: { position: s.position },
        }),
      ),
    )

    return res.json({ success: true, data: null })
  } catch (err) {
    console.error('[PATCH /pipelines/stages/reorder]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── GET /default ─────────────────────────────────────────────
// Must be before /:id to avoid route conflicts
router.get('/default', async (req, res) => {
  try {
    const pipeline = await prisma.pipeline.findFirst({
      where: { workspaceId: req.workspaceId, isDefault: true },
      include: {
        stages: {
          orderBy: { position: 'asc' },
          include: {
            leads: {
              where: { workspaceId: req.workspaceId },
              orderBy: { position: 'asc' },
            },
            _count: { select: { leads: true } },
          },
        },
      },
    })

    if (!pipeline) {
      return res.status(404).json({ success: false, error: 'Pipeline padrão não encontrado' })
    }

    return res.json({ success: true, data: pipeline })
  } catch (err) {
    console.error('[GET /pipelines/default]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── GET / ───────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const pipelines = await prisma.pipeline.findMany({
      where: { workspaceId: req.workspaceId },
      include: {
        stages: {
          orderBy: { position: 'asc' },
          include: { _count: { select: { leads: true } } },
        },
        _count: { select: { stages: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    return res.json({ success: true, data: pipelines })
  } catch (err) {
    console.error('[GET /pipelines]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── POST / ──────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const parsed = createPipelineSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.errors[0]?.message ?? 'Dados inválidos',
      })
    }

    // If this is set as default, clear the flag on all others first
    if (parsed.data.isDefault) {
      await prisma.pipeline.updateMany({
        where: { workspaceId: req.workspaceId },
        data: { isDefault: false },
      })
    }

    const pipeline = await prisma.pipeline.create({
      data: {
        workspaceId: req.workspaceId!,
        name: parsed.data.name,
        isDefault: parsed.data.isDefault ?? false,
      },
      include: {
        stages: { orderBy: { position: 'asc' } },
      },
    })

    return res.status(201).json({ success: true, data: pipeline })
  } catch (err) {
    console.error('[POST /pipelines]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── GET /:id ────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const pipeline = await prisma.pipeline.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId },
      include: {
        stages: {
          orderBy: { position: 'asc' },
          include: {
            leads: {
              where: { workspaceId: req.workspaceId },
              orderBy: { position: 'asc' },
              include: {
                tags: { include: { tag: true } },
              },
            },
            _count: { select: { leads: true } },
          },
        },
      },
    })

    if (!pipeline) {
      return res.status(404).json({ success: false, error: 'Pipeline não encontrado' })
    }

    return res.json({ success: true, data: pipeline })
  } catch (err) {
    console.error('[GET /pipelines/:id]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── PATCH /:id ──────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  try {
    const pipeline = await prisma.pipeline.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId },
    })

    if (!pipeline) {
      return res.status(404).json({ success: false, error: 'Pipeline não encontrado' })
    }

    const parsed = createPipelineSchema.partial().safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.errors[0]?.message ?? 'Dados inválidos',
      })
    }

    if (parsed.data.isDefault) {
      await prisma.pipeline.updateMany({
        where: { workspaceId: req.workspaceId, NOT: { id: pipeline.id } },
        data: { isDefault: false },
      })
    }

    const updated = await prisma.pipeline.update({
      where: { id: pipeline.id },
      data: parsed.data,
      include: { stages: { orderBy: { position: 'asc' } } },
    })

    return res.json({ success: true, data: updated })
  } catch (err) {
    console.error('[PATCH /pipelines/:id]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── DELETE /:id ─────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const pipeline = await prisma.pipeline.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId },
      include: { _count: { select: { stages: true } } },
    })

    if (!pipeline) {
      return res.status(404).json({ success: false, error: 'Pipeline não encontrado' })
    }

    if (pipeline.isDefault) {
      return res.status(409).json({
        success: false,
        error: 'Não é possível excluir o pipeline padrão',
      })
    }

    await prisma.pipeline.delete({ where: { id: pipeline.id } })

    return res.json({ success: true, data: null })
  } catch (err) {
    console.error('[DELETE /pipelines/:id]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── POST /:id/stages ────────────────────────────────────────
router.post('/:id/stages', async (req, res) => {
  try {
    const pipeline = await prisma.pipeline.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId },
    })

    if (!pipeline) {
      return res.status(404).json({ success: false, error: 'Pipeline não encontrado' })
    }

    const parsed = createStageSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.errors[0]?.message ?? 'Dados inválidos',
      })
    }

    // Auto-assign position as last stage
    const lastStage = await prisma.pipelineStage.findFirst({
      where: { pipelineId: pipeline.id },
      orderBy: { position: 'desc' },
    })
    const position = lastStage ? lastStage.position + 1 : 0

    const stage = await prisma.pipelineStage.create({
      data: {
        pipelineId: pipeline.id,
        name: parsed.data.name,
        color: parsed.data.color ?? '#6366f1',
        position,
        isWonStage: parsed.data.isWonStage ?? false,
        isLostStage: parsed.data.isLostStage ?? false,
      },
    })

    return res.status(201).json({ success: true, data: stage })
  } catch (err) {
    console.error('[POST /pipelines/:id/stages]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── PATCH /:id/stages/:stageId ──────────────────────────────
router.patch('/:id/stages/:stageId', async (req, res) => {
  try {
    const stage = await prisma.pipelineStage.findFirst({
      where: {
        id: req.params.stageId,
        pipelineId: req.params.id,
        pipeline: { workspaceId: req.workspaceId },
      },
    })

    if (!stage) {
      return res.status(404).json({ success: false, error: 'Stage não encontrado' })
    }

    const parsed = createStageSchema.partial().safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.errors[0]?.message ?? 'Dados inválidos',
      })
    }

    const updated = await prisma.pipelineStage.update({
      where: { id: stage.id },
      data: parsed.data,
    })

    return res.json({ success: true, data: updated })
  } catch (err) {
    console.error('[PATCH /pipelines/:id/stages/:stageId]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── DELETE /:id/stages/:stageId ─────────────────────────────
router.delete('/:id/stages/:stageId', async (req, res) => {
  try {
    const stage = await prisma.pipelineStage.findFirst({
      where: {
        id: req.params.stageId,
        pipelineId: req.params.id,
        pipeline: { workspaceId: req.workspaceId },
      },
      include: { _count: { select: { leads: true } } },
    })

    if (!stage) {
      return res.status(404).json({ success: false, error: 'Stage não encontrado' })
    }

    if (stage._count.leads > 0) {
      return res.status(409).json({
        success: false,
        error: 'Não é possível excluir um stage com leads. Mova os leads primeiro.',
      })
    }

    await prisma.pipelineStage.delete({ where: { id: stage.id } })

    return res.json({ success: true, data: null })
  } catch (err) {
    console.error('[DELETE /pipelines/:id/stages/:stageId]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

export { router as pipelineRoutes }
