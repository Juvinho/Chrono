import express from 'express';
import { CompanionService } from '../services/companionService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const companionService = new CompanionService();

// Get current user's companion
router.get('/', authenticateToken, async (req, res) => {
  try {
    const companion = await companionService.getCompanion((req as any).user!.id);
    res.json(companion);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch companion' });
  }
});

// Create a companion
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, type } = req.body;
    const companion = await companionService.createCompanion((req as any).user!.id, name, type);
    res.json(companion);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create companion' });
  }
});

// Interaction (pet, feed, etc. - simplified to adding XP for now)
router.post('/interact', authenticateToken, async (req, res) => {
    try {
        const { action } = req.body;
        let xpGain = 5;
        if (action === 'feed') xpGain = 10;
        if (action === 'play') xpGain = 15;
        
        const companion = await companionService.addXp((req as any).user!.id, xpGain);
        res.json(companion);
    } catch (error) {
        res.status(500).json({ error: 'Failed to interact' });
    }
});

export default router;
