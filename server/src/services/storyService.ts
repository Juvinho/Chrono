import { pool } from '../db/connection.js';
import { Story } from '../types/index.js';

export class StoryService {
  async createStory(
    userId: string,
    content: string,
    type: 'image' | 'video' | 'text'
  ): Promise<Story> {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    const result = await pool.query(
      `INSERT INTO stories (user_id, content, type, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, content, type, expiresAt]
    );

    return this.mapStoryFromDb(result.rows[0]);
  }

  async getActiveStories(currentUserId: string): Promise<any[]> {
    // Get stories that haven't expired
    // We can also filter for stories from followed users if we want, 
    // but for now let's return all active stories or follow-based logic similar to posts.
    // Let's prioritize followed users + self.
    
    const query = `
      SELECT s.*, 
             u.username as author_username, 
             u.avatar as author_avatar
      FROM stories s
      JOIN users u ON s.user_id = u.id
      WHERE s.expires_at > NOW()
      AND (
        s.user_id = $1
        OR s.user_id IN (SELECT following_id FROM follows WHERE follower_id = $1)
      )
      ORDER BY s.created_at ASC
    `;

    const result = await pool.query(query, [currentUserId]);
    return result.rows.map(row => ({
        ...this.mapStoryFromDb(row),
        author: {
            username: row.author_username,
            avatar: row.author_avatar
        }
    }));
  }
  
  async getUserStories(userId: string): Promise<Story[]> {
      const query = `
        SELECT * FROM stories 
        WHERE user_id = $1 
        AND expires_at > NOW() 
        ORDER BY created_at ASC
      `;
      const result = await pool.query(query, [userId]);
      return result.rows.map(this.mapStoryFromDb);
  }

  async viewStory(storyId: string, viewerId: string): Promise<void> {
    // Add viewerId to viewers array if not already present
    await pool.query(
      `UPDATE stories 
       SET viewers = CASE 
         WHEN viewers @> $2::jsonb THEN viewers 
         ELSE viewers || $2::jsonb 
       END
       WHERE id = $1`,
      [storyId, JSON.stringify([viewerId])]
    );
  }

  private mapStoryFromDb(row: any): Story {
    return {
      id: row.id,
      userId: row.user_id,
      content: row.content,
      type: row.type,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      viewers: row.viewers || [],
    };
  }
}
