import { Router, Request, Response } from 'express';
import { pool } from '../../db/connection.js';
import { requireAdmin } from '../../middleware/adminAuth.js';

const router = Router();

router.use(requireAdmin);

// GET /api/admin/conversations - Listar todas as conversas
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT 
        c.id,
        c.created_at,
        c.updated_at,
        c.last_message_at,
        u1.username as user1_username,
        u1.display_name as user1_display_name,
        u2.username as user2_username,
        u2.display_name as user2_display_name,
        (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
      FROM conversations c
      JOIN users u1 ON c.user1_id = u1.id
      JOIN users u2 ON c.user2_id = u2.id
      ORDER BY c.updated_at DESC`
    );

    res.json({
      success: true,
      conversations: result.rows,
      total: result.rows.length,
    });
  } catch (error: any) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      error: 'Failed to fetch conversations',
      message: error.message,
    });
  }
});

// GET /api/admin/conversations/:id/messages - Ver mensagens de uma conversa
router.get('/:id/messages', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const limit = 50;

    const result = await pool.query(
      `SELECT 
        m.id,
        m.content,
        m.created_at,
        m.is_read,
        u.username,
        u.display_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = $1
      ORDER BY m.created_at DESC
      LIMIT $2`,
      [id, limit]
    );

    res.json({
      success: true,
      messages: result.rows.reverse(),
      total: result.rows.length,
    });
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      error: 'Failed to fetch messages',
      message: error.message,
    });
  }
});

// DELETE /api/admin/conversations/:id - Deletar conversa
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const convCheck = await pool.query('SELECT id FROM conversations WHERE id = $1', [id]);
    if (convCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    await pool.query('DELETE FROM conversations WHERE id = $1', [id]);

    console.log(`🗑️ [ADMIN] Conversation deleted: ${id}`);

    res.json({
      success: true,
      message: 'Conversation deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({
      error: 'Failed to delete conversation',
      message: error.message,
    });
  }
});

// DELETE /api/admin/conversations/:convId/messages/:msgId - Deletar mensagem
router.delete('/:convId/messages/:msgId', async (req: Request, res: Response) => {
  try {
    const { convId, msgId } = req.params;

    const msgCheck = await pool.query(
      'SELECT id FROM messages WHERE id = $1 AND conversation_id = $2',
      [msgId, convId]
    );
    if (msgCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    await pool.query('DELETE FROM messages WHERE id = $1', [msgId]);

    console.log(`🗑️ [ADMIN] Message deleted: ${msgId}`);

    res.json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      error: 'Failed to delete message',
      message: error.message,
    });
  }
});

export default router;
