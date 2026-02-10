import { pool } from '../db/connection.js';

export interface TrendingCord {
  tag: string;
  displayName: string;
  mentions: number;
  score: number;
  day: string; // YYYY-MM-DD
}

export interface TrendingThread {
  id: string;
  content: string;
  authorUsername: string;
  authorAvatar: string;
  likes: number;
  replies: number;
  views: number;
  score: number;
  createdAt: Date;
}

export class TrendingService {
  /**
   * Calcula cordões trending apenas das últimas 24 horas (não apenas do dia atual)
   * Ordenado por número de menções
   */
  async getTrendingCordoesForToday(): Promise<TrendingCord[]> {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const result = await pool.query(
      `SELECT 
        (regexp_matches(content, '\\$([A-Za-z0-9_]+)', 'g'))[1] as tag,
        COUNT(*) as mentions,
        CURRENT_DATE::text as day
      FROM posts
      WHERE content ~ '\\$[A-Za-z0-9_]+'
        AND created_at >= $1
        AND created_at <= $2
      GROUP BY tag
      ORDER BY mentions DESC
      LIMIT 20`,
      [last24Hours, now]
    );

    return result.rows.map(row => ({
      tag: row.tag,
      mentions: parseInt(row.mentions, 10),
      displayName: `$${row.tag}`,
      score: parseInt(row.mentions, 10), // For now, just use mentions
      day: row.day,
    }));
  }

  /**
   * Calcula threads trending das últimas 24 horas baseado em:
   * - Número de reações (peso: 1 ponto cada)
   * - Número de replies (peso: 2 pontos cada)
   * - Views (sem implementação atual, pode adicionar depois)
   */
  async getTrendingThreadsForToday(): Promise<TrendingThread[]> {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const result = await pool.query(
      `SELECT 
        p.id,
        p.content,
        u.username as author_username,
        u.avatar as author_avatar,
        COALESCE(COUNT(DISTINCT r.id), 0) as likes,
        COALESCE(COUNT(DISTINCT replies.id), 0) as replies,
        COALESCE(p.view_count, 0) as views,
        p.created_at,
        -- Score calculation: likes * 1 + replies * 2
        (COALESCE(COUNT(DISTINCT r.id), 0) * 1 + COALESCE(COUNT(DISTINCT replies.id), 0) * 2) as score
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN reactions r ON p.id = r.post_id
      LEFT JOIN posts replies ON p.id = replies.in_reply_to_id
      WHERE p.created_at >= $1
        AND p.created_at <= $2
        AND p.is_thread = false
        AND p.is_private = false
      GROUP BY p.id, p.content, u.username, u.avatar, p.view_count, p.created_at
      HAVING (COALESCE(COUNT(DISTINCT r.id), 0) > 0 OR COALESCE(COUNT(DISTINCT replies.id), 0) > 0)
      ORDER BY score DESC, p.created_at DESC
      LIMIT 20`,
      [last24Hours, now]
    );

    return result.rows.map(row => ({
      id: row.id,
      content: row.content,
      authorUsername: row.author_username,
      authorAvatar: row.author_avatar,
      likes: parseInt(row.likes, 10),
      replies: parseInt(row.replies, 10),
      views: parseInt(row.views, 10),
      score: parseInt(row.score, 10),
      createdAt: new Date(row.created_at),
    }));
  }

  /**
   * Calcula trending de cordões dentro de um período customizado
   * Útil para trending por hora, week, etc.
   */
  async getTrendingCordoesInTimeRange(
    startDate: Date,
    endDate: Date
  ): Promise<TrendingCord[]> {
    const result = await pool.query(
      `SELECT 
        (regexp_matches(content, '\\$([A-Za-z0-9_]+)', 'g'))[1] as tag,
        COUNT(*) as mentions,
        $3::text as day
      FROM posts
      WHERE content ~ '\\$[A-Za-z0-9_]+'
        AND created_at >= $1
        AND created_at <= $2
      GROUP BY tag
      ORDER BY mentions DESC
      LIMIT 20`,
      [startDate, endDate, startDate.toISOString().split('T')[0]]
    );

    return result.rows.map(row => ({
      tag: row.tag,
      mentions: parseInt(row.mentions, 10),
      displayName: `$${row.tag}`,
      score: parseInt(row.mentions, 10),
      day: row.day,
    }));
  }

  /**
   * Verifica se é um novo dia e reseta o cache de trending
   * Pode ser usado em um cronjob ou chamado manualmente
   */
  async checkAndResetTrendingForNewDay(): Promise<boolean> {
    // Obter última hora computada
    const lastResult = await pool.query(
      `SELECT MAX(created_at)::date as last_date FROM posts`
    );
    
    if (!lastResult.rows[0]?.last_date) {
      return false;
    }

    const lastDate = new Date(lastResult.rows[0].last_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    lastDate.setHours(0, 0, 0, 0);

    return lastDate < today; // True se mudou de dia
  }
}

export const trendingService = new TrendingService();
