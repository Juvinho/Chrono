import express from 'express';
import { UserService } from '../services/userService.js';
import { FollowService } from '../services/followService.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { pool } from '../db/connection.js';

const router = express.Router();
const userService = new UserService();
const followService = new FollowService();

// Get user by username
router.get('/:username', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { username } = req.params;
    const user = await userService.getUserByUsername(username);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get followers and following counts
    const followers = await followService.getFollowersUsernames(user.id);
    const following = await followService.getFollowingUsernames(user.id);
    const isFollowing = req.userId ? await followService.isFollowing(req.userId, user.id) : false;

    res.json({
      ...user,
      email: undefined,
      followersList: followers,
      followingList: following,
      isFollowing,
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({ error: error.message || 'Failed to get user' });
  }
});

// Update user profile
router.put('/:username', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { username } = req.params;

    if (req.username !== username) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const user = await userService.getUserByUsername(username);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = await userService.updateUser(user.id, req.body);

    res.json({
      ...updatedUser,
      email: undefined,
    });
  } catch (error: any) {
    console.error('Update user error:', error);
    res.status(500).json({ error: error.message || 'Failed to update user' });
  }
});

// Search users
router.get('/search/:query', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { query } = req.params;
    if (!query || query.length < 2) {
      return res.json([]);
    }

    const result = await pool.query(
      `SELECT id, username, avatar, bio, followers_count, following_count, is_verified, is_private 
       FROM users 
       WHERE username ILIKE $1 
       ORDER BY followers_count DESC 
       LIMIT 20`,
      [`%${query}%`]
    );

    const users = result.rows.map(row => ({
      id: row.id,
      username: row.username,
      avatar: row.avatar,
      bio: row.bio,
      followers: row.followers_count,
      following: row.following_count,
      isVerified: row.is_verified,
      isPrivate: row.is_private,
    }));

    res.json(users);
  } catch (error: any) {
    console.error('Search users error:', error);
    res.status(500).json({ error: error.message || 'Failed to search users' });
  }
});

// Follow/Unfollow user
router.post('/:username/follow', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { username } = req.params;

    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const targetUser = await userService.getUserByUsername(username);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isFollowing = await followService.isFollowing(req.userId, targetUser.id);

    if (isFollowing) {
      await followService.unfollow(req.userId, targetUser.id);
      res.json({ message: 'Unfollowed successfully', isFollowing: false });
    } else {
      await followService.follow(req.userId, targetUser.id);
      res.json({ message: 'Followed successfully', isFollowing: true });
    }
  } catch (error: any) {
    console.error('Follow error:', error);
    res.status(500).json({ error: error.message || 'Failed to follow/unfollow' });
  }
});

export default router;

