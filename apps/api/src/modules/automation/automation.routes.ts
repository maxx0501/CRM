import { Router } from 'express'
import { prisma } from '@crm/database'
import { createAutomationSchema, createAutomationStepSchema } from '@crm/shared'
import { requireWorkspace } from '../../plugins/tenant'

const router: Router = Router()

/**
 * Automation routes — all require requireWorkspace.
 *
 * GET    /automations                         → list automations
 * POST   /automations                         → create automation
 * GET    /automations/:id                     → get automation with steps
 * PATCH  /automations/:id                     → update automation
 * DELETE /automations/:id                     → delete automation
 *
 * Steps sub-routes:
 * POST   /automations/:id/steps               → add step
 * PATCH  /automations/:id/steps/:stepId       → update step
 * DELETE /automations/:id/steps/:stepId       → delete step
 *
 * Enrollment:
 * POST   /automations/:id/enroll/:leadId      → manually enroll a lead
 * DELETE /automations/:id/enroll/:leadId      → unenroll / cancel enrollment
 */
router.use(requireWorkspace)

// ─── GET / ───────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { isActive } = req.query as { isActive?: string }

    const automations = await prisma.automation.findMany({
      where: {
        workspaceId: req.workspaceId,
        ...(isActive !== undefined ? { isActive: isActive === 'true' } : {}),
      },
      include: {
        steps: { orderBy: { position: 'asc' } },
        triggerStage: { select: { id: true, name: true } },
        _count: { select: { steps: true, enrollments: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return res.json({ success: true, data: automations })
  } catch (err) {
    console.error('[GET /automations]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── POST / ──────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const parsed = createAutomationSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.errors[0]?.message ?? 'Dados inválidos',
      })
    }

    if (parsed.data.triggerStageId) {
      const stage = await prisma.pipelineStage.findFirst({
        where: {
          id: parsed.data.triggerStageId,
          pipeline: { workspaceId: req.workspaceId },
        },
      })
      if (!stage) {
        return res.status(400).json({ success: false, error: 'triggerStageId inválido' })
      }
    }

    const automation = await prisma.automation.create({
      data: {
        workspaceId: req.workspaceId!,
        name: parsed.data.name,
        triggerStageId: parsed.data.triggerStageId,
        triggerSource: parsed.data.triggerSource,
        isActive: parsed.data.isActive ?? true,
      },
      include: {
        steps: { orderBy: { position: 'asc' } },
        triggerStage: { select: { id: true, name: true } },
      },
    })

    return res.status(201).json({ success: true, data: automation })
  } catch (err) {
    console.error('[POST /automations]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── GET /:id ────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const automation = await prisma.automation.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId },
      include: {
        steps: { orderBy: { position: 'asc' } },
        triggerStage: { select: { id: true, name: true } },
        _count: { select: { enrollments: true } },
      },
    })

    if (!automation) {
      return res.status(404).json({ success: false, error: 'Automação não encontrada' })
    }

    return res.json({ success: true, data: automation })
  } catch (err) {
    console.error('[GET /automations/:id]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── PATCH /:id ──────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  try {
    const automation = await prisma.automation.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId },
    })

    if (!automation) {
      return res.status(404).json({ success: false, error: 'Automação não encontrada' })
    }

    const parsed = createAutomationSchema.partial().safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.errors[0]?.message ?? 'Dados inválidos',
      })
    }

    if (parsed.data.triggerStageId) {
      const stage = await prisma.pipelineStage.findFirst({
        where: {
          id: parsed.data.triggerStageId,
          pipeline: { workspaceId: req.workspaceId },
        },
      })
      if (!stage) {
        return res.status(400).json({ success: false, error: 'triggerStageId inválido' })
      }
    }

    const updated = await prisma.automation.update({
      where: { id: automation.id },
      data: parsed.data,
      include: {
        steps: { orderBy: { position: 'asc' } },
        triggerStage: { select: { id: true, name: true } },
      },
    })

    return res.json({ success: true, data: updated })
  } catch (err) {
    console.error('[PATCH /automations/:id]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── DELETE /:id ─────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const automation = await prisma.automation.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId },
    })

    if (!automation) {
      return res.status(404).json({ success: false, error: 'Automação não encontrada' })
    }

    await prisma.automation.delete({ where: { id: automation.id } })

    return res.json({ success: true, data: null })
  } catch (err) {
    console.error('[DELETE /automations/:id]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── POST /:id/steps ─────────────────────────────────────────
router.post('/:id/steps', async (req, res) => {
  try {
    const automation = await prisma.automation.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId },
    })

    if (!automation) {
      return res.status(404).json({ success: false, error: 'Automação não encontrada' })
    }

    const parsed = createAutomationStepSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.errors[0]?.message ?? 'Dados inválidos',
      })
    }

    const step = await prisma.automationStep.create({
      data: {
        automationId: automation.id,
        position: parsed.data.position,
        delayMinutes: parsed.data.delayMinutes,
        messageTemplate: parsed.data.messageTemplate,
      },
    })

    return res.status(201).json({ success: true, data: step })
  } catch (err) {
    console.error('[POST /automations/:id/steps]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── PATCH /:id/steps/:stepId ────────────────────────────────
router.patch('/:id/steps/:stepId', async (req, res) => {
  try {
    const step = await prisma.automationStep.findFirst({
      where: {
        id: req.params.stepId,
        automationId: req.params.id,
        automation: { workspaceId: req.workspaceId },
      },
    })

    if (!step) {
      return res.status(404).json({ success: false, error: 'Step não encontrado' })
    }

    const parsed = createAutomationStepSchema.partial().safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.errors[0]?.message ?? 'Dados inválidos',
      })
    }

    const updated = await prisma.automationStep.update({
      where: { id: step.id },
      data: parsed.data,
    })

    return res.json({ success: true, data: updated })
  } catch (err) {
    console.error('[PATCH /automations/:id/steps/:stepId]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── DELETE /:id/steps/:stepId ───────────────────────────────
router.delete('/:id/steps/:stepId', async (req, res) => {
  try {
    const step = await prisma.automationStep.findFirst({
      where: {
        id: req.params.stepId,
        automationId: req.params.id,
        automation: { workspaceId: req.workspaceId },
      },
    })

    if (!step) {
      return res.status(404).json({ success: false, error: 'Step não encontrado' })
    }

    await prisma.automationStep.delete({ where: { id: step.id } })

    return res.json({ success: true, data: null })
  } catch (err) {
    console.error('[DELETE /automations/:id/steps/:stepId]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── POST /:id/enroll/:leadId ────────────────────────────────
router.post('/:id/enroll/:leadId', async (req, res) => {
  try {
    const [automation, lead] = await Promise.all([
      prisma.automation.findFirst({
        where: { id: req.params.id, workspaceId: req.workspaceId },
        include: {
          steps: { orderBy: { position: 'asc' }, take: 1 },
        },
      }),
      prisma.lead.findFirst({
        where: { id: req.params.leadId, workspaceId: req.workspaceId },
      }),
    ])

    if (!automation) {
      return res.status(404).json({ success: false, error: 'Automação não encontrada' })
    }

    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead não encontrado' })
    }

    if (!automation.isActive) {
      return res.status(409).json({
        success: false,
        error: 'Não é possível inscrever em uma automação inativa',
      })
    }

    // Calculate when the first step should run
    const firstStep = automation.steps[0]
    const nextRunAt = firstStep
      ? new Date(Date.now() + firstStep.delayMinutes * 60 * 1000)
      : null

    // Upsert so re-enrolling resets the enrollment
    const enrollment = await prisma.automationEnrollment.upsert({
      where: {
        automationId_leadId: {
          automationId: automation.id,
          leadId: lead.id,
        },
      },
      update: {
        currentStep: 0,
        nextRunAt,
        isCompleted: false,
      },
      create: {
        automationId: automation.id,
        leadId: lead.id,
        currentStep: 0,
        nextRunAt,
        isCompleted: false,
      },
    })

    return res.status(201).json({ success: true, data: enrollment })
  } catch (err) {
    console.error('[POST /automations/:id/enroll/:leadId]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── DELETE /:id/enroll/:leadId ──────────────────────────────
router.delete('/:id/enroll/:leadId', async (req, res) => {
  try {
    const enrollment = await prisma.automationEnrollment.findFirst({
      where: {
        automationId: req.params.id,
        leadId: req.params.leadId,
        automation: { workspaceId: req.workspaceId },
      },
    })

    if (!enrollment) {
      return res.status(404).json({ success: false, error: 'Inscrição não encontrada' })
    }

    await prisma.automationEnrollment.delete({ where: { id: enrollment.id } })

    return res.json({ success: true, data: null })
  } catch (err) {
    console.error('[DELETE /automations/:id/enroll/:leadId]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

export { router as automationRoutes }
