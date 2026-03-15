import { Router } from 'express'
import { prisma, Prisma } from '@crm/database'
import { createAppointmentSchema, updateAppointmentSchema } from '@crm/shared'
import { requireWorkspace } from '../../plugins/tenant'

const router: Router = Router()

/**
 * Appointment routes — all require requireWorkspace.
 *
 * GET    /appointments            → list appointments (optional ?leadId, ?status, ?from, ?to, ?upcoming)
 * POST   /appointments            → create appointment
 * GET    /appointments/upcoming   → next 10 upcoming scheduled/confirmed appointments
 * GET    /appointments/:id        → get single appointment
 * PATCH  /appointments/:id        → update appointment
 * DELETE /appointments/:id        → delete appointment
 */
router.use(requireWorkspace)

// ─── GET /upcoming ───────────────────────────────────────────
// Must be registered before /:id to avoid conflicts
router.get('/upcoming', async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      where: {
        workspaceId: req.workspaceId,
        startsAt: { gte: new Date() },
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
      },
      include: { lead: { select: { id: true, name: true, phone: true } } },
      orderBy: { startsAt: 'asc' },
      take: 10,
    })

    return res.json({ success: true, data: appointments })
  } catch (err) {
    console.error('[GET /appointments/upcoming]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── GET / ───────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const {
      leadId,
      status,
      from,
      to,
      upcoming,
      page = '1',
      limit = '20',
    } = req.query as {
      leadId?: string
      status?: string
      from?: string
      to?: string
      upcoming?: string
      page?: string
      limit?: string
    }

    const pageNum = Math.max(1, parseInt(page, 10))
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)))

    const where: Record<string, unknown> = {
      workspaceId: req.workspaceId,
    }

    if (leadId) where.leadId = leadId

    if (status) {
      const validStatuses = ['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, error: 'Status inválido' })
      }
      where.status = status
    }

    // ?upcoming=true shortcut: overrides date range to show future appointments
    if (upcoming === 'true') {
      where.startsAt = { gte: new Date() }
      if (!status) where.status = { in: ['SCHEDULED', 'CONFIRMED'] }
    } else if (from || to) {
      where.startsAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      }
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: { lead: { select: { id: true, name: true, phone: true } } },
        orderBy: { startsAt: 'asc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.appointment.count({ where }),
    ])

    return res.json({
      success: true,
      data: appointments,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    })
  } catch (err) {
    console.error('[GET /appointments]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── POST / ──────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const parsed = createAppointmentSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.errors[0]?.message ?? 'Dados inválidos',
      })
    }

    const startsAt = new Date(parsed.data.startsAt)
    const endsAt = new Date(parsed.data.endsAt)

    if (endsAt <= startsAt) {
      return res.status(400).json({
        success: false,
        error: 'endsAt deve ser após startsAt',
      })
    }

    // Optionally verify the lead belongs to this workspace
    if (parsed.data.leadId) {
      const lead = await prisma.lead.findFirst({
        where: { id: parsed.data.leadId, workspaceId: req.workspaceId },
      })
      if (!lead) {
        return res.status(400).json({ success: false, error: 'leadId inválido' })
      }
    }

    const appointment = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const appt = await tx.appointment.create({
        data: {
          workspaceId: req.workspaceId!,
          leadId: parsed.data.leadId,
          title: parsed.data.title,
          startsAt,
          endsAt,
          notes: parsed.data.notes,
        },
        include: { lead: { select: { id: true, name: true } } },
      })

      if (parsed.data.leadId) {
        await tx.activity.create({
          data: {
            leadId: parsed.data.leadId,
            type: 'APPOINTMENT_CREATED',
            description: `Agendamento criado: "${parsed.data.title}"`,
            metadata: { appointmentId: appt.id, startsAt: startsAt.toISOString() },
          },
        })
      }

      return appt
    })

    return res.status(201).json({ success: true, data: appointment })
  } catch (err) {
    console.error('[POST /appointments]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── GET /:id ────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const appointment = await prisma.appointment.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId },
      include: { lead: true },
    })

    if (!appointment) {
      return res.status(404).json({ success: false, error: 'Agendamento não encontrado' })
    }

    return res.json({ success: true, data: appointment })
  } catch (err) {
    console.error('[GET /appointments/:id]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── PATCH /:id ──────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  try {
    const appointment = await prisma.appointment.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId },
    })

    if (!appointment) {
      return res.status(404).json({ success: false, error: 'Agendamento não encontrado' })
    }

    const parsed = updateAppointmentSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.errors[0]?.message ?? 'Dados inválidos',
      })
    }

    const startsAt = parsed.data.startsAt ? new Date(parsed.data.startsAt) : appointment.startsAt
    const endsAt = parsed.data.endsAt ? new Date(parsed.data.endsAt) : appointment.endsAt

    if (endsAt <= startsAt) {
      return res.status(400).json({
        success: false,
        error: 'endsAt deve ser após startsAt',
      })
    }

    const wasCompleted =
      parsed.data.status === 'COMPLETED' && appointment.status !== 'COMPLETED'

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updatedAppt = await tx.appointment.update({
        where: { id: appointment.id },
        data: {
          ...parsed.data,
          startsAt,
          endsAt,
        },
        include: { lead: { select: { id: true, name: true } } },
      })

      if (wasCompleted && appointment.leadId) {
        await tx.activity.create({
          data: {
            leadId: appointment.leadId,
            type: 'APPOINTMENT_COMPLETED',
            description: `Agendamento concluído: "${appointment.title}"`,
            metadata: { appointmentId: appointment.id },
          },
        })
      }

      return updatedAppt
    })

    return res.json({ success: true, data: updated })
  } catch (err) {
    console.error('[PATCH /appointments/:id]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── DELETE /:id ─────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const appointment = await prisma.appointment.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId },
    })

    if (!appointment) {
      return res.status(404).json({ success: false, error: 'Agendamento não encontrado' })
    }

    await prisma.appointment.delete({ where: { id: appointment.id } })

    return res.json({ success: true, data: null })
  } catch (err) {
    console.error('[DELETE /appointments/:id]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

export { router as appointmentRoutes }
