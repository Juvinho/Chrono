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

  async getFollowersFull(userId: string): Promise<any[]> {
    // OPTIMIZATION C-10: Use LEFT JOINs instead of subqueries to avoid N+1
    const result = await pool.query(
      `SELECT DISTINCT
              u.id, u.username, u.avatar, p.bio, u.is_verified, 
              u.verification_badge_label, u.verification_badge_color,
              i_frame.id as frame_id, i_frame.name as frame_name, i_frame.image_url as frame_image,
              i_effect.id as effect_id, i_effect.name as effect_name, i_effect.image_url as effect_image
       FROM follows f 
       JOIN users u ON f.follower_id = u.id 
       LEFT JOIN user_profiles p ON u.id = p.user_id
       LEFT JOIN user_items ui_frame ON u.id = ui_frame.user_id AND ui_frame.is_equipped = true
       LEFT JOIN items i_frame ON ui_frame.item_id = i_frame.id AND i_frame.type = 'frame'
       LEFT JOIN user_items ui_effect ON u.id = ui_effect.user_id AND ui_effect.is_equipped = true
       LEFT JOIN items i_effect ON ui_effect.item_id = i_effect.id AND i_effect.type = 'effect'
       WHERE f.following_id = $1
       ORDER BY u.username ASC`,
      [userId]
    );
    return result.rows.map(row => ({
        id: row.id,
        username: row.username,
        avatar: row.avatar,
        bio: row.bio || '',
        isVerified: row.is_verified,
        verificationBadge: row.verification_badge_label ? {
            label: row.verification_badge_label,
            color: row.verification_badge_color
        } : undefined,
        equippedFrame: row.frame_id ? {
            id: row.frame_id,
            name: row.frame_name,
            imageUrl: row.frame_image
        } : undefined,
        equippedEffect: row.effect_id ? {
            id: row.effect_id,
            name: row.effect_name,
            imageUrl: row.effect_image
        } : undefined
    }));
  }

  async getFollowingFull(userId: string): Promise<any[]> {
    // OPTIMIZATION C-10: Use LEFT JOINs instead of subqueries to avoid N+1
    const result = await pool.query(
      `SELECT DISTINCT
              u.id, u.username, u.avatar, p.bio, u.is_verified,
              u.verification_badge_label, u.verification_badge_color,
              i_frame.id as frame_id, i_frame.name as frame_name, i_frame.image_url as frame_image,
              i_effect.id as effect_id, i_effect.name as effect_name, i_effect.image_url as effect_image
       FROM follows f 
       JOIN users u ON f.following_id = u.id 
       LEFT JOIN user_profiles p ON u.id = p.user_id
       LEFT JOIN user_items ui_frame ON u.id = ui_frame.user_id AND ui_frame.is_equipped = true
       LEFT JOIN items i_frame ON ui_frame.item_id = i_frame.id AND i_frame.type = 'frame'
       LEFT JOIN user_items ui_effect ON u.id = ui_effect.user_id AND ui_effect.is_equipped = true
       LEFT JOIN items i_effect ON ui_effect.item_id = i_effect.id AND i_effect.type = 'effect'
       WHERE f.follower_id = $1
       ORDER BY u.username ASC`,
      [userId]
    );
    return result.rows.map(row => ({
        id: row.id,
        username: row.username,
        avatar: row.avatar,
        bio: row.bio || '',
        isVerified: row.is_verified,
        verificationBadge: row.verification_badge_label ? {
            label: row.verification_badge_label,
            color: row.verification_badge_color
        } : undefined,
        equippedFrame: row.frame_id ? {
            id: row.frame_id,
            name: row.frame_name,
            imageUrl: row.frame_image
        } : undefined,
        equippedEffect: row.effect_id ? {
            id: row.effect_id,
            name: row.effect_name,
            imageUrl: row.effect_image
        } : undefined
    }));
  }
}

