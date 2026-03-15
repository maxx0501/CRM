import { Router } from 'express'
import { prisma } from '@crm/database'
import { z } from 'zod'

const router: Router = Router()

/**
 * Webhook routes — public, no JWT auth.
 * Security is provided by validating the API key present in the workspace record.
 *
 * POST /webhooks/whatsapp/:workspaceId
 *   → Receives inbound WhatsApp messages from the unofficial API.
 *   → Creates a Lead + Conversation for unknown phone numbers.
 *   → Creates an inbound Message and logs an Activity.
 */

// Minimal validation for inbound webhook payload.
// Unofficial WhatsApp APIs vary, so we use a lenient schema that accepts the
// most common field names and ignores unknown keys.
const whatsappWebhookSchema = z.object({
  // The phone number the message originated from (e.g. "5511999999999")
  from: z.string().min(8),
  // The raw message text
  body: z.string().optional().default(''),
  // Some APIs call it "message" instead of "body"
  message: z.string().optional(),
  // Media attachment URL if present
  mediaUrl: z.string().url().optional(),
  // External message ID for idempotency — APIs may call it "id" or "messageId"
  id: z.string().optional(),
  messageId: z.string().optional(),
})

// ─── POST /webhooks/whatsapp/:workspaceId ────────────────────
router.post('/whatsapp/:workspaceId', async (req, res) => {
  const { workspaceId } = req.params

  try {
    // ── 1. Validate API key ──────────────────────────────────
    // The unofficial API is expected to include the key in the Authorization
    // header as "Bearer <key>" or as a custom "x-api-key" header.
    const authHeader = req.headers.authorization
    const apiKeyHeader = req.headers['x-api-key'] as string | undefined
    const providedKey =
      authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7)
        : (apiKeyHeader ?? null)

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        whatsappApiKey: true,
        whatsappApiUrl: true,
        pipelines: {
          where: { isDefault: true },
          select: {
            id: true,
            stages: { orderBy: { position: 'asc' }, take: 1 },
          },
          take: 1,
        },
      },
    })

    if (!workspace) {
      // Return 200 to avoid the sender retrying indefinitely
      return res.json({ success: false, error: 'Workspace não encontrado' })
    }

    if (!workspace.whatsappApiKey || workspace.whatsappApiKey !== providedKey) {
      console.warn(
        JSON.stringify({
          workspaceId,
          providedKey: providedKey ? '[redacted]' : null,
          msg: 'Webhook rejeitado: API key inválida',
        }),
      )
      return res.status(401).json({ success: false, error: 'API key inválida' })
    }

    // ── 2. Parse payload ─────────────────────────────────────
    const parsed = whatsappWebhookSchema.safeParse(req.body)
    if (!parsed.success) {
      console.warn(JSON.stringify({ body: req.body, msg: 'Falha na validação do payload webhook' }))
      // Return 200 so the sender stops retrying malformed payloads
      return res.json({ success: false, error: 'Formato de payload inválido' })
    }

    const data = parsed.data
    const phone = data.from.replace(/\D/g, '') // Strip non-digits
    const content = data.message ?? data.body
    const externalId = data.id ?? data.messageId

    // ── 3. Idempotency check — skip duplicate message IDs ────
    if (externalId) {
      const existing = await prisma.message.findFirst({
        where: { externalId },
      })
      if (existing) {
        console.info(JSON.stringify({ externalId, msg: 'Entrega duplicada de webhook — ignorando' }))
        return res.json({ success: true, data: { duplicate: true } })
      }
    }

    // ── 4. Respond immediately (202) before heavy processing ─
    // Express sends the response while we continue async processing below.
    res.status(202).json({ success: true, data: { received: true } })

    // ── 5. Upsert conversation (and optionally create lead) ──
    try {
      await prisma.$transaction(async (tx) => {
        // Find or create conversation
        let conversation = await tx.conversation.findUnique({
          where: {
            workspaceId_whatsappPhone: { workspaceId, whatsappPhone: phone },
          },
        })

        let leadId: string | null = conversation?.leadId ?? null

        if (!conversation) {
          // New contact — create a Lead if we have a default pipeline stage
          const defaultStage = workspace.pipelines[0]?.stages[0]
          if (defaultStage) {
            const lastLead = await tx.lead.findFirst({
              where: { stageId: defaultStage.id },
              orderBy: { position: 'desc' },
            })
            const position = lastLead ? lastLead.position + 1 : 0

            const lead = await tx.lead.create({
              data: {
                workspaceId,
                stageId: defaultStage.id,
                name: phone, // Will be updated when contact info is available
                phone,
                source: 'WHATSAPP',
                position,
              },
            })

            leadId = lead.id

            await tx.activity.create({
              data: {
                leadId: lead.id,
                type: 'LEAD_CREATED',
                description: 'Lead criado a partir de mensagem WhatsApp recebida',
                metadata: { phone },
              },
            })
          }

          conversation = await tx.conversation.create({
            data: {
              workspaceId,
              whatsappPhone: phone,
              leadId,
              lastMessageAt: new Date(),
            },
          })
        } else {
          // Update lastMessageAt for existing conversations
          await tx.conversation.update({
            where: { id: conversation.id },
            data: { lastMessageAt: new Date() },
          })
        }

        // Create the inbound message
        const message = await tx.message.create({
          data: {
            conversationId: conversation.id,
            direction: 'INBOUND',
            content: content || null,
            mediaUrl: data.mediaUrl,
            status: 'DELIVERED',
            externalId: externalId ?? undefined,
          },
        })

        // Log activity on the lead
        if (leadId) {
          await tx.activity.create({
            data: {
              leadId,
              type: 'MESSAGE_RECEIVED',
              description: 'Mensagem WhatsApp recebida',
              metadata: {
                messageId: message.id,
                preview: content?.slice(0, 80),
              },
            },
          })
        }
      })
    } catch (processingErr) {
      // Log error but do not re-send response (headers already sent with 202)
      console.error(
        JSON.stringify({
          err: String(processingErr),
          workspaceId,
          phone,
          msg: 'Erro ao processar payload do webhook',
        }),
      )
    }
  } catch (err) {
    // Only reached if the error occurs before res.status(202) is sent
    console.error('[POST /webhooks/whatsapp/:workspaceId]', err)
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
    }
  }
})

export { router as webhookRoutes }
