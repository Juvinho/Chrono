import { pool } from '../db/connection.js';
import { Thread } from '../types/index.js';
import { PostService } from './postService.js';

export class ThreadService {
  async createThread(creatorId: string, title: string, description?: string): Promise<Thread> {
    const result = await pool.query(
      `INSERT INTO threads (title, description, creator_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [title, description || null, creatorId]
    );
    return this.mapThread(result.rows[0]);
  }

  async getThreadById(id: string): Promise<Thread | null> {
    const res = await pool.query('SELECT * FROM threads WHERE id = $1', [id]);
    return res.rows[0] ? this.mapThread(res.rows[0]) : null;
  }

  async updateThread(
    threadId: string,
    updates: { title?: string; description?: string; status?: 'active' | 'archived' }
  ): Promise<Thread> {
    const sets: string[] = [];
    const params: any[] = [];
    let i = 1;

    if (updates.title !== undefined) {
      sets.push(`title = $${i++}`); params.push(updates.title);
    }
    if (updates.description !== undefined) {
      sets.push(`description = $${i++}`); params.push(updates.description);
    }
    if (updates.status !== undefined) {
      sets.push(`status = $${i++}`); params.push(updates.status);
    }
    if (sets.length === 0) {
      const t = await this.getThreadById(threadId);
      if (!t) throw new Error('Thread not found');
      return t;
    }
    params.push(threadId);
    const res = await pool.query(
      `UPDATE threads SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${i} RETURNING *`,
      params
    );
    return this.mapThread(res.rows[0]);
  }

  async linkPostToThread(postId: string, threadId: string): Promise<void> {
    await pool.query(
      `UPDATE posts SET thread_id = $1 WHERE id = $2`,
      [threadId, postId]
    );
  }

  async getPostsInThread(threadId: string, limit = 50): Promise<any[]> {
    const postService = new PostService();
    const res = await pool.query(
      `SELECT * FROM posts WHERE thread_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [threadId, limit]
    );
    return res.rows.map(postService.mapPostFromDb);
  }

  async archiveInactiveThreads(cutoffDays = 90): Promise<number> {
    const res = await pool.query(
      `SELECT archive_threads($1) AS archived_count`,
      [cutoffDays]
    );
    return res.rows[0]?.archived_count || 0;
  }

  private mapThread(row: any): Thread {
    return {
      id: row.id,
      title: row.title,
      description: row.description || undefined,
      status: row.status,
      creatorId: row.creator_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      archivedAt: row.archived_at,
    };
  }
}

