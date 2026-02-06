import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const dbUrl = process.env.DATABASE_URL || '';
const outDir = path.resolve(process.cwd(), 'backups');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outFile = path.join(outDir, `backup-${timestamp}.sql`);

function runBackup() {
  if (!dbUrl) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }
  const cmd = `pg_dump "${dbUrl}" -Fc -f "${outFile}"`;
  exec(cmd, (err, stdout, stderr) => {
    if (err) {
      console.error('Backup failed:', err, stderr);
      process.exit(1);
    }
    console.log('Backup completed:', outFile);
    process.exit(0);
  });
}

runBackup();
