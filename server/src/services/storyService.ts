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
    // 1. Get all active stories for user + followed users
    // 2. Group by user
    // 3. Determine if user has unseen stories relative to currentUserId
    // 4. Sort: Unseen first, then Seen. Within those groups, maybe by latest story?
    
    // Note: 'viewers' is a JSONB array of user IDs who have seen the story.
    
    const query = `
      WITH relevant_users AS (
        SELECT id, username, avatar 
        FROM users 
        WHERE id = $1 
        OR id IN (SELECT following_id FROM follows WHERE follower_id = $1)
      ),
      active_stories AS (
        SELECT s.*
        FROM stories s
        WHERE s.expires_at > NOW()
        AND s.user_id IN (SELECT id FROM relevant_users)
      )
      SELECT 
        u.id as user_id,
        u.username,
        u.avatar,
        json_agg(
          json_build_object(
            'id', s.id,
            'userId', s.user_id,
            'content', s.content,
            'type', s.type,
            'createdAt', s.created_at,
            'expiresAt', s.expires_at,
            'viewers', s.viewers
          ) ORDER BY s.created_at ASC
        ) as stories
      FROM relevant_users u
      JOIN active_stories s ON s.user_id = u.id
      GROUP BY u.id, u.username, u.avatar
    `;

    const result = await pool.query(query, [currentUserId]);
    
    // Process results to add 'hasUnseenStories' flag and sort
    const processedUsers = result.rows.map((row: any) => {
        const stories = row.stories || [];
        // Check if ANY story has NOT been viewed by currentUserId
        // 'viewers' is a JSON array of strings (IDs)
        const hasUnseenStories = stories.some((story: any) => {
            const viewers = story.viewers || [];
            return !viewers.includes(currentUserId);
        });
        
        return {
            id: row.user_id, // Map for frontend which might expect 'id' or 'userId'
            userId: row.user_id,
            username: row.username,
            avatar: row.avatar,
            hasUnseenStories,
            stories: stories.map((s: any) => ({
                ...s,
                createdAt: s.createdAt, // Ensure date objects if needed, pg driver usually handles
                expiresAt: s.expiresAt
            }))
        };
    });

    // Sort: Users with unseen stories first
    processedUsers.sort((a: any, b: any) => {
        if (a.hasUnseenStories === b.hasUnseenStories) {
            return 0; // Maintain DB order or add secondary sort
        }
        return a.hasUnseenStories ? -1 : 1;
    });

    return processedUsers;
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
