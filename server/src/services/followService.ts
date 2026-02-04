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
    const result = await pool.query(
      `SELECT u.id, u.username, u.avatar, p.bio, u.is_verified, 
              u.verification_badge_label, u.verification_badge_color,
              (SELECT row_to_json(i) FROM user_items ui JOIN items i ON ui.item_id = i.id WHERE ui.user_id = u.id AND ui.is_equipped = true AND i.type = 'frame' LIMIT 1) as equipped_frame,
              (SELECT row_to_json(i) FROM user_items ui JOIN items i ON ui.item_id = i.id WHERE ui.user_id = u.id AND ui.is_equipped = true AND i.type = 'effect' LIMIT 1) as equipped_effect
       FROM follows f 
       JOIN users u ON f.follower_id = u.id 
       LEFT JOIN user_profiles p ON u.id = p.user_id
       WHERE f.following_id = $1`,
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
        equippedFrame: row.equipped_frame ? {
            id: row.equipped_frame.id,
            name: row.equipped_frame.name,
            imageUrl: row.equipped_frame.image_url
        } : undefined,
        equippedEffect: row.equipped_effect ? {
            id: row.equipped_effect.id,
            name: row.equipped_effect.name,
            imageUrl: row.equipped_effect.image_url
        } : undefined
    }));
  }

  async getFollowingFull(userId: string): Promise<any[]> {
    const result = await pool.query(
      `SELECT u.id, u.username, u.avatar, p.bio, u.is_verified,
              u.verification_badge_label, u.verification_badge_color,
              (SELECT row_to_json(i) FROM user_items ui JOIN items i ON ui.item_id = i.id WHERE ui.user_id = u.id AND ui.is_equipped = true AND i.type = 'frame' LIMIT 1) as equipped_frame,
              (SELECT row_to_json(i) FROM user_items ui JOIN items i ON ui.item_id = i.id WHERE ui.user_id = u.id AND ui.is_equipped = true AND i.type = 'effect' LIMIT 1) as equipped_effect
       FROM follows f 
       JOIN users u ON f.following_id = u.id 
       LEFT JOIN user_profiles p ON u.id = p.user_id
       WHERE f.follower_id = $1`,
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
        equippedFrame: row.equipped_frame ? {
            id: row.equipped_frame.id,
            name: row.equipped_frame.name,
            imageUrl: row.equipped_frame.image_url
        } : undefined,
        equippedEffect: row.equipped_effect ? {
            id: row.equipped_effect.id,
            name: row.equipped_effect.name,
            imageUrl: row.equipped_effect.image_url
        } : undefined
    }));
  }
}

