import { prisma } from '@crm/database'
import { sendWhatsAppMessage } from '../utils/whatsapp'

/**
 * Appointment reminder job.
 *
 * Runs daily at 20:00 (scheduled by the cron index).
 * Finds all appointments scheduled for the next calendar day that:
 *   - have status SCHEDULED or CONFIRMED
 *   - have not yet had a reminder sent (reminderSentAt is null)
 *   - are linked to a lead with a phone number
 *
 * Sends a WhatsApp reminder and marks reminderSentAt.
 */
export async function runReminderJob(): Promise<void> {
  const now = new Date()

  // Window: tomorrow 00:00 → tomorrow 23:59:59
  const tomorrowStart = new Date(now)
  tomorrowStart.setDate(tomorrowStart.getDate() + 1)
  tomorrowStart.setHours(0, 0, 0, 0)

  const tomorrowEnd = new Date(tomorrowStart)
  tomorrowEnd.setHours(23, 59, 59, 999)

  const appointments = await prisma.appointment.findMany({
    where: {
      startsAt: { gte: tomorrowStart, lte: tomorrowEnd },
      status: { in: ['SCHEDULED', 'CONFIRMED'] },
      reminderSentAt: null,
      leadId: { not: null },
    },
    include: {
      lead: true,
      workspace: true,
    },
  })

  if (appointments.length === 0) {
    console.log('[ReminderJob] No appointments to remind for tomorrow.')
    return
  }

  console.log(`[ReminderJob] Sending reminders for ${appointments.length} appointment(s)`)

  for (const appt of appointments) {
    const lead = appt.lead
    const workspace = appt.workspace

    // Skip if workspace has no WhatsApp configured or lead has no phone
    if (!workspace.whatsappApiUrl || !workspace.whatsappApiKey || !lead?.phone) {
      continue
    }

    // Format time in a human-readable way (no external deps required)
    const timeStr = appt.startsAt.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: workspace.timezone,
    })

    const message =
      `Olá${lead.name ? `, ${lead.name}` : ''}! Lembrando que você tem um compromisso amanhã ` +
      `às ${timeStr}: *${appt.title}*. Confirme sua presença respondendo esta mensagem. Até logo!`

    try {
      await sendWhatsAppMessage({
        workspaceId: workspace.id,
        phone: lead.phone,
        message,
      })

      await prisma.appointment.update({
        where: { id: appt.id },
        data: { reminderSentAt: new Date() },
      })

      console.log(`[ReminderJob] Reminder sent for appointment ${appt.id} to ${lead.phone}`)
    } catch (err) {
      // Log but continue — we don't want one failure to block all others
      console.error(`[ReminderJob] Failed to send reminder for appointment ${appt.id}:`, err)
    }
  }

  console.log('[ReminderJob] Done.')
}
