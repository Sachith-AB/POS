import cron from 'node-cron';
import { runDailySummaryJob } from './dailySummaryJob.js';
import { runBackupJob } from './backupJob.js';
import { checkOverduePlans } from './installmentService.js';

export function initJobRunner() {
  console.log('[Job Runner] Initializing background tasks scheduler...');

  // 1. Daily Summary Job (Default: 9 PM)
  const summaryCron = process.env.DAILY_SUMMARY_CRON || '0 21 * * *';
  cron.schedule(summaryCron, async () => {
    console.log('[Job Runner] Starting Daily Summary Job execution...');
    try {
      await runDailySummaryJob();
      console.log('[Job Runner] Daily Summary Job completed successfully.');
    } catch (err) {
      console.error('[Job Runner Error] Daily Summary Job failed:', err);
    }
  });
  console.log(`[Job Runner] Scheduled Daily Summary Job: "${summaryCron}"`);

  // 2. Database Backup Job (Default: 2 AM)
  const backupCron = process.env.BACKUP_CRON || '0 2 * * *';
  cron.schedule(backupCron, async () => {
    console.log('[Job Runner] Starting Automatic Backup Job execution...');
    try {
      await runBackupJob();
      console.log('[Job Runner] Automatic Backup Job completed successfully.');
    } catch (err) {
      console.error('[Job Runner Error] Automatic Backup Job failed:', err);
    }
  });
  console.log(`[Job Runner] Scheduled Database Backup Job: "${backupCron}"`);

  // 3. Check Overdue Installments Job (Default: 1 AM)
  cron.schedule('0 1 * * *', async () => {
    console.log('[Job Runner] Checking for overdue installment plans...');
    try {
      const updated = await checkOverduePlans();
      console.log(`[Job Runner] Overdue installments check finished. Marked ${updated} plans as overdue.`);
    } catch (err) {
      console.error('[Job Runner Error] Overdue installments check failed:', err);
    }
  });
  console.log('[Job Runner] Scheduled Overdue Installments Check: "0 1 * * *"');
}
