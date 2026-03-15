import cron from 'node-cron'
import { runReminderJob } from './reminder.job'
import { runFollowUpJob } from './follow-up.job'

/**
 * Registers and starts all cron jobs.
 * Call once during server bootstrap (after DB connection is ready).
 *
 * Schedules:
 *   - Appointment reminders : every day at 20:00 (server local time)
 *   - Automation follow-ups : every 5 minutes
 */
export function startCronJobs(): void {
  // ── Appointment reminders — daily at 20:00 ──────────────────
  cron.schedule('0 20 * * *', async () => {
    console.log('[Cron] Starting reminder job...')
    try {
      await runReminderJob()
    } catch (err) {
      console.error('[Cron] Reminder job crashed unexpectedly:', err)
    }
  })

  // ── Automation follow-ups — every 5 minutes ─────────────────
  cron.schedule('*/5 * * * *', async () => {
    try {
      await runFollowUpJob()
    } catch (err) {
      console.error('[Cron] Follow-up job crashed unexpectedly:', err)
    }
  })

  console.log('[Cron] Jobs scheduled: reminder (daily 20:00), follow-up (every 5 min)')
}
