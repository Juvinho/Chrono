import { pool } from '../db/connection.js';
import { CyberpunkReaction } from '../types/index.js';
import { FollowService } from './followService.js';

const ALLOWED_REACTIONS: CyberpunkReaction[] = ['Glitch', 'Upload', 'Corrupt', 'Rewind', 'Static'];

export class ReactionService {
  /**
   * Valida permissão para reagir ao post.
   */
  async ensureCanReact(postId: string, userId: string): Promise<void> {
    const postRes = await pool.query(
      'SELECT id, author_id, is_private FROM posts WHERE id = $1',
      [postId]
    );
    if (postRes.rows.length === 0) {
      throw new Error('Post not found');
    }
    const post = postRes.rows[0];
    if (post.is_private && post.author_id !== userId) {
      const followService = new FollowService();
      const isFollowing = await followService.isFollowing(userId, post.author_id);
      if (!isFollowing) {
        throw new Error('Not authorized to react to private post');
      }
    }
  }

  /**
   * Cria/atualiza a reação do usuário ao post. Se for a mesma, alterna removendo.
   */
  async addOrToggleReaction(postId: string, userId: string, reactionType: CyberpunkReaction): Promise<'added' | 'removed' | 'updated'> {
    if (!ALLOWED_REACTIONS.includes(reactionType)) {
      throw new Error('Invalid reaction type');
    }

    await this.ensureCanReact(postId, userId);

    const existingResult = await pool.query(
      'SELECT reaction_type FROM reactions WHERE post_id = $1 AND user_id = $2',
      [postId, userId]
    );

    if (existingResult.rows.length > 0) {
      const existingReaction = existingResult.rows[0].reaction_type as CyberpunkReaction;
      if (existingReaction === reactionType) {
        await this.removeReaction(postId, userId);
        return 'removed';
      }
      await pool.query(
        'UPDATE reactions SET reaction_type = $3 WHERE post_id = $1 AND user_id = $2',
        [postId, userId, reactionType]
      );
      return 'updated';
    }

    await pool.query(
      `INSERT INTO reactions (post_id, user_id, reaction_type)
       VALUES ($1, $2, $3)
       ON CONFLICT (post_id, user_id) DO UPDATE SET reaction_type = EXCLUDED.reaction_type`,
      [postId, userId, reactionType]
    );
    return 'added';
  }

  /**
   * Remove a reação atual do usuário ao post.
   */
  async removeReaction(postId: string, userId: string): Promise<void> {
    await pool.query(
      'DELETE FROM reactions WHERE post_id = $1 AND user_id = $2',
      [postId, userId]
    );
  }

  /**
   * Retorna contagens por tipo de reação para um post.
   */
  async getReactionsForPost(postId: string): Promise<{ [key in CyberpunkReaction]?: number }> {
    const result = await pool.query(
      `SELECT reaction_type, COUNT(*) as count
       FROM reactions
       WHERE post_id = $1
       GROUP BY reaction_type`,
      [postId]
    );
    const reactions: { [key in CyberpunkReaction]?: number } = {};
    for (const row of result.rows) {
      reactions[row.reaction_type as CyberpunkReaction] = parseInt(row.count);
    }
    return reactions;
  }

  /**
   * Retorna a reação do usuário para um post (se houver).
   */
  async getUserReaction(postId: string, userId: string): Promise<CyberpunkReaction | null> {
    const res = await pool.query(
      'SELECT reaction_type FROM reactions WHERE post_id = $1 AND user_id = $2',
      [postId, userId]
    );
    if (res.rows.length === 0) return null;
    return res.rows[0].reaction_type as CyberpunkReaction;
  }

  /**
   * Retorna contagens de reações para múltiplos posts.
   */
  async getReactionsForPosts(postIds: string[]): Promise<{ [postId: string]: { [key in CyberpunkReaction]?: number } }> {
    if (postIds.length === 0) return {};
    const result = await pool.query(
      `SELECT post_id, reaction_type, COUNT(*) as count
       FROM reactions
       WHERE post_id = ANY($1)
       GROUP BY post_id, reaction_type`,
      [postIds]
    );
    const postReactions: { [postId: string]: { [key in CyberpunkReaction]?: number } } = {};
    for (const row of result.rows) {
      const pid = row.post_id as string;
      if (!postReactions[pid]) postReactions[pid] = {};
      postReactions[pid][row.reaction_type as CyberpunkReaction] = parseInt(row.count);
    }
    return postReactions;
  }
}

