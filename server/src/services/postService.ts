import { pool } from '../db/connection.js';
import { Post } from '../types/index.js';
import { UserService } from './userService.js';

export class PostService {
  private userService = new UserService();

  async createPost(
    authorId: string,
    content: string,
    options?: {
      imageUrl?: string;
      videoUrl?: string;
      isThread?: boolean;
      isPrivate?: boolean;
      inReplyToId?: string;
      repostOfId?: string;
      pollOptions?: { option: string; votes: number }[];
      pollEndsAt?: Date;
      unlockAt?: Date;
    }
  ): Promise<Post> {
    const result = await pool.query(
      `INSERT INTO posts (author_id, content, image_url, video_url, is_thread, is_private, 
                         in_reply_to_id, repost_of_id, poll_options, poll_ends_at, unlock_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11)
       RETURNING *`,
      [
        authorId,
        content,
        options?.imageUrl || null,
        options?.videoUrl || null,
        options?.isThread || false,
        options?.isPrivate || false,
        options?.inReplyToId || null,
        options?.repostOfId || null,
        options?.pollOptions ? JSON.stringify(options.pollOptions) : null,
        options?.pollEndsAt || null,
        options?.unlockAt || null,
      ]
    );

    return this.mapPostFromDb(result.rows[0]);
  }

  async getPostById(id: string): Promise<Post | null> {
    const result = await pool.query('SELECT * FROM posts WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    return this.mapPostFromDb(result.rows[0]);
  }

  async getPosts(
    userId?: string,
    options?: {
      limit?: number;
      offset?: number;
      authorId?: string;
      inReplyToId?: string | null; // null means top-level posts only
    }
  ): Promise<any[]> {
    let query = `
      SELECT p.*, 
             u.username as author_username, u.avatar as author_avatar, u.is_verified as author_is_verified,
             u.verification_badge_label, u.verification_badge_color,
             up.bio as author_bio
      FROM posts p
      JOIN users u ON p.author_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (options?.authorId) {
      query += ` AND p.author_id = $${paramIndex++}`;
      params.push(options.authorId);
    }

    if (options?.inReplyToId !== undefined) {
      if (options.inReplyToId === null) {
        query += ` AND p.in_reply_to_id IS NULL`;
      } else {
        query += ` AND p.in_reply_to_id = $${paramIndex++}`;
        params.push(options.inReplyToId);
      }
    }

    // Filter private posts - only show if user is the author or following the author
    if (userId) {
      query += ` AND (p.is_private = FALSE OR p.author_id = $${paramIndex} OR 
               p.author_id IN (SELECT following_id FROM follows WHERE follower_id = $${paramIndex}))`;
      params.push(userId);
      paramIndex++;
    } else {
      query += ` AND p.is_private = FALSE`;
    }

    query += ' ORDER BY p.created_at DESC';

    if (options?.limit) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(options.limit);
    }

    if (options?.offset) {
      query += ` OFFSET $${paramIndex++}`;
      params.push(options.offset);
    }

    const result = await pool.query(query, params);
    return result.rows.map((row: any) => {
      const post = this.mapPostFromDb(row);
      const author = {
        username: row.author_username,
        avatar: row.author_avatar,
        bio: row.author_bio,
        isVerified: row.author_is_verified,
        verificationBadge: row.verification_badge_label ? {
          label: row.verification_badge_label,
          color: row.verification_badge_color
        } : undefined
      };
      
      // Scrub locked content for Time Capsules
      if (post.unlockAt && new Date(post.unlockAt) > new Date()) {
        if (userId && post.authorId === userId) {
          return { ...post, author };
        }
        return {
          ...post,
          author,
          content: '',
          imageUrl: null,
          videoUrl: null,
          pollOptions: undefined
        };
      }
      
      return { ...post, author };
    });
  }

  async updatePost(
    postId: string,
    authorId: string,
    updates: {
      content?: string;
      imageUrl?: string;
      videoUrl?: string;
      isPrivate?: boolean;
    }
  ): Promise<Post> {
    // Verify ownership
    const post = await this.getPostById(postId);
    if (!post || post.authorId !== authorId) {
      throw new Error('Post not found or unauthorized');
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.content !== undefined) {
      fields.push(`content = $${paramIndex++}`);
      values.push(updates.content);
    }
    if (updates.imageUrl !== undefined) {
      fields.push(`image_url = $${paramIndex++}`);
      values.push(updates.imageUrl);
    }
    if (updates.videoUrl !== undefined) {
      fields.push(`video_url = $${paramIndex++}`);
      values.push(updates.videoUrl);
    }
    if (updates.isPrivate !== undefined) {
      fields.push(`is_private = $${paramIndex++}`);
      values.push(updates.isPrivate);
    }

    if (fields.length === 0) {
      return post;
    }

    values.push(postId);
    const result = await pool.query(
      `UPDATE posts SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return this.mapPostFromDb(result.rows[0]);
  }

  async deletePost(postId: string, authorId: string): Promise<void> {
    const post = await this.getPostById(postId);
    if (!post || post.authorId !== authorId) {
      throw new Error('Post not found or unauthorized');
    }
    await pool.query('DELETE FROM posts WHERE id = $1', [postId]);
  }

  async getReplies(postId: string, userId?: string): Promise<Post[]> {
    return this.getPosts(userId, { inReplyToId: postId });
  }

  mapPostFromDb(row: any): Post {
    return {
      id: row.id,
      authorId: row.author_id,
      content: row.content,
      imageUrl: row.image_url,
      videoUrl: row.video_url,
      isThread: row.is_thread,
      isPrivate: row.is_private,
      inReplyToId: row.in_reply_to_id,
      repostOfId: row.repost_of_id,
      pollOptions: row.poll_options,
      pollEndsAt: row.poll_ends_at,
      unlockAt: row.unlock_at,
      mood: row.mood,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

