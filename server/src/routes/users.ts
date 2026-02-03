import express from 'express';
import { UserService } from '../services/userService.js';
import { FollowService } from '../services/followService.js';
import { NotificationService } from '../services/notificationService.js';
import { authenticateToken, optionalAuthenticateToken, AuthRequest } from '../middleware/auth.js';
import { pool } from '../db/connection.js';

const router = express.Router();
const userService = new UserService();
const followService = new FollowService();
const notificationService = new NotificationService();

// Search users
router.get('/search/:query', optionalAuthenticateToken, async (req: AuthRequest, res) => {
  try {
    const { query } = req.params;
    
    // Log search attempt
    console.log(\[Search] User \ searching for: "\"\);

    if (!query || query.length < 2) {
      return res.json([]);
    }

    const result = await pool.query(
      \SELECT id, username, avatar, bio, followers_count, following_count, is_verified, is_private 
       FROM users 
       WHERE username ILIKE  
       ORDER BY is_verified DESC, followers_count DESC 
       LIMIT 20\,
      [\%\%\]
    );

    console.log(\[Search] Found \ results for "\"\);

    const users = result.rows.map(row => ({
      id: row.id,
      username: row.username,
      avatar: row.avatar,
      bio: row.bio,
      followers: parseInt(row.followers_count || '0'),
      following: parseInt(row.following_count || '0'),
      isVerified: row.is_verified,
      isPrivate: row.is_private,
    }));

    res.json(users);
  } catch (error: any) {
    console.error(\[Search] Error processing query "\":\, error);
    res.status(500).json({ error: error.message || 'Failed to search users' });
  }
});

// Get user profile by username (Consolidated Route)
router.get('/:username', optionalAuthenticateToken, async (req: AuthRequest, res) => {
  try {
    const { username } = req.params;
    const requesterId = req.userId;

    console.log(\[Profile Access] User \ accessing \\);

    const user = await userService.getUserByUsername(username);

    if (!user) {
      console.warn(\[Profile Access] Failed: User \ not found.\);
      return res.status(404).json({ error: 'User not found' });
    }

    // Check privacy and follow status
    let isFollowing = false;
    if (requesterId && requesterId !== user.id) {
       isFollowing = await followService.isFollowing(requesterId, user.id);
    }

    const isOwnProfile = requesterId === user.id;
    const canViewDetails = !user.isPrivate || isFollowing || isOwnProfile;

    // Get followers and following lists if allowed
    let followersList: string[] = [];
    let followingList: string[] = [];

    if (canViewDetails) {
        followersList = await followService.getFollowersUsernames(user.id);
        followingList = await followService.getFollowingUsernames(user.id);
    }

    res.json({
        ...user,
        email: undefined, // Ensure email is not leaked
        isFollowing,
        followers: user.followers || 0, // Ensure camelCase counts are present
        following: user.following || 0,
        followersList,
        followingList,
        isPrivate: user.isPrivate,
        canViewDetails
    });

  } catch (error: any) {
    console.error(\[Profile Access] Error retrieving \:\, error);
    res.status(500).json({ error: error.message || 'Failed to get user' });
  }
});

// Update user profile
router.put('/:username', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { username } = req.params;

    // Check if the user matches the token or if it's an admin (future proofing)
    // For now, assume only self-update is allowed
    const user = await userService.getUserByUsername(username);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.id !== req.userId) {
         return res.status(403).json({ error: 'Unauthorized' });
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

// Follow user
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
    if (!isFollowing) {
      await followService.follow(req.userId, targetUser.id);
      await notificationService.createNotification(targetUser.id, req.userId, 'follow');
    }

    res.json({ message: 'Followed successfully', isFollowing: true });
  } catch (error: any) {
    console.error('Follow error:', error);
    res.status(500).json({ error: error.message || 'Failed to follow' });
  }
});

// Unfollow user
router.post('/:username/unfollow', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { username } = req.params;

    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const targetUser = await userService.getUserByUsername(username);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    await followService.unfollow(req.userId, targetUser.id);
    res.json({ message: 'Unfollowed successfully', isFollowing: false });
  } catch (error: any) {
    console.error('Unfollow error:', error);
    res.status(500).json({ error: error.message || 'Failed to unfollow' });
  }
});

export default router;
