import { describe, it, expect } from 'vitest';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

function listReports(dir: string) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.startsWith('report-') && f.endsWith('.json'))
    .map(f => ({ name: f, full: path.join(dir, f), mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => a.mtime - b.mtime);
}

describe('Orquestrador de Migração (dry-run)', () => {
  it('gera relatório e logs mesmo sem TARGET_DB_URL', async () => {
    const logsDir = path.join(process.cwd(), 'migration-logs');
    const before = listReports(logsDir);
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

    await new Promise<void>((resolve, reject) => {
      const child = spawn(npmCmd, ['run', 'db:migrate:orchestrate'], {
        cwd: process.cwd(),
        env: { ...process.env, DRY_RUN: '1', TARGET_DB_URL: '', DATABASE_URL: '', SOURCE_DB_URL: '' },
        stdio: 'inherit',
        shell: true
      });
      child.on('error', reject);
      child.on('exit', () => resolve());
    });

    const after = listReports(logsDir);
    expect(after.length).toBeGreaterThanOrEqual(before.length);

    const newReports = after.filter(a => !before.find(b => b.name === a.name));
    expect(newReports.length).toBeGreaterThanOrEqual(1);

    const latest = newReports[newReports.length - 1];
    const content = JSON.parse(fs.readFileSync(latest.full, 'utf8'));
    expect(content.dryRun).toBe(true);
    expect(content.schemaApplied).toBe(false);
    expect(content.dataMigrated).toBe(false);
  }, 60000);
});
