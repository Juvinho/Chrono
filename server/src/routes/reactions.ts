import express, { Response } from 'express';
import { ReactionService } from '../services/reactionService.js';
import { NotificationService } from '../services/notificationService.js';
import { SecurityService } from '../services/securityService.js';
import { PostService } from '../services/postService.js';
import { authenticateToken, optionalAuthenticateToken, AuthRequest } from '../middleware/auth.js';

const router = express.Router();
const reactionService = new ReactionService();
const notificationService = new NotificationService();
const securityService = new SecurityService();
const postService = new PostService();

/**
 * GET /api/posts/:postId/reactions
 * Retorna contagens por tipo e reação do usuário (se autenticado).
 */
router.get('/:postId/reactions', optionalAuthenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { postId } = req.params;
    const counts = await reactionService.getReactionsForPost(postId);
    const userReaction = req.userId ? await reactionService.getUserReaction(postId, req.userId) : null;
    res.json({ reactions: counts, userReaction });
  } catch (error: any) {
    console.error('[Reactions] Get error:', error);
    res.status(500).json({ error: error.message || 'Failed to get reactions' });
  }
});

/**
 * GET /api/posts/:postId/reactions/details
 * Retorna lista completa de quem reagiu com informações de usuário.
 */
router.get('/:postId/reactions/details', optionalAuthenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { postId } = req.params;
    const reactionDetails = await reactionService.getReactionDetails(postId);
    const userReaction = req.userId ? await reactionService.getUserReaction(postId, req.userId) : null;
    res.json({ reactionDetails, userReaction });
  } catch (error: any) {
    console.error('[Reactions] Details error:', error);
    res.status(500).json({ error: error.message || 'Failed to get reaction details' });
  }
});

/**
 * POST /api/posts/:postId/reactions
 * Cria/atualiza reação. Alterna removendo se a mesma.
 * body: { reactionType: 'Glitch' | 'Upload' | 'Corrupt' | 'Rewind' | 'Static' }
 */
router.post('/:postId/reactions', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { postId } = req.params;
  const { reactionType } = req.body;
  try {
    const result = await reactionService.addOrToggleReaction(postId, req.userId!, reactionType);

    const post = await postService.getPostById(postId);
    if (post && post.authorId !== req.userId) {
      try {
        await notificationService.createNotification(post.authorId, req.userId!, 'reaction', postId);
      } catch (e) {
        console.warn('[Reactions] Notification creation failed:', e);
      }
    }

    await securityService.logAction(
      req.userId!,
      'reaction_' + result,
      'post',
      postId,
      'success',
      { reactionType },
      req
    );

    const counts = await reactionService.getReactionsForPost(postId);
    const userReaction = await reactionService.getUserReaction(postId, req.userId!);
    res.json({ status: result, reactions: counts, userReaction });
  } catch (error: any) {
    console.error('[Reactions] Update error:', error);
    await securityService.logAction(
      req.userId || null,
      'reaction_error',
      'post',
      postId,
      'failure',
      { reactionType, error: error.message },
      req
    );
    res.status(error.message === 'Post not found' ? 404 : 400).json({ error: error.message || 'Failed to update reaction' });
  }
});

/**
 * DELETE /api/posts/:postId/reactions
 * Remove reação do usuário ao post.
 */
router.delete('/:postId/reactions', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { postId } = req.params;
  try {
    await reactionService.removeReaction(postId, req.userId!);
    await securityService.logAction(req.userId!, 'reaction_removed', 'post', postId, 'success', {}, req);
    const counts = await reactionService.getReactionsForPost(postId);
    res.json({ reactions: counts, userReaction: null });
  } catch (error: any) {
    console.error('[Reactions] Delete error:', error);
    await securityService.logAction(req.userId || null, 'reaction_error', 'post', postId, 'failure', { error: error.message }, req);
    res.status(500).json({ error: error.message || 'Failed to remove reaction' });
  }
});

/**
 * POST /api/reactions/batch
 * body: { postIds: string[] }
 * Retorna contagens para múltiplos posts.
 */
router.post('/batch', async (req: express.Request, res: Response) => {
  try {
    const { postIds } = req.body || {};
    if (!Array.isArray(postIds)) {
      return res.status(400).json({ error: 'postIds must be an array' });
    }
    const counts = await reactionService.getReactionsForPosts(postIds);
    res.json({ reactionsByPost: counts });
  } catch (error: any) {
    console.error('[Reactions] Batch error:', error);
    res.status(500).json({ error: error.message || 'Failed to get reactions' });
  }
});

export default router;
