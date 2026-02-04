import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock DB connection
const queries: any[] = [];
const rowsByQuery: Record<string, any[]> = {};

vi.mock('../db/connection.js', () => {
  return {
    pool: {
      query: (sql: string, params?: any[]) => {
        queries.push({ sql, params });
        // Very naive SQL matcher for tests
        if (sql.includes('SELECT reaction_type FROM reactions')) {
          return Promise.resolve({ rows: rowsByQuery['select_reaction'] || [] });
        }
        if (sql.includes('DELETE FROM reactions')) {
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes('UPDATE reactions')) {
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes('INSERT INTO reactions')) {
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes('SELECT id, author_id, is_private FROM posts')) {
          return Promise.resolve({ rows: rowsByQuery['select_post'] || [{ id: 'p1', author_id: 'author', is_private: false }] });
        }
        if (sql.includes('SELECT following_id FROM follows')) {
          return Promise.resolve({ rows: rowsByQuery['select_follow'] || [] });
        }
        return Promise.resolve({ rows: [] });
      },
    },
  };
});

import { ReactionService } from '../services/reactionService.js';

describe('ReactionService', () => {
  beforeEach(() => {
    queries.length = 0;
    rowsByQuery['select_post'] = [{ id: 'p1', author_id: 'author', is_private: false }];
    rowsByQuery['select_follow'] = [];
  });

  it('adds reaction when none exists', async () => {
    rowsByQuery['select_reaction'] = [];
    const service = new ReactionService();
    const result = await service.addOrToggleReaction('p1', 'u1', 'Glitch');
    expect(result).toBe('added');
    const lastInsert = queries.find(q => q.sql.includes('INSERT INTO reactions'));
    expect(lastInsert).toBeTruthy();
  });

  it('removes reaction when same exists', async () => {
    rowsByQuery['select_reaction'] = [{ reaction_type: 'Glitch' }];
    const service = new ReactionService();
    const result = await service.addOrToggleReaction('p1', 'u1', 'Glitch');
    expect(result).toBe('removed');
    const del = queries.find(q => q.sql.includes('DELETE FROM reactions'));
    expect(del).toBeTruthy();
  });

  it('updates reaction when different exists', async () => {
    rowsByQuery['select_reaction'] = [{ reaction_type: 'Upload' }];
    const service = new ReactionService();
    const result = await service.addOrToggleReaction('p1', 'u1', 'Glitch');
    expect(result).toBe('updated');
    const upd = queries.find(q => q.sql.includes('UPDATE reactions'));
    expect(upd).toBeTruthy();
  });
});
