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
      `SELECT * FROM posts WHERE thread_id = $1 ORDER BY created_at ASC LIMIT $2`,
      [threadId, limit]
    );
    return res.rows.map(postService.mapPostFromDb);
  }

  /**
   * Calcula a duração de um thread em formato legível
   * Ex: "4 dias", "2 horas", "30 minutos"
   */
  async calculateThreadDuration(threadId: string): Promise<string> {
    try {
      const res = await pool.query(
        `SELECT 
          MIN(created_at) as first_post_date,
          MAX(created_at) as last_post_date
         FROM posts 
         WHERE thread_id = $1`,
        [threadId]
      );

      if (!res.rows[0] || !res.rows[0].first_post_date) {
        return 'Aguardando posts';
      }

      const firstDate = new Date(res.rows[0].first_post_date);
      const lastDate = new Date(res.rows[0].last_post_date);

      // Calcular diferença em milisegundos
      const diffMs = lastDate.getTime() - firstDate.getTime();
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);
      const diffMonths = Math.floor(diffDays / 30);
      const diffYears = Math.floor(diffDays / 365);

      // Retornar formato legível
      if (diffYears > 0) return diffYears === 1 ? '1 ano' : `${diffYears} anos`;
      if (diffMonths > 0) return diffMonths === 1 ? '1 mês' : `${diffMonths} meses`;
      if (diffDays > 0) return diffDays === 1 ? '1 dia' : `${diffDays} dias`;
      if (diffHours > 0) return diffHours === 1 ? '1 hora' : `${diffHours} horas`;
      if (diffMinutes > 0) return diffMinutes === 1 ? '1 minuto' : `${diffMinutes} minutos`;
      
      return 'Hoje';
    } catch (error) {
      console.error(`[Thread Duration] Erro ao calcular duração:`, error);
      return 'Duração desconhecida';
    }
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

