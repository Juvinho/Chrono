import express from 'express';
import { PostService } from '../services/postService.js';
import { ReactionService } from '../services/reactionService.js';
import { PollService } from '../services/pollService.js';
import { NotificationService } from '../services/notificationService.js';
import { UserService } from '../services/userService.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { getIo } from '../socket.js';

const router = express.Router();
const postService = new PostService();
const reactionService = new ReactionService();
const pollService = new PollService();
const notificationService = new NotificationService();
const userService = new UserService();

// Helper to enrich post with author and reactions
async function enrichPost(post: any, depth: number = 0, maxDepth: number = 1): Promise<any> {
  const author = await userService.getUserById(post.authorId);
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
      replies = await Promise.all(rawReplies.map((r) => enrichPost(r, depth + 1, maxDepth)));
  }

  return {
    ...post,
    author: author
      ? {
          username: author.username,
          avatar: author.avatar,
          bio: author.bio,
          isVerified: author.isVerified,
          verificationBadge: author.verificationBadge,
          equippedFrame: author.equippedFrame,
          equippedEffect: author.equippedEffect,
        }
      : null,
    reactions,
    repostOf,
    inReplyTo,
    replies,
    voters: votes,
  };
}

// Get posts
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { limit = 50, offset = 0, author, inReplyTo } = req.query;

    const posts = await postService.getPosts(req.userId || undefined, {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      authorId: author as string,
      inReplyToId: inReplyTo === 'null' ? null : (inReplyTo as string),
    });

    // For feed, limit recursion depth to 1 (show immediate replies only)
    const enrichedPosts = await Promise.all(posts.map((post) => enrichPost(post, 0, 1)));

    res.json(enrichedPosts);
  } catch (error: any) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: error.message || 'Failed to get posts' });
  }
});

// Get single post
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
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
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { content, imageUrl, videoUrl, isThread, isPrivate, inReplyToId, repostOfId, pollOptions, pollEndsAt, unlockAt, mood } = req.body;

    if (!content && !repostOfId) {
      return res.status(400).json({ error: 'Content or repostOfId is required' });
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

    const enrichedPost = await enrichPost(post);

    // Emit real-time post if public
    if (!post.isPrivate) {
      try {
        getIo().emit('new_post', enrichedPost);
      } catch (e) {
        console.error('Socket emit error', e);
      }
    }

    res.status(201).json(enrichedPost);
  } catch (error: any) {
    console.error('Create post error:', error);
    res.status(500).json({ error: error.message || 'Failed to create post' });
  }
});

// Update post
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
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
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    await postService.deletePost(req.params.id, req.userId!);
    res.json({ message: 'Post deleted successfully' });
  } catch (error: any) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete post' });
  }
});

// Add reaction
router.post('/:id/reactions', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { reactionType } = req.body;

    if (!['Glitch', 'Upload', 'Corrupt', 'Rewind', 'Static'].includes(reactionType)) {
      return res.status(400).json({ error: 'Invalid reaction type' });
    }

    await reactionService.addReaction(id, req.userId!, reactionType);

    // Create notification
    const post = await postService.getPostById(id);
    if (post && post.authorId !== req.userId) {
      await notificationService.createNotification(post.authorId, req.userId!, 'reaction', id);
    }

    const reactions = await reactionService.getReactionsForPost(id);
    res.json({ reactions });
  } catch (error: any) {
    console.error('Add reaction error:', error);
    res.status(500).json({ error: error.message || 'Failed to add reaction' });
  }
});

// Vote on poll
router.post('/:id/vote', authenticateToken, async (req: AuthRequest, res) => {
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

export default router;

