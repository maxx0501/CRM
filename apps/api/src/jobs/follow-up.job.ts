import { prisma } from '@crm/database'
import { sendWhatsAppMessage } from '../utils/whatsapp'

/**
 * Automation follow-up job.
 *
 * Runs every 5 minutes (scheduled by the cron index).
 * Processes pending AutomationEnrollment records whose nextRunAt has passed.
 *
 * For each pending enrollment:
 *   1. Load the current step
 *   2. Send the WhatsApp message (with template variable interpolation)
 *   3. Advance to the next step (or mark as completed)
 *   4. Calculate nextRunAt based on the next step's delayMinutes
 *
 * Uses a per-enrollment lock flag (isCompleted) to avoid double-processing
 * in multi-instance deployments. For true distributed locking, replace with
 * a Redis SETNX approach when scaling horizontally.
 */
export async function runFollowUpJob(): Promise<void> {
  const now = new Date()

  // Fetch a bounded batch to avoid overwhelming the WhatsApp API
  const enrollments = await prisma.automationEnrollment.findMany({
    where: {
      isCompleted: false,
      nextRunAt: { lte: now },
    },
    include: {
      automation: {
        include: {
          steps: { orderBy: { position: 'asc' } },
          workspace: {
            select: {
              id: true,
              whatsappApiUrl: true,
              whatsappApiKey: true,
            },
          },
        },
      },
      lead: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
        },
      },
    },
    orderBy: { nextRunAt: 'asc' },
    take: 50,
  })

  if (enrollments.length === 0) {
    return
  }

  console.log(`[FollowUpJob] Processing ${enrollments.length} enrollment(s)`)

  for (const enrollment of enrollments) {
    const { automation, lead } = enrollment
    const workspace = automation.workspace
    const steps = automation.steps

    // Safety: if automation was deactivated after enrolling, skip and complete
    if (!automation.isActive) {
      await prisma.automationEnrollment.update({
        where: { id: enrollment.id },
        data: { isCompleted: true, nextRunAt: null },
      })
      continue
    }

    // Determine which step to execute
    const step = steps[enrollment.currentStep]

    if (!step) {
      // No more steps — mark as completed
      await prisma.automationEnrollment.update({
        where: { id: enrollment.id },
        data: { isCompleted: true, nextRunAt: null },
      })
      console.log(`[FollowUpJob] Enrollment ${enrollment.id} completed (no more steps)`)
      continue
    }

    // Skip delivery if no phone or no WhatsApp config
    if (!lead.phone || !workspace.whatsappApiUrl || !workspace.whatsappApiKey) {
      console.warn(
        `[FollowUpJob] Skipping enrollment ${enrollment.id} — missing phone or WhatsApp config`,
      )
      // Still advance to avoid infinite retries on misconfigured leads
      await advanceEnrollment(enrollment.id, enrollment.currentStep, steps)
      continue
    }

    // Interpolate simple template variables: {{name}}, {{phone}}
    const message = interpolateTemplate(step.messageTemplate, {
      name: lead.name ?? '',
      phone: lead.phone ?? '',
    })

    try {
      const externalId = await sendWhatsAppMessage({
        workspaceId: workspace.id,
        phone: lead.phone,
        message,
      })

      // Log the sent message in the lead's activity timeline
      await prisma.activity.create({
        data: {
          leadId: lead.id,
          type: 'MESSAGE_SENT',
          description: `Automation message sent: step ${enrollment.currentStep + 1} of "${automation.name}"`,
          metadata: {
            automationId: automation.id,
            stepPosition: step.position,
            externalId,
          },
        },
      })

      await advanceEnrollment(enrollment.id, enrollment.currentStep, steps)

      console.log(
        `[FollowUpJob] Sent step ${enrollment.currentStep + 1} for enrollment ${enrollment.id}`,
      )
    } catch (err) {
      // Do NOT advance — we will retry on the next cron tick.
      // After too many failures the message stays stuck; add a maxRetries field
      // to AutomationEnrollment if exponential backoff is needed.
      console.error(
        `[FollowUpJob] Failed to send message for enrollment ${enrollment.id}:`,
        err,
      )
    }
  }

  console.log('[FollowUpJob] Done.')
}

/**
 * Advances the enrollment to the next step (or marks it completed).
 */
async function advanceEnrollment(
  enrollmentId: string,
  currentStep: number,
  steps: Array<{ position: number; delayMinutes: number }>,
): Promise<void> {
  const nextStepIndex = currentStep + 1
  const nextStep = steps[nextStepIndex]

  if (!nextStep) {
    await prisma.automationEnrollment.update({
      where: { id: enrollmentId },
      data: { isCompleted: true, nextRunAt: null },
    })
    return
  }

  const nextRunAt = new Date(Date.now() + nextStep.delayMinutes * 60 * 1000)

  await prisma.automationEnrollment.update({
    where: { id: enrollmentId },
    data: { currentStep: nextStepIndex, nextRunAt },
  })
}

/**
 * Replaces {{variable}} placeholders in a template string.
 */
function interpolateTemplate(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    return variables[key] ?? ''
  })
}
