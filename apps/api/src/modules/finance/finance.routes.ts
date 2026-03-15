import { Router } from 'express'
import { prisma, Prisma } from '@crm/database'
import { createTransactionSchema, updateTransactionSchema } from '@crm/shared'
import { requireWorkspace } from '../../plugins/tenant'

const router: Router = Router()

/**
 * Finance routes — all require requireWorkspace.
 * Mounted at /finances in server.ts.
 *
 * GET    /finances/summary        → aggregated totals for a given period
 * GET    /finances                → list transactions (optional ?type, ?isPaid, ?from, ?to, ?leadId)
 * POST   /finances                → create transaction
 * GET    /finances/:id            → get single transaction
 * PATCH  /finances/:id            → update transaction
 * DELETE /finances/:id            → delete transaction
 */
router.use(requireWorkspace)

// ─── GET /summary ────────────────────────────────────────────
// Must be registered before /:id to avoid route conflicts
router.get('/summary', async (req, res) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string }

    const dateFilter =
      from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}

    const baseWhere = {
      workspaceId: req.workspaceId,
      isPaid: true,
      ...dateFilter,
    }

    const [incomeAgg, expenseAgg, pendingAgg] = await Promise.all([
      prisma.transaction.aggregate({
        where: { ...baseWhere, type: 'INCOME' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.transaction.aggregate({
        where: { ...baseWhere, type: 'EXPENSE' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.transaction.aggregate({
        where: { workspaceId: req.workspaceId, isPaid: false, ...dateFilter },
        _sum: { amount: true },
        _count: true,
      }),
    ])

    const income = Number(incomeAgg._sum.amount ?? 0)
    const expense = Number(expenseAgg._sum.amount ?? 0)

    return res.json({
      success: true,
      data: {
        income,
        expense,
        balance: income - expense,
        pending: Number(pendingAgg._sum.amount ?? 0),
        counts: {
          income: incomeAgg._count,
          expense: expenseAgg._count,
          pending: pendingAgg._count,
        },
        period: { from: from ?? null, to: to ?? null },
      },
    })
  } catch (err) {
    console.error('[GET /finances/summary]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── GET / ───────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const {
      type,
      isPaid,
      leadId,
      from,
      to,
      page = '1',
      limit = '20',
    } = req.query as {
      type?: string
      isPaid?: string
      leadId?: string
      from?: string
      to?: string
      page?: string
      limit?: string
    }

    const pageNum = Math.max(1, parseInt(page, 10))
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)))

    const where: Prisma.TransactionWhereInput = {
      workspaceId: req.workspaceId,
      ...(type ? { type: type as 'INCOME' | 'EXPENSE' } : {}),
      ...(isPaid !== undefined ? { isPaid: isPaid === 'true' } : {}),
      ...(leadId ? { leadId } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: { lead: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.transaction.count({ where }),
    ])

    return res.json({
      success: true,
      data: transactions,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    })
  } catch (err) {
    console.error('[GET /finances]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── POST / ──────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const parsed = createTransactionSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.errors[0]?.message ?? 'Dados inválidos',
      })
    }

    if (parsed.data.leadId) {
      const lead = await prisma.lead.findFirst({
        where: { id: parsed.data.leadId, workspaceId: req.workspaceId },
      })
      if (!lead) {
        return res.status(400).json({ success: false, error: 'leadId inválido' })
      }
    }

    const transaction = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = await tx.transaction.create({
        data: {
          workspaceId: req.workspaceId!,
          leadId: parsed.data.leadId,
          type: parsed.data.type,
          description: parsed.data.description,
          amount: parsed.data.amount,
          method: parsed.data.method ?? 'PIX',
          isPaid: parsed.data.isPaid ?? false,
          dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
          paidAt: parsed.data.isPaid ? new Date() : undefined,
        },
        include: { lead: { select: { id: true, name: true } } },
      })

      if (parsed.data.leadId && parsed.data.type === 'INCOME' && parsed.data.isPaid) {
        await tx.activity.create({
          data: {
            leadId: parsed.data.leadId,
            type: 'PAYMENT_RECEIVED',
            description: `Pagamento recebido: ${parsed.data.description}`,
            metadata: {
              transactionId: created.id,
              amount: parsed.data.amount,
            },
          },
        })
      }

      return created
    })

    return res.status(201).json({ success: true, data: transaction })
  } catch (err) {
    console.error('[POST /finances]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── GET /:id ────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const transaction = await prisma.transaction.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId },
      include: { lead: true },
    })

    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transação não encontrada' })
    }

    return res.json({ success: true, data: transaction })
  } catch (err) {
    console.error('[GET /finances/:id]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── PATCH /:id ──────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  try {
    const transaction = await prisma.transaction.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId },
    })

    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transação não encontrada' })
    }

    const parsed = updateTransactionSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.errors[0]?.message ?? 'Dados inválidos',
      })
    }

    // If marking as paid now, record the paidAt timestamp
    const justPaid = parsed.data.isPaid === true && !transaction.isPaid

    const updated = await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        ...parsed.data,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
        paidAt: justPaid ? new Date() : transaction.paidAt,
      },
      include: { lead: { select: { id: true, name: true } } },
    })

    return res.json({ success: true, data: updated })
  } catch (err) {
    console.error('[PATCH /finances/:id]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── DELETE /:id ─────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const transaction = await prisma.transaction.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId },
    })

    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transação não encontrada' })
    }

    await prisma.transaction.delete({ where: { id: transaction.id } })

    return res.json({ success: true, data: null })
  } catch (err) {
    console.error('[DELETE /finances/:id]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

export { router as financeRoutes }
