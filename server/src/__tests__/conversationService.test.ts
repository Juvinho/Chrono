import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConversationService } from '../services/conversationService.js';

const queries: any[] = [];
let rowsByQuery: Record<string, any[]> = {};

const mockQuery = (sql: string, params?: any[]) => {
  queries.push({ sql, params });
  if (sql.includes('SELECT c.id FROM conversations')) {
    return Promise.resolve({ rows: rowsByQuery['existing_conversation'] || [] });
  }
  if (sql.includes('INSERT INTO conversations')) {
    return Promise.resolve({ rows: [{ id: 'c1' }] });
  }
  if (sql.includes('INSERT INTO conversation_participants')) {
    return Promise.resolve({ rows: [] });
  }
  if (sql.includes('SELECT 1 FROM conversation_participants')) {
    return Promise.resolve({ rows: [{ one: 1 }] });
  }
  if (sql.includes('SELECT is_active FROM encrypted_cords')) {
    return Promise.resolve({ rows: [] });
  }
  if (sql.includes('INSERT INTO messages')) {
    return Promise.resolve({ rows: [{
      id: 'm1',
      conversation_id: params?.[0],
      sender_id: params?.[1],
      text: params?.[2],
      image_url: params?.[4],
      video_url: params?.[5],
      metadata: params?.[6],
      status: params?.[7],
      is_encrypted: params?.[3],
      created_at: new Date(),
    }]});
  }
  if (sql.includes('SELECT user_id FROM conversation_participants WHERE conversation_id')) {
    return Promise.resolve({ rows: [{ user_id: 'u1' }, { user_id: 'u2' }] });
  }
  if (sql.includes('INSERT INTO message_status')) {
    return Promise.resolve({ rows: [] });
  }
  if (sql.includes('UPDATE conversations SET updated_at')) {
    return Promise.resolve({ rows: [] });
  }
  if (sql.includes('UPDATE conversation_participants') && sql.includes('unread_count = unread_count + 1')) {
    return Promise.resolve({ rows: [] });
  }
  if (sql.includes('SELECT username FROM users WHERE id')) {
    return Promise.resolve({ rows: [{ username: 'me' }] });
  }
  if (sql.includes('SELECT conversation_id, sender_id FROM messages WHERE id')) {
    return Promise.resolve({ rows: [{ conversation_id: 'c1', sender_id: 'u1' }] });
  }
  if (sql.includes('SELECT COUNT(*) FROM message_status')) {
    return Promise.resolve({ rows: [{ count: '0' }] });
  }
  if (sql.includes('UPDATE messages SET status')) {
    return Promise.resolve({ rows: [] });
  }
  if (sql.includes('SELECT 1 FROM messages m') && sql.includes('JOIN conversation_participants')) {
    return Promise.resolve({ rows: [{ one: 1 }] });
  }
  return Promise.resolve({ rows: [] });
};

vi.mock('../db/connection.js', () => {
  return {
    pool: {
      query: (sql: string, params?: any[]) => mockQuery(sql, params),
      connect: async () => {
        return {
          query: (sql: string, params?: any[]) => mockQuery(sql, params),
          release: () => {}
        }
      }
    }
  }
});

vi.mock('../socket.js', () => {
  return { getIo: () => ({ to: () => ({ emit: () => {} }) }) };
});

describe('ConversationService', () => {
  beforeEach(() => {
    queries.length = 0;
    rowsByQuery = {};
  });

  it('creates a conversation when not existing', async () => {
    rowsByQuery['existing_conversation'] = [];
    const svc = new ConversationService();
    const id = await svc.getOrCreateConversation('u1', 'u2');
    expect(id).toBe('c1');
    const insertConv = queries.find(q => q.sql.includes('INSERT INTO conversations'));
    expect(insertConv).toBeTruthy();
    const insertParticipants = queries.find(q => q.sql.includes('INSERT INTO conversation_participants'));
    expect(insertParticipants).toBeTruthy();
  });

  it('sends a message and updates statuses and timestamps', async () => {
    const svc = new ConversationService();
    const msg = await svc.sendMessage('c1', 'u1', 'hello');
    expect(msg.text).toBe('hello');
    expect(msg.status).toBe('sent');
    const insertMsg = queries.find(q => q.sql.includes('INSERT INTO messages'));
    expect(insertMsg).toBeTruthy();
    const updConv = queries.find(q => q.sql.includes('UPDATE conversations SET updated_at'));
    expect(updConv).toBeTruthy();
    const insStatus = queries.filter(q => q.sql.includes('INSERT INTO message_status'));
    expect(insStatus.length).toBeGreaterThan(0);
    const incUnread = queries.find(q => q.sql.includes('unread_count = unread_count + 1'));
    expect(incUnread).toBeTruthy();
  });

  it('rejects too long messages', async () => {
    const svc = new ConversationService();
    await expect(svc.sendMessage('c1', 'u1', 'x'.repeat(10001))).rejects.toThrow(/Message too long/);
  });

  it('marks messages as read and updates message status when all read', async () => {
    const svc = new ConversationService();
    await svc.updateMessageStatus('m1', 'u2', 'read');
    const updStatus = queries.find(q => q.sql.includes('UPDATE message_status SET status'));
    expect(updStatus).toBeTruthy();
    const updMsg = queries.find(q => q.sql.includes('UPDATE messages SET status'));
    expect(updMsg).toBeTruthy();
  });
});
