import express, { Response } from 'express';
import { PostService } from '../services/postService.js';
import { ReactionService } from '../services/reactionService.js';
import { PollService } from '../services/pollService.js';
import { NotificationService } from '../services/notificationService.js';
import { UserService } from '../services/userService.js';
import { ModerationService } from '../services/moderationService.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { validateNoEmojis, extractMentions } from '../utils/validation.js';

const router = express.Router();
const postService = new PostService();
const reactionService = new ReactionService();
const pollService = new PollService();
const notificationService = new NotificationService();
const userService = new UserService();
const moderationService = new ModerationService();

// Helper to enrich posts in batch to avoid N+1 problems
async function batchEnrichPosts(posts: any[], userId?: string): Promise<any[]> {
  if (posts.length === 0) return [];

  const postIds = posts.map(p => p.id);
  
  // Fetch reactions and votes in batch
  const [allReactions, allVotes] = await Promise.all([
    reactionService.getReactionsForPosts(postIds),
    pollService.getVotesForPosts(postIds)
  ]);

  // For reposts and replies, we still use the single enrich logic but with limited depth
  // to avoid complex batching for nested structures for now.
  // The main bottleneck was the flat list of posts in the feed.
  
  return Promise.all(posts.map(async (post: any) => {
    let repostOf = null;
    if (post.repostOfId) {
      const repost = await postService.getPostById(post.repostOfId);
      if (repost) {
        repostOf = await enrichPost(repost, 1, 1); 
      }
    }

    let inReplyTo = null;
    if (post.inReplyToId) {
      const parentPost = await postService.getPostById(post.inReplyToId);
      if (parentPost) {
        const parentAuthor = await userService.getUserById(parentPost.authorId);
        inReplyTo = {
          postId: parentPost.id,
          author: {
            username: parentAuthor?.username,
            avatar: parentAuthor?.avatar,
          },
          content: parentPost.content,
        };
      }
    }

    // Load first 5 replies (preview) for feed view
    let replies: any[] = [];
    const rawReplies = await postService.getReplies(post.id);
    if (rawReplies.length > 0) {
      replies = await Promise.all(rawReplies.slice(0, 5).map((r: any) => enrichPost(r, 1, 1)));
    }

    return {
      ...post,
      reactions: allReactions[post.id] || {},
      voters: allVotes[post.id] || {},
      repostOf,
      inReplyTo,
      replies
    };
  }));
}

// Helper to enrich post with author and reactions
async function enrichPost(post: any, depth: number = 0, maxDepth: number = 1): Promise<any> {
  // If post already has author (from optimized getPosts), skip fetch
  const author = post.author || await userService.getUserById(post.authorId);
  const reactions = await reactionService.getReactionsForPost(post.id);
  const votes = post.pollOptions ? await pollService.getVotesForPost(post.id) : {};

  let repostOf = null;
  if (post.repostOfId) {
    const repost = await postService.getPostById(post.repostOfId);
    if (repost) {
      // Don't fetch replies for the reposted content to avoid infinite loops and excessive data
      repostOf = await enrichPost(repost, maxDepth, maxDepth); 
    }
  }

  let inReplyTo = null;
  if (post.inReplyToId) {
    const parentPost = await postService.getPostById(post.inReplyToId);
    if (parentPost) {
      const parentAuthor = await userService.getUserById(parentPost.authorId);
      inReplyTo = {
        postId: parentPost.id,
        author: {
          username: parentAuthor?.username,
          avatar: parentAuthor?.avatar,
        },
        content: parentPost.content,
      };
    }
  }

  let replies: any[] = [];
  if (depth < maxDepth) {
      const rawReplies = await postService.getReplies(post.id);
      replies = await Promise.all(rawReplies.map((r: any) => enrichPost(r, depth + 1, maxDepth)));
  }

  const authorData = post.author || (author ? {
    username: author.username,
    avatar: author.avatar,
    bio: author.bio,
    isVerified: author.isVerified,
    verificationBadge: author.verificationBadge,
    equippedFrame: author.equippedFrame,
    equippedEffect: author.equippedEffect,
  } : null);

  return {
    ...post,
    author: authorData,
    reactions,
    repostOf,
    inReplyTo,
    replies,
    voters: votes,
  };
}

