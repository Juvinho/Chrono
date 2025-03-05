import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { pool } from '../db/connection.js';
import { User, ProfileSettings } from '../types/index.js';
import { FollowService } from './followService.js';

const FULL_USER_SELECT = `
  SELECT 
    u.id, u.username, u.email, u.password_hash, u.avatar, 
    u.followers_count, u.following_count, u.is_verified, u.verification_badge_label, u.verification_badge_color, u.blocked_users, u.created_at, u.updated_at,
    u.profile_type, u.headline, u.connections_count, u.skills, u.work_experience, u.education,
    p.bio, p.birthday, p.location, p.website, p.cover_image, p.pronouns,
    s.theme, s.accent_color, s.effect, s.animations_enabled, s.is_private,
    (SELECT row_to_json(i) FROM user_items ui JOIN items i ON ui.item_id = i.id WHERE ui.user_id = u.id AND ui.is_equipped = true AND i.type = 'frame' LIMIT 1) as equipped_frame,
    (SELECT row_to_json(i) FROM user_items ui JOIN items i ON ui.item_id = i.id WHERE ui.user_id = u.id AND ui.is_equipped = true AND i.type = 'effect' LIMIT 1) as equipped_effect
  FROM users u
  LEFT JOIN user_profiles p ON u.id = p.user_id
  LEFT JOIN user_settings s ON u.id = s.user_id
`;

export class UserService {

