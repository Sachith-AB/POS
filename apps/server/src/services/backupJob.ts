import { exec } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { prisma } from '../lib/prisma.js';

export async function runBackupJob(): Promise<void> {
  const backupsDir = process.env.BACKUPS_DIR || './backups';
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const outFile = path.resolve(path.join(backupsDir, `pos-backup-${stamp}.sql`));
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('[Backup Job] DATABASE_URL env variable not found.');
    return;
  }

  // Create outbox tracking entry
  const outboxEntry = await prisma.outbox.create({
    data: {
      type: 'BACKUP',
      status: 'PENDING',
      payloadJson: { filename: path.basename(outFile), localPath: outFile },
    },
  });

  const cmd = `pg_dump "${databaseUrl}" > "${outFile}"`;
  
  exec(cmd, async (error, stdout, stderr) => {
    if (error) {
      console.error('[Backup Job Error] Database pg_dump failed:', error, stderr);
      await prisma.outbox.update({
        where: { id: outboxEntry.id },
        data: { status: 'FAILED', attempts: 1 },
      });
      return;
    }

    console.log(`[Backup Job] Backup written locally to: ${outFile}`);

    // Prune old backups (keep only last N days)
    const retentionDays = Number(process.env.BACKUP_RETENTION_DAYS || 7);
    try {
      const files = fs.readdirSync(backupsDir);
      const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
      for (const file of files) {
        if (file.startsWith('pos-backup-') && file.endsWith('.sql')) {
          const filePath = path.join(backupsDir, file);
          const stat = fs.statSync(filePath);
          if (stat.mtimeMs < cutoff) {
            fs.unlinkSync(filePath);
            console.log(`[Backup Job] Pruned old backup file: ${file}`);
          }
        }
      }
    } catch (pruneErr) {
      console.error('[Backup Job Error] Pruning old files failed:', pruneErr);
    }

    // Sync to remote VPS if host configured
    const vpsHost = process.env.VPS_BACKUP_HOST;
    const vpsKey = process.env.VPS_BACKUP_SSH_KEY;

    if (vpsHost) {
      console.log(`[Backup Job] Uploading backup to remote VPS host: ${vpsHost}...`);
      const keyArg = vpsKey ? `-i "${vpsKey}"` : '';
      // Disable prompt for host confirmation
      const scpCmd = `scp -o StrictHostKeyChecking=no ${keyArg} "${outFile}" "${vpsHost}"`;
      
      exec(scpCmd, async (scpErr, scpStdout, scpStderr) => {
        if (scpErr) {
          console.error('[Backup Job Error] VPS sync upload failed:', scpErr, scpStderr);
          await prisma.outbox.update({
            where: { id: outboxEntry.id },
            data: { status: 'FAILED', attempts: 1 },
          });
        } else {
          console.log('[Backup Job] VPS sync upload completed successfully.');
          await prisma.outbox.update({
            where: { id: outboxEntry.id },
            data: { status: 'SENT', attempts: 1 },
          });
        }
      });
    } else {
      // Local backup only
      await prisma.outbox.update({
        where: { id: outboxEntry.id },
        data: { status: 'SENT', attempts: 1 },
      });
    }
  });
}