// Get posts
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 50, offset = 0, author, inReplyTo } = req.query;

    const posts = await postService.getPosts(req.userId || undefined, {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      authorId: author as string,
      inReplyToId: inReplyTo === 'null' ? null : (inReplyTo as string),
    });

    // Use optimized batch enrichment
    const enrichedPosts = await batchEnrichPosts(posts, req.userId || undefined);

    res.json(enrichedPosts);
  } catch (error: any) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: error.message || 'Failed to get posts' });
  }
});

// Get single post
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const post = await postService.getPostById(id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // For single post view, allow deeper recursion (e.g., 3 levels)
    const enrichedPost = await enrichPost(post, 0, 3);
    res.json(enrichedPost);
  } catch (error: any) {
    console.error('Get post error:', error);
    res.status(500).json({ error: error.message || 'Failed to get post' });
  }
});

// Create post
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { content, imageUrl, videoUrl, isThread, isPrivate, inReplyToId, repostOfId, pollOptions, pollEndsAt, unlockAt, mood } = req.body;

    if (!content && !repostOfId) {
      return res.status(400).json({ error: 'Content or repostOfId is required' });
    }

    // Validate no emojis in mentions
    if (content) {
      const words = content.split(/\s+/);
      const hasInvalidMention = words.some((w: string) => w.startsWith('@') && !validateNoEmojis(w, 'Menção').valid);
      if (hasInvalidMention) {
        return res.status(400).json({ error: 'Menções não podem conter emojis.' });
      }

      // Moderation Check
      const moderationResult = await moderationService.checkContent(content);
      if (moderationResult.flagged) {
        return res.status(400).json({ error: moderationResult.reason || 'Conteúdo sinalizado pela moderação.' });
      }
    }

    const post = await postService.createPost(req.userId, content || '', {
      imageUrl,
      videoUrl,
      isThread,
      isPrivate,
      inReplyToId,
      repostOfId,
      pollOptions,
      pollEndsAt: pollEndsAt ? new Date(pollEndsAt) : undefined,
      unlockAt: unlockAt ? new Date(unlockAt) : undefined,
      mood,
    } as any);

    // Create notification if reply
    if (inReplyToId) {
      const parentPost = await postService.getPostById(inReplyToId);
      if (parentPost && parentPost.authorId !== req.userId) {
        await notificationService.createNotification(parentPost.authorId, req.userId, 'reply', inReplyToId);
      }
    }

    // Create notification if repost
    if (repostOfId) {
      const originalPost = await postService.getPostById(repostOfId);
      if (originalPost && originalPost.authorId !== req.userId) {
        await notificationService.createNotification(originalPost.authorId, req.userId, 'repost', repostOfId);
      }
    }

    // Create notifications for mentions
    if (content) {
      const mentionedUsernames = extractMentions(content);
      for (const username of mentionedUsernames) {
        const mentionedUser = await userService.getUserByUsername(username);
        if (mentionedUser && mentionedUser.id !== req.userId) {
          // Use 'mention' type for notifications
          await notificationService.createNotification(mentionedUser.id, req.userId, 'mention' as any, post.id);
        }
      }
    }

    const enrichedPost = await enrichPost(post);

    // Real-time emission removed

    res.status(201).json(enrichedPost);
  } catch (error: any) {
    console.error('Create post error:', error);
    res.status(500).json({ error: error.message || 'Failed to create post' });
  }
});

// Update post
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const post = await postService.updatePost(id, req.userId!, req.body);
    const enrichedPost = await enrichPost(post);
    res.json(enrichedPost);
  } catch (error: any) {
    console.error('Update post error:', error);
    res.status(500).json({ error: error.message || 'Failed to update post' });
  }
});

// Delete post
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await postService.deletePost(req.params.id, req.userId!);
    res.json({ message: 'Post deleted successfully' });
  } catch (error: any) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete post' });
  }
});

// Reactions endpoints moved to reactions router

router.post('/:id/echo', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const originalPost = await postService.getPostById(id);
    if (!originalPost) {
      return res.status(404).json({ error: 'Post not found' });
    }
    const newPost = await postService.createPost(req.userId, '', {
      repostOfId: id,
      isPrivate: false,
    });
    if (originalPost.authorId !== req.userId) {
      await notificationService.createNotification(originalPost.authorId, req.userId, 'repost', id);
    }
    const enrichedPost = await enrichPost(newPost);
    res.status(201).json(enrichedPost);
  } catch (error: any) {
    console.error('Echo post error:', error);
    res.status(500).json({ error: error.message || 'Failed to echo post' });
  }
});

