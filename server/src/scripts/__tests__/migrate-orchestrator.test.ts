import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { main } from '../migrate-orchestrator.js';

describe('migrate-orchestrator', () => {
  it('executa em dry-run e gera relatório e logs', async () => {
    process.env.ORCHESTRATOR_DRY_RUN = '1';
    delete process.env.TARGET_DB_URL;
    delete process.env.DATABASE_URL;
    const before = fs.readdirSync(path.join(process.cwd(), 'migration-logs')).length;
    await main();
    const files = fs.readdirSync(path.join(process.cwd(), 'migration-logs'));
    expect(files.length).toBeGreaterThanOrEqual(before + 1);
    const hasReport = files.some(f => f.startsWith('report-') && f.endsWith('.json'));
    const hasLog = files.some(f => f.startsWith('migration-') && f.endsWith('.log'));
    expect(hasReport).toBe(true);
    expect(hasLog).toBe(true);
  });
});
