import express, { Request, Response } from 'express';
import { MarketplaceService } from '../services/marketplaceService.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = express.Router();
const marketplaceService = new MarketplaceService();

// Get all items
router.get('/items', async (req: Request, res: Response) => {
  try {
    const { type } = req.query;
    const items = await marketplaceService.getItems(type as string);
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user inventory
router.get('/inventory', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const items = await marketplaceService.getUserInventory(req.userId!);
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Purchase item
router.post('/items/:id/purchase', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const item = await marketplaceService.purchaseItem(req.userId!, req.params.id);
    res.json(item);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Equip item
router.post('/items/:id/equip', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await marketplaceService.equipItem(req.userId!, req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Unequip item
router.post('/items/:id/unequip', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await marketplaceService.unequipItem(req.userId!, req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Purchase subscription
router.post('/subscription', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { tier } = req.body;
    if (!['pro', 'pro_plus'].includes(tier)) {
        return res.status(400).json({ error: 'Invalid tier' });
    }
    const user = await marketplaceService.purchaseSubscription(req.userId!, tier);
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
