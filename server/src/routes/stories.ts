import express from 'express';
import { StoryService } from '../services/storyService.js';
import { UserService } from '../services/userService.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = express.Router();
const storyService = new StoryService();
const userService = new UserService();

// Get active stories
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const stories = await storyService.getActiveStories(req.userId!);
    res.json(stories);
  } catch (error: any) {
    console.error('Get stories error:', error);
    res.status(500).json({ error: error.message || 'Failed to get stories' });
  }
});

// Create story
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { content, type } = req.body;
    
    if (!content || !type) {
        return res.status(400).json({ error: 'Content and type are required' });
    }

    const story = await storyService.createStory(req.userId!, content, type);
    res.json(story);
  } catch (error: any) {
    console.error('Create story error:', error);
    res.status(500).json({ error: error.message || 'Failed to create story' });
  }
});

// View story
router.post('/:id/view', authenticateToken, async (req: AuthRequest, res) => {
    try {
        await storyService.viewStory(req.params.id, req.userId!);
        res.json({ success: true });
    } catch (error: any) {
        console.error('View story error:', error);
        res.status(500).json({ error: error.message || 'Failed to view story' });
    }
});

export default router;
