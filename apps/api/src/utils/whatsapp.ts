import { prisma } from '@crm/database'

interface SendWhatsAppMessageOptions {
  workspaceId: string
  phone: string
  message: string
  mediaUrl?: string
}

interface WhatsAppApiPayload {
  phone: string
  message: string
  mediaUrl?: string
}

/**
 * Sends a WhatsApp message using the workspace's configured unofficial API.
 * The workspace must have `whatsappApiUrl` and `whatsappApiKey` set.
 *
 * Returns the external message ID on success, or throws on failure.
 */
export async function sendWhatsAppMessage({
  workspaceId,
  phone,
  message,
  mediaUrl,
}: SendWhatsAppMessageOptions): Promise<string | null> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { whatsappApiUrl: true, whatsappApiKey: true },
  })

  if (!workspace?.whatsappApiUrl || !workspace?.whatsappApiKey) {
    throw new Error(
      `Workspace ${workspaceId} does not have WhatsApp API configured`,
    )
  }

  const payload: WhatsAppApiPayload = { phone, message }
  if (mediaUrl) payload.mediaUrl = mediaUrl

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fetchRes: any = await fetch(`${workspace.whatsappApiUrl}/send-message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${workspace.whatsappApiKey}`,
    },
    body: JSON.stringify(payload),
  })

  if (!fetchRes.ok) {
    const body = await fetchRes.text()
    throw new Error(
      `WhatsApp API error (${fetchRes.status}): ${body}`,
    )
  }

  const data = fetchRes.json() as { id?: string; messageId?: string }
  // Normalize different API response shapes — unofficial APIs vary
  return data.id ?? data.messageId ?? null
}
