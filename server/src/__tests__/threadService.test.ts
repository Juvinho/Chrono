import { describe, it, expect, vi, beforeEach } from 'vitest';

const queries: any[] = [];
let rowsByQuery: Record<string, any[]> = {};

vi.mock('../db/connection.js', () => {
  return {
    pool: {
      query: (sql: string, params?: any[]) => {
        queries.push({ sql, params });
        if (sql.includes('INSERT INTO threads')) {
          const row = {
            id: 't1',
            title: params?.[0],
            description: params?.[1],
            status: 'active',
            creator_id: params?.[2],
            created_at: new Date(),
            updated_at: new Date(),
            archived_at: null
          };
          return Promise.resolve({ rows: [row] });
        }
        if (sql.startsWith('SELECT * FROM threads WHERE id')) {
          return Promise.resolve({ rows: rowsByQuery['get_thread'] || [] });
        }
        if (sql.includes('UPDATE threads SET')) {
          const threadId = params?.[params.length - 1] || 't1';
          const maybeStatus = typeof params?.[0] === 'string' ? params?.[0] : 'active';
          const updated = {
            id: threadId,
            title: 'Title',
            description: null,
            status: maybeStatus,
            creator_id: 'u1',
            created_at: new Date(),
            updated_at: new Date(),
            archived_at: null
          };
          return Promise.resolve({ rows: [updated] });
        }
        if (sql.includes('UPDATE posts SET thread_id')) {
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes('SELECT * FROM posts WHERE thread_id')) {
          return Promise.resolve({ rows: rowsByQuery['posts_in_thread'] || [] });
        }
        if (sql.includes('SELECT archive_threads')) {
          return Promise.resolve({ rows: [{ archived_count: 3 }] });
        }
        return Promise.resolve({ rows: [] });
      }
    }
  }
});

import { ThreadService } from '../services/threadService.js';

describe('ThreadService', () => {
  beforeEach(() => {
    queries.length = 0;
    rowsByQuery = {};
  });

  it('creates a thread', async () => {
    const svc = new ThreadService();
    const t = await svc.createThread('u1', 'Cordão X', 'Desc');
    expect(t.id).toBe('t1');
    expect(t.title).toBe('Cordão X');
    const q = queries.find(q => q.sql.includes('INSERT INTO threads'));
    expect(q).toBeTruthy();
  });

  it('updates a thread status', async () => {
    const svc = new ThreadService();
    const t = await svc.updateThread('t1', { status: 'archived' });
    expect(t.status).toBe('archived');
    const q = queries.find(q => q.sql.includes('UPDATE threads SET'));
    expect(q).toBeTruthy();
  });

  it('links a post to a thread', async () => {
    const svc = new ThreadService();
    await svc.linkPostToThread('p1', 't1');
    const q = queries.find(q => q.sql.includes('UPDATE posts SET thread_id'));
    expect(q).toBeTruthy();
    expect(q?.params).toEqual(['t1', 'p1']);
  });

  it('archives inactive threads via procedure', async () => {
    const svc = new ThreadService();
    const count = await svc.archiveInactiveThreads(90);
    expect(count).toBe(3);
    const q = queries.find(q => q.sql.includes('SELECT archive_threads'));
    expect(q).toBeTruthy();
  });
});