router.post('/:id/reply', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { content, isPrivate, imageUrl, videoUrl } = req.body || {};
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const parentPost = await postService.getPostById(id);
    if (!parentPost) {
      return res.status(404).json({ error: 'Post not found' });
    }
    if (!content && !imageUrl && !videoUrl) {
      return res.status(400).json({ error: 'Reply content or media is required' });
    }
    if (content) {
      const words = content.split(/\s+/);
      const hasInvalidMention = words.some((w: string) => w.startsWith('@') && !validateNoEmojis(w, 'Menção').valid);
      if (hasInvalidMention) {
        return res.status(400).json({ error: 'Menções não podem conter emojis.' });
      }
      const moderationResult = await moderationService.checkContent(content);
      if (moderationResult.flagged) {
        return res.status(400).json({ error: moderationResult.reason || 'Conteúdo sinalizado pela moderação.' });
      }
    }
    const replyPost = await postService.createPost(req.userId, content || '', {
      inReplyToId: id,
      isPrivate: !!isPrivate,
      imageUrl,
      videoUrl,
    });
    if (parentPost.authorId !== req.userId) {
      await notificationService.createNotification(parentPost.authorId, req.userId, 'reply', id);
    }
    const enrichedPost = await enrichPost(replyPost);
    res.status(201).json(enrichedPost);
  } catch (error: any) {
    console.error('Reply post error:', error);
    res.status(500).json({ error: error.message || 'Failed to reply to post' });
  }
});

// Vote on poll
router.post('/:id/vote', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { optionIndex } = req.body;

    if (typeof optionIndex !== 'number') {
      return res.status(400).json({ error: 'optionIndex must be a number' });
    }

    await pollService.vote(id, req.userId!, optionIndex);

    const post = await postService.getPostById(id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const votes = await pollService.getVotesForPost(id);
    res.json({ voters: votes });
  } catch (error: any) {
    console.error('Vote error:', error);
    res.status(500).json({ error: error.message || 'Failed to vote' });
  }
});

router.post('/:id/poll/vote', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { optionIndex } = req.body;
    if (typeof optionIndex !== 'number') {
      return res.status(400).json({ error: 'optionIndex must be a number' });
    }
    await pollService.vote(id, req.userId!, optionIndex);
    const post = await postService.getPostById(id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    const votes = await pollService.getVotesForPost(id);
    res.json({ voters: votes });
  } catch (error: any) {
    console.error('Vote error (alias):', error);
    res.status(500).json({ error: error.message || 'Failed to vote' });
  }
});

// Admin: Clean up blank posts from a specific user
router.post('/admin/cleanup-blank/:username', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // Get user by username
    const user = await userService.getUserByUsername(req.params.username);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete blank posts using raw query
    const { Pool } = await import('pg');
    const { pool } = await import('../db/connection.js');
    
    const deleteResult = await pool.query(
      `DELETE FROM posts 
       WHERE "authorId" = $1 
       AND (content IS NULL OR content = '' OR content ~ '^\\s+$')`,
      [user.id]
    );

    console.log(`🗑️ Deleted ${deleteResult.rowCount} blank post(s) from @${user.username}`);
    res.json({ 
      success: true, 
      deletedCount: deleteResult.rowCount,
      message: `${deleteResult.rowCount} blank post(s) deleted from @${user.username}`
    });
  } catch (error: any) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: error.message || 'Failed to cleanup posts' });
  }
});

// Get trending cordões with mention counts (Twitter-style trending)
router.get('/trending/cordoes', async (req: AuthRequest, res: Response) => {
  try {
    const { pool } = await import('../db/connection.js');
    
    // Extract all cordão tags ($tag pattern) from posts and count them
    const result = await pool.query(`
      SELECT 
        (regexp_matches(content, '\\$([A-Za-z0-9_]+)', 'g'))[1] as tag,
        COUNT(*) as mentions
      FROM posts
      WHERE content ~ '\\$[A-Za-z0-9_]+'
      GROUP BY tag
      ORDER BY mentions DESC
      LIMIT 20
    `);

    const cordoes = result.rows.map(row => ({
      tag: row.tag,
      mentions: parseInt(row.mentions, 10),
      displayName: `$${row.tag}`
    }));

    res.json(cordoes);
  } catch (error: any) {
    console.error('Trending cordões error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch trending cordões' });
  }
});

export default router;

