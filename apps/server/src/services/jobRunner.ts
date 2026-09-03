import cron from 'node-cron';
import { runDailySummaryJob } from './dailySummaryJob.js';
import { runBackupJob } from './backupJob.js';
import { checkOverduePlans } from './installmentService.js';
import { logger } from '../lib/logger.js';

export function initJobRunner() {
  logger.info('CRON', 'Initializing background task schedulers...');

  // 1. Daily Summary Job (Default: 9 PM)
  const summaryCron = process.env.DAILY_SUMMARY_CRON || '0 21 * * *';
  cron.schedule(summaryCron, async () => {
    logger.info('CRON', 'Executing Daily Summary Job...');
    try {
      await runDailySummaryJob();
      logger.success('CRON', 'Daily Summary Job completed successfully.');
    } catch (err) {
      logger.error('CRON', 'Daily Summary Job failed:', err);
    }
  });
  logger.debug('CRON', `Scheduled Daily Summary Job: "${summaryCron}"`);

  // 2. Database Backup Job (Default: 2 AM)
  const backupCron = process.env.BACKUP_CRON || '0 2 * * *';
  cron.schedule(backupCron, async () => {
    logger.info('CRON', 'Executing Automatic Database Backup Job...');
    try {
      await runBackupJob();
      logger.success('CRON', 'Automatic Database Backup Job completed successfully.');
    } catch (err) {
      logger.error('CRON', 'Automatic Database Backup Job failed:', err);
    }
  });
  logger.debug('CRON', `Scheduled Database Backup Job: "${backupCron}"`);

  // 3. Check Overdue Installments Job (Default: 1 AM)
  cron.schedule('0 1 * * *', async () => {
    logger.info('CRON', 'Scanning for overdue installment plans...');
    try {
      const updated = await checkOverduePlans();
      logger.success('CRON', `Overdue installment scan finished. Marked ${updated} plans as overdue.`);
    } catch (err) {
      logger.error('CRON', 'Overdue installments scan failed:', err);
    }
  });
  logger.debug('CRON', 'Scheduled Overdue Installments Check: "0 1 * * *"');

  // 4. Check Uncollected Repairs (30 Days Reminder) Job (Default: 10 AM)
  cron.schedule('0 10 * * *', async () => {
    logger.info('CRON', 'Scanning for uncollected repaired devices...');
    try {
      const { checkUncollectedRepairs } = await import('./repairNotificationJob.js');
      const count = await checkUncollectedRepairs();
      logger.success('CRON', `Uncollected repair scan finished. Dispatched ${count} reminder SMS messages.`);
    } catch (err) {
      logger.error('CRON', 'Uncollected repair scan failed:', err);
    }
  });
  logger.debug('CRON', 'Scheduled Uncollected Repairs Check: "0 10 * * *"');
}
