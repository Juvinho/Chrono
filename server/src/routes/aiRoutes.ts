import express, { Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';
import { aiService } from '../services/aiService.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

/**
 * Rate limiting for AI endpoints to prevent abuse
 * AI operations are computationally expensive
 */
const aiRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 requests per hour per IP/user
  message: 'Too many AI requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const bioRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 bio generations per hour
  message: 'Bio generation limit reached. Try again later.',
});

/**
 * POST /api/ai/generate-bio
 * Generate an optimized bio for the user
 */
router.post('/generate-bio', authenticateToken, bioRateLimit, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { username, bio, location, website, skills, headline, profileType } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const generatedBio = await aiService.generateBio({
      username,
      bio,
      location,
      website,
      skills: Array.isArray(skills) ? skills : skills?.split(',').map((s: string) => s.trim()),
      headline,
      profileType
    });

    if (!generatedBio) {
      return res.status(500).json({ error: 'Failed to generate bio' });
    }

    res.json({ bio: generatedBio });
  } catch (error: any) {
    console.error('Generate bio error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate bio' });
  }
});

/**
 * POST /api/ai/generate-reply
 * Generate a reply to a post
 */
router.post('/generate-reply', authenticateToken, aiRateLimit, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { postContent } = req.body;

    if (!postContent) {
      return res.status(400).json({ error: 'Post content is required' });
    }

    const generatedReply = await aiService.generateReply(postContent);

    if (!generatedReply) {
      return res.status(500).json({ error: 'Failed to generate reply' });
    }

    res.json({ content: generatedReply });
  } catch (error: any) {
    console.error('Generate reply error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate reply' });
  }
});

/**
 * POST /api/ai/analyze-sentiment
 * Analyze sentiment/mood of text
 */
router.post('/analyze-sentiment', authenticateToken, aiRateLimit, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const mood = await aiService.analyzeSentiment(text);

    res.json({ mood });
  } catch (error: any) {
    console.error('Analyze sentiment error:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze sentiment' });
  }
});

/**
 * POST /api/ai/generate-image
 * Generate image using Imagen
 */
router.post('/generate-image', authenticateToken, aiRateLimit, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { prompt, aspectRatio = '1:1' } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const validAspectRatios = ['1:1', '16:9', '9:16', '4:3', '3:4'];
    if (!validAspectRatios.includes(aspectRatio)) {
      return res.status(400).json({ error: `Invalid aspect ratio. Must be one of: ${validAspectRatios.join(', ')}` });
    }

    const imageBase64 = await aiService.generateImage(prompt, aspectRatio);

    if (!imageBase64) {
      return res.status(500).json({ error: 'Failed to generate image' });
    }

    res.json({ imageUrl: imageBase64 });
  } catch (error: any) {
    console.error('Generate image error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate image' });
  }
});

/**
 * POST /api/ai/analyze-video
 * Analyze video content
 */
router.post('/analyze-video', authenticateToken, aiRateLimit, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { prompt, videoBase64, mimeType = 'video/mp4' } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!videoBase64) {
      return res.status(400).json({ error: 'Video data is required' });
    }

    const analysis = await aiService.analyzeVideo(prompt, videoBase64, mimeType);

    if (!analysis) {
      return res.status(500).json({ error: 'Failed to analyze video' });
    }

    res.json({ analysis });
  } catch (error: any) {
    console.error('Analyze video error:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze video' });
  }
});

export default router;
