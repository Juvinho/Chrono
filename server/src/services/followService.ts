import { pool } from '../db/connection.js';

export class FollowService {
  async follow(followerId: string, followingId: string): Promise<void> {
    if (followerId === followingId) {
      throw new Error('Cannot follow yourself');
    }

    await pool.query(
      `INSERT INTO follows (follower_id, following_id)
       VALUES ($1, $2)
       ON CONFLICT (follower_id, following_id) DO NOTHING`,
      [followerId, followingId]
    );

    // Update counts
    await pool.query(
      'UPDATE users SET followers_count = (SELECT COUNT(*) FROM follows WHERE following_id = $1) WHERE id = $1',
      [followingId]
    );
    await pool.query(
      'UPDATE users SET following_count = (SELECT COUNT(*) FROM follows WHERE follower_id = $1) WHERE id = $1',
      [followerId]
    );
  }

  async unfollow(followerId: string, followingId: string): Promise<void> {
    await pool.query(
      'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
      [followerId, followingId]
    );

    // Update counts
    await pool.query(
      'UPDATE users SET followers_count = (SELECT COUNT(*) FROM follows WHERE following_id = $1) WHERE id = $1',
      [followingId]
    );
    await pool.query(
      'UPDATE users SET following_count = (SELECT COUNT(*) FROM follows WHERE follower_id = $1) WHERE id = $1',
      [followerId]
    );
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const result = await pool.query(
      'SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2',
      [followerId, followingId]
    );
    return result.rows.length > 0;
  }

  async getFollowingIds(userId: string): Promise<string[]> {
    const result = await pool.query(
      'SELECT following_id FROM follows WHERE follower_id = $1',
      [userId]
    );
    return result.rows.map((row: any) => row.following_id);
  }

  async getFollowingUsernames(userId: string): Promise<string[]> {
    const result = await pool.query(
      `SELECT u.username 
       FROM follows f 
       JOIN users u ON f.following_id = u.id 
       WHERE f.follower_id = $1`,
      [userId]
    );
    return result.rows.map((row: any) => row.username);
  }

  async getFollowersIds(userId: string): Promise<string[]> {
    const result = await pool.query(
      'SELECT follower_id FROM follows WHERE following_id = $1',
      [userId]
    );
    return result.rows.map((row: any) => row.follower_id);
  }

  async getFollowersUsernames(userId: string): Promise<string[]> {
    const result = await pool.query(
      `SELECT u.username 
       FROM follows f 
       JOIN users u ON f.follower_id = u.id 
       WHERE f.following_id = $1`,
      [userId]
    );
    return result.rows.map((row: any) => row.username);
  }
}

