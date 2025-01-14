import { pool } from '../db/connection.js';
import { CyberpunkReaction } from '../types/index.js';

export class ReactionService {
  async addReaction(postId: string, userId: string, reactionType: CyberpunkReaction): Promise<void> {
    // Check if user already has a reaction on this post
    const existingResult = await pool.query(
      'SELECT reaction_type FROM reactions WHERE post_id = $1 AND user_id = $2',
      [postId, userId]
    );

    if (existingResult.rows.length > 0) {
      const existingReaction = existingResult.rows[0].reaction_type as CyberpunkReaction;
      
      // If it's the same reaction, toggle it off (remove it)
      if (existingReaction === reactionType) {
        await this.removeReaction(postId, userId, reactionType);
        return;
      }
      
      // If it's a different reaction, remove the old one first (mutual exclusivity)
      await this.removeReaction(postId, userId, existingReaction);
    }

    // Add the new reaction
    await pool.query(
      `INSERT INTO reactions (post_id, user_id, reaction_type)
       VALUES ($1, $2, $3)
       ON CONFLICT (post_id, user_id, reaction_type) DO NOTHING`,
      [postId, userId, reactionType]
    );
  }

  async removeReaction(postId: string, userId: string, reactionType: CyberpunkReaction): Promise<void> {
    await pool.query(
      'DELETE FROM reactions WHERE post_id = $1 AND user_id = $2 AND reaction_type = $3',
      [postId, userId, reactionType]
    );
  }

  async getReactionsForPost(postId: string): Promise<{ [key in CyberpunkReaction]?: number }> {
    const result = await pool.query(
      `SELECT reaction_type, COUNT(*) as count
       FROM reactions
       WHERE post_id = $1
       GROUP BY reaction_type`,
      [postId]
    );

    const reactions: { [key in CyberpunkReaction]?: number } = {};
    result.rows.forEach((row) => {
      reactions[row.reaction_type as CyberpunkReaction] = parseInt(row.count);
    });

    return reactions;
  }

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
    result.rows.forEach((row) => {
      const postId = row.post_id;
      if (!postReactions[postId]) {
        postReactions[postId] = {};
      }
      postReactions[postId][row.reaction_type as CyberpunkReaction] = parseInt(row.count);
    });

    return postReactions;
  }
}

