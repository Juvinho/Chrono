import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import * as chatController from '../controllers/chatController.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', chatController.getConversations);
router.post('/init', chatController.initConversation);
router.get('/:conversationId/messages', chatController.getMessages);
router.post('/:conversationId/messages', chatController.sendMessage);
router.post('/:conversationId/read', chatController.markAsRead);
router.post('/reindex/conversations', chatController.reindexConversations);
export default router;