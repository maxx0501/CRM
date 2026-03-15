import { Router } from 'express'
import { prisma } from '@crm/database'
import { sendMessageSchema } from '@crm/shared'
import { sendWhatsAppMessage } from '../../utils/whatsapp'
import { requireWorkspace } from '../../plugins/tenant'

const router: Router = Router()

/**
 * Conversation routes — all require requireWorkspace.
 *
 * GET  /conversations                    → list conversations (optional ?leadId, ?search, ?page, ?limit)
 * GET  /conversations/:id                → get conversation with messages
 * GET  /conversations/:id/messages       → paginated message list
 * POST /conversations/:id/messages       → send a message via WhatsApp API
 */
router.use(requireWorkspace)

// ─── GET / ───────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { leadId, search, page = '1', limit = '20' } = req.query as {
      leadId?: string
      search?: string
      page?: string
      limit?: string
    }

    const pageNum = Math.max(1, parseInt(page, 10))
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)))

    const where: Record<string, unknown> = {
      workspaceId: req.workspaceId,
    }

    if (leadId) where.leadId = leadId

    if (search) {
      where.OR = [
        { whatsappPhone: { contains: search } },
        { lead: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: {
          lead: { select: { id: true, name: true } },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1, // Last message preview
          },
          _count: { select: { messages: true } },
        },
        orderBy: { lastMessageAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.conversation.count({ where }),
    ])

    return res.json({
      success: true,
      data: conversations,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    })
  } catch (err) {
    console.error('[GET /conversations]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── GET /:id ────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const conversation = await prisma.conversation.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId },
      include: {
        lead: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50, // Initial load — use /messages for pagination
        },
        _count: { select: { messages: true } },
      },
    })

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversa não encontrada' })
    }

    return res.json({ success: true, data: conversation })
  } catch (err) {
    console.error('[GET /conversations/:id]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── GET /:id/messages ───────────────────────────────────────
router.get('/:id/messages', async (req, res) => {
  try {
    const conversation = await prisma.conversation.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId },
    })

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversa não encontrada' })
    }

    const { page = '1', limit = '50' } = req.query as { page?: string; limit?: string }
    const pageNum = Math.max(1, parseInt(page, 10))
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)))

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: 'desc' }, // Newest first so the client can reverse
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.message.count({ where: { conversationId: conversation.id } }),
    ])

    return res.json({
      success: true,
      data: messages,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    })
  } catch (err) {
    console.error('[GET /conversations/:id/messages]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// ─── POST /:id/messages ──────────────────────────────────────
router.post('/:id/messages', async (req, res) => {
  try {
    const conversation = await prisma.conversation.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId },
    })

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversa não encontrada' })
    }

    const parsed = sendMessageSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.errors[0]?.message ?? 'Dados inválidos',
      })
    }

    // Create the message record first (status = PENDING)
    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'OUTBOUND',
        content: parsed.data.content,
        mediaUrl: parsed.data.mediaUrl,
        status: 'PENDING',
      },
    })

    // Attempt delivery — update status based on result
    try {
      const externalId = await sendWhatsAppMessage({
        workspaceId: req.workspaceId!,
        phone: conversation.whatsappPhone,
        message: parsed.data.content,
        mediaUrl: parsed.data.mediaUrl,
      })

      const [updatedMessage] = await Promise.all([
        prisma.message.update({
          where: { id: message.id },
          data: { status: 'SENT', externalId: externalId ?? undefined },
        }),
        prisma.conversation.update({
          where: { id: conversation.id },
          data: { lastMessageAt: new Date() },
        }),
      ])

      // Log outbound message activity on the lead if linked
      if (conversation.leadId) {
        await prisma.activity.create({
          data: {
            leadId: conversation.leadId,
            type: 'MESSAGE_SENT',
            description: 'Mensagem WhatsApp enviada',
            metadata: {
              messageId: message.id,
              preview: parsed.data.content.slice(0, 80),
            },
          },
        })
      }

      return res.status(201).json({ success: true, data: updatedMessage })
    } catch (sendErr) {
      // Mark the stored message as failed so the UI can show an error state
      await prisma.message.update({
        where: { id: message.id },
        data: { status: 'FAILED' },
      })

      console.error('[POST /conversations/:id/messages] WhatsApp delivery failed:', sendErr)

      return res.status(502).json({
        success: false,
        error: 'Falha ao enviar mensagem via WhatsApp',
      })
    }
  } catch (err) {
    console.error('[POST /conversations/:id/messages]', err)
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

export { router as conversationRoutes }