  async createUser(
    username: string,
    email: string,
    password: string,
    avatar?: string
  ): Promise<User> {
    const passwordHash = await bcrypt.hash(password, 10);
    const defaultCoverImage = `https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=400&fit=crop&q=80`;
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Insert into users
      const userResult = await client.query(
        `INSERT INTO users (username, email, password_hash, avatar, is_verified)
         VALUES ($1, $2, $3, $4, TRUE)
         RETURNING id, username, email, avatar, is_verified, created_at, updated_at`,
        [
          username,
          email,
          passwordHash,
          avatar || '' // Empty string triggers frontend initials fallback
        ]
      );
      const userId = userResult.rows[0].id;

      // 2. Insert into user_profiles
      await client.query(
        `INSERT INTO user_profiles (user_id, cover_image) VALUES ($1, $2)`,
        [userId, defaultCoverImage]
      );

      // 3. Insert into user_settings
      await client.query(
        `INSERT INTO user_settings (user_id) VALUES ($1)`,
        [userId] // Defaults will handle the rest
      );

      await client.query('COMMIT');
      
      // Fetch the full user object to return
      const fullUser = await this.getUserById(userId);
      if (!fullUser) throw new Error('Failed to create user');
      return fullUser;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async verifyEmailByToken(token: string): Promise<User | null> {
    const result = await pool.query(
      `UPDATE users 
       SET is_verified = TRUE, email_verification_token = NULL
       WHERE email_verification_token = $1 AND is_verified = FALSE
       RETURNING id`,
      [token]
    );

    if (result.rows.length === 0) return null;
    return this.getUserById(result.rows[0].id);
  }

  async getUserByUsername(username: string, includeFollows: boolean = false): Promise<User | null> {
    const result = await pool.query(`${FULL_USER_SELECT} WHERE LOWER(u.username) = LOWER($1)`, [username]);
    if (result.rows.length === 0) return null;
    const user = this.mapUserFromDb(result.rows[0]);
    
    if (includeFollows) {
      const followService = new FollowService();
      user.followersList = await followService.getFollowersUsernames(user.id);
      user.followingList = await followService.getFollowingUsernames(user.id);
    }
    
    return user;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await pool.query(`${FULL_USER_SELECT} WHERE LOWER(u.email) = LOWER($1)`, [email]);
    if (result.rows.length === 0) return null;
    const user = this.mapUserFromDb(result.rows[0]);
    // Optimization: Don't fetch lists for auth/email checks unless needed
    return user;
  }

  async getUserById(id: string, includeFollows: boolean = false): Promise<User | null> {
    const result = await pool.query(`${FULL_USER_SELECT} WHERE u.id = $1`, [id]);
    if (result.rows.length === 0) return null;
    const user = this.mapUserFromDb(result.rows[0]);
    
    if (includeFollows) {
      const followService = new FollowService();
      user.followersList = await followService.getFollowersUsernames(user.id);
      user.followingList = await followService.getFollowingUsernames(user.id);
    }
    
    return user;
  }

  async verifyPassword(password: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Update users table
      const userFields: string[] = [];
      const userValues: any[] = [];
      let uIdx = 1;

      if (updates.avatar !== undefined) { userFields.push(`avatar = $${uIdx++}`); userValues.push(updates.avatar); }
      if (updates.profileType !== undefined) { userFields.push(`profile_type = $${uIdx++}`); userValues.push(updates.profileType); }
      if (updates.headline !== undefined) { userFields.push(`headline = $${uIdx++}`); userValues.push(updates.headline); }
      if (updates.skills !== undefined) { userFields.push(`skills = $${uIdx++}`); userValues.push(updates.skills); }
      if (updates.workExperience !== undefined) { userFields.push(`work_experience = $${uIdx++}`); userValues.push(JSON.stringify(updates.workExperience)); }
      if (updates.education !== undefined) { userFields.push(`education = $${uIdx++}`); userValues.push(JSON.stringify(updates.education)); }

      if (userFields.length > 0) {
        userValues.push(id);
        await client.query(`UPDATE users SET ${userFields.join(', ')} WHERE id = $${uIdx}`, userValues);
      }

      // 2. Update user_profiles table
      const profileFields: string[] = [];
      const profileValues: any[] = [];
      let pIdx = 1;

      if (updates.bio !== undefined) { profileFields.push(`bio = $${pIdx++}`); profileValues.push(updates.bio); }
      if (updates.birthday !== undefined) { 
        // Ensure birthday is stored as Date or NULL
        const bday = updates.birthday ? new Date(updates.birthday) : null;
        profileFields.push(`birthday = $${pIdx++}`); 
        profileValues.push(bday); 
      }
      if (updates.location !== undefined) { profileFields.push(`location = $${pIdx++}`); profileValues.push(updates.location); }
      if (updates.website !== undefined) { profileFields.push(`website = $${pIdx++}`); profileValues.push(updates.website); }
      if (updates.coverImage !== undefined) { profileFields.push(`cover_image = $${pIdx++}`); profileValues.push(updates.coverImage); }
      if (updates.pronouns !== undefined) { profileFields.push(`pronouns = $${pIdx++}`); profileValues.push(updates.pronouns); }

      if (profileFields.length > 0) {
        // Ensure profile record exists
        await client.query(
          `INSERT INTO user_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
          [id]
        );

        profileValues.push(id);
        await client.query(
          `UPDATE user_profiles SET ${profileFields.join(', ')} WHERE user_id = $${pIdx}`,
          profileValues
        );
      }

      // 3. Update user_settings table
      const settingsFields: string[] = [];
      const settingsValues: any[] = [];
      let sIdx = 1;

      if (updates.isPrivate !== undefined) { 
        settingsFields.push(`is_private = $${sIdx++}`); 
        settingsValues.push(updates.isPrivate); 
      }
      
      if (updates.profileSettings) {
        const s = updates.profileSettings;
        if (s.theme !== undefined) { settingsFields.push(`theme = $${sIdx++}`); settingsValues.push(s.theme); }
        if (s.accentColor !== undefined) { settingsFields.push(`accent_color = $${sIdx++}`); settingsValues.push(s.accentColor); }
        if (s.effect !== undefined) { settingsFields.push(`effect = $${sIdx++}`); settingsValues.push(s.effect); }
        if (s.animationsEnabled !== undefined) { settingsFields.push(`animations_enabled = $${sIdx++}`); settingsValues.push(s.animationsEnabled); }
      }

      if (settingsFields.length > 0) {
        // Ensure settings record exists
        await client.query(
          `INSERT INTO user_settings (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
          [id]
        );

        settingsValues.push(id);
        await client.query(
          `UPDATE user_settings SET ${settingsFields.join(', ')} WHERE user_id = $${sIdx}`,
          settingsValues
        );
      }

      await client.query('COMMIT');
      
      const updatedUser = await this.getUserById(id);
      if (!updatedUser) throw new Error('User not found after update');
      return updatedUser;

    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async updatePassword(id: string, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, id]);
  }

  async verifyUser(id: string): Promise<User> {
    const result = await pool.query(
      'UPDATE users SET is_verified = TRUE WHERE id = $1 RETURNING id',
      [id]
    );
    // Return full object
    const user = await this.getUserById(id);
    if (!user) throw new Error('User not found');
    return user;
  }

  async getFollowersUsers(userId: string): Promise<User[]> {
    const result = await pool.query(
      `SELECT u.id, u.username, u.avatar, p.bio 
       FROM follows f
       JOIN users u ON f.follower_id = u.id
       LEFT JOIN user_profiles p ON u.id = p.user_id
       WHERE f.following_id = $1`,
      [userId]
    );
    return result.rows.map(row => ({
      ...this.mapUserFromDb(row), // mapUserFromDb handles defaults, but we only have partial data
      // Ensure we don't break if mapUserFromDb expects more fields
      id: row.id,
      username: row.username,
      avatar: row.avatar,
      bio: row.bio || '',
      followers: 0, following: 0, coverImage: '', // Defaults for list view
      profileSettings: { theme: 'light', accentColor: 'purple', effect: 'none' } // Minimal defaults
    } as User));
  }

  async getFollowingUsers(userId: string): Promise<User[]> {
    const result = await pool.query(
      `SELECT u.id, u.username, u.avatar, p.bio
       FROM follows f
       JOIN users u ON f.following_id = u.id
       LEFT JOIN user_profiles p ON u.id = p.user_id
       WHERE f.follower_id = $1`,
      [userId]
    );
    return result.rows.map(row => ({
      ...this.mapUserFromDb(row),
      id: row.id,
      username: row.username,
      avatar: row.avatar,
      bio: row.bio || '',
      followers: 0, following: 0, coverImage: '',
      profileSettings: { theme: 'light', accentColor: 'purple', effect: 'none' }
    } as User));
  }

  async getFollowingIds(userId: string): Promise<string[]> {
    const result = await pool.query(
      'SELECT following_id FROM follows WHERE follower_id = $1',
      [userId]
    );
    return result.rows.map((row) => row.following_id);
  }

  async getFollowersIds(userId: string): Promise<string[]> {
    const result = await pool.query(
      'SELECT follower_id FROM follows WHERE following_id = $1',
      [userId]
    );
    return result.rows.map((row) => row.follower_id);
  }

  async getFollowersCount(userId: string): Promise<number> {
    const result = await pool.query(
      'SELECT COUNT(*) FROM follows WHERE following_id = $1',
      [userId]
    );
    return parseInt(result.rows[0].count);
  }

  async getFollowingCount(userId: string): Promise<number> {
    const result = await pool.query(
      'SELECT COUNT(*) FROM follows WHERE follower_id = $1',
      [userId]
    );
    return parseInt(result.rows[0].count);
  }

  async canSendGlitchi(userId: string): Promise<boolean> {
    const result = await pool.query(
      'SELECT glitchis_sent_today, last_glitchi_sent_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) return false;

    const { glitchis_sent_today, last_glitchi_sent_at } = result.rows[0];

    // Reset count if it's a new day
    const now = new Date();
    const lastSent = last_glitchi_sent_at ? new Date(last_glitchi_sent_at) : null;

    if (!lastSent || lastSent.getUTCDate() !== now.getUTCDate() || lastSent.getUTCMonth() !== now.getUTCMonth() || lastSent.getUTCFullYear() !== now.getUTCFullYear()) {
      await pool.query('UPDATE users SET glitchis_sent_today = 0 WHERE id = $1', [userId]);
      return true;
    }

    return glitchis_sent_today < 3;
  }

  async sendGlitchi(senderId: string, recipientId: string): Promise<void> {
    const canSend = await this.canSendGlitchi(senderId);
    if (!canSend) throw new Error('Glitchi limit reached (3 per 24h)');

    const recipientSettings = await pool.query('SELECT can_receive_glitchis FROM user_settings WHERE user_id = $1', [recipientId]);
    if (recipientSettings.rows.length > 0 && !recipientSettings.rows[0].can_receive_glitchis) {
      throw new Error('This user has disabled glitchis');
    }

    await pool.query(
      'UPDATE users SET glitchis_sent_today = glitchis_sent_today + 1, last_glitchi_sent_at = CURRENT_TIMESTAMP WHERE id = $1',
      [senderId]
    );

    // Emit real-time glitchi
    try {
      const io = (global as any).getIo();
      const sender = await this.getUserById(senderId);
      io.to(recipientId).emit('glitchi_received', { senderUsername: sender?.username });
    } catch (e) { }
  }

  async setCanReceiveGlitchis(userId: string, enabled: boolean): Promise<void> {
    await pool.query(
      'UPDATE user_settings SET can_receive_glitchis = $1 WHERE user_id = $2',
      [enabled, userId]
    );
  }

  mapUserFromDb(row: any): User {
    // Override verification for Juvinho
    const isJuvinho = row.username === 'Juvinho';

    const mapItem = (itemJson: any) => {
        if (!itemJson) return undefined;
        return {
            id: itemJson.id,
            type: itemJson.type,
            name: itemJson.name,
            description: itemJson.description,
            price: parseFloat(itemJson.price),
            currency: itemJson.currency,
            imageUrl: itemJson.image_url,
            rarity: itemJson.rarity
        };
    };

    const user: any = {
      id: row.id,
      username: row.username,
      email: row.email,
      avatar: row.avatar,
      bio: row.bio || '',
      birthday: row.birthday,
      pronouns: row.pronouns,
      location: row.location || null,
      website: row.website || null,
      coverImage: row.cover_image,
      followers: parseInt(row.followers_count || '0'),
      following: parseInt(row.following_count || '0'),
      profileType: row.profile_type || 'personal',
      headline: row.headline || '',
      connections: parseInt(row.connections_count || '0'),
      skills: row.skills || [],
      workExperience: row.work_experience || [],
      education: row.education || [],
      isPrivate: row.is_private, // From user_settings join
      isVerified: isJuvinho ? true : row.is_verified,
      verificationBadge: isJuvinho
        ? { label: 'Criador', color: '#ff0000' }
        : (row.verification_badge_label
          ? {
              label: row.verification_badge_label,
              color: row.verification_badge_color,
            }
          : undefined),
      profileSettings: row.profile_settings || {
        theme: row.theme || 'light',
        accentColor: row.accent_color || 'purple',
        effect: row.effect || 'none',
        themeSkin: row.theme_skin || 'default',
        animationsEnabled: row.animations_enabled !== undefined ? row.animations_enabled : true,
      },
      equippedFrame: mapItem(row.equipped_frame),
      equippedEffect: mapItem(row.equipped_effect),
      blockedUsers: row.blocked_users || [],
      subscriptionTier: row.subscription_tier || 'free',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      // SECURITY: Ensure sensitive fields are NEVER included by default in the mapped object
      // unless explicitly needed for auth. We handle password_hash separately in auth logic.
    };

    // Remove sensitive fields if they accidentally leaked from the DB row
    delete user.password_hash;
    delete user.passwordHash;
    delete user.two_factor_secret;
    
    return user;
  }
}
