import { Conversation, Message, SendMessageRequest } from '../types';
import { baseClient } from '../../../api/client';

const API_BASE = '/api/chat';

/**
 * CONVERSAS
 */

// Lista todas as conversas do usuário
export async function getConversations(): Promise<Conversation[]> {
  const response = await baseClient.get<Conversation[]>(`${API_BASE}`);
  if (response.error) throw new Error(response.error);
  return response.data || [];
}

// Inicializa conversa com outro usuário (Find or Create)
export async function initConversation(targetUserId: number | string): Promise<Conversation> {
  console.log('🔗 initConversation API call with targetUserId:', targetUserId);
  console.log('🔗 Using endpoint:', `${API_BASE}/init`);
  const token = baseClient.getToken();
  console.log('🔗 Token available:', !!token, token?.substring(0, 20) + '...');
  
  const response = await baseClient.post<Conversation>(`${API_BASE}/init`, {
    targetUserId,
  });
  
  console.log('🔗 Response:', response);
  if (response.error) throw new Error(response.error);
  if (!response.data) throw new Error('No conversation data returned');
  return response.data;
}

/**
 * MENSAGENS
 */

// Lista mensagens de uma conversa
export async function getMessages(conversationId: number | string): Promise<Message[]> {
  const response = await baseClient.get<Message[]>(`${API_BASE}/${conversationId}/messages`);
  if (response.error) throw new Error(response.error);
  return response.data || [];
}

// Envia nova mensagem
export async function sendMessage(request: SendMessageRequest): Promise<Message> {
  const response = await baseClient.post<Message>(
    `${API_BASE}/${request.conversationId}/messages`,
    {
      content: request.content,
    }
  );
  if (response.error) throw new Error(response.error);
  if (!response.data) throw new Error('No message data returned');
  return response.data;
}

/**
 * READ RECEIPTS (Opcional - implementar depois)
 */

export async function markAsRead(conversationId: number | string): Promise<void> {
  // TODO: Implementar endpoint no backend
  const response = await baseClient.post(`${API_BASE}/${conversationId}/read`, {});
  if (response.error) throw new Error(response.error);
}
