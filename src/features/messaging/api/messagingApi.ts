import { Conversation, Message, SendMessageRequest } from '../types';
import { baseClient } from '../../../api/client';

const API_BASE = '/chat';

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
  const token = baseClient.getToken();
  if (!token) {
    throw new Error('Não autenticado: token não encontrado');
  }

  console.log('🔗 initConversation API call with targetUserId:', targetUserId);
  console.log('🔗 Using endpoint:', `${API_BASE}/init`);
  console.log('🔗 Token available:', !!token, token?.substring(0, 20) + '...');
  
  const response = await baseClient.post<Conversation>(`${API_BASE}/init`, {
    targetUserId,
  });
  
  console.log('🔗 Response:', response);
  if (response.error) {
    console.error('🔗 Error response:', response.error);
    throw new Error(response.error);
  }
  if (!response.data) {
    throw new Error('No conversation data returned');
  }
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
  // Validate input
  if (!request.content || request.content.trim().length === 0) {
    throw new Error('Mensagem não pode estar vazia');
  }
  if (request.content.length > 1000) {
    throw new Error('Mensagem não pode exceder 1000 caracteres');
  }
  if (!request.conversationId) {
    throw new Error('ID da conversa é obrigatório');
  }

  const endpoint = `${API_BASE}/${request.conversationId}/messages`;
  console.log('📤 sendMessage API:', {
    conversationId: request.conversationId,
    conversationIdType: typeof request.conversationId,
    contentLength: request.content.trim().length,
    endpoint
  });

  const response = await baseClient.post<Message>(
    endpoint,
    {
      content: request.content.trim(),
    }
  );
  
  console.log('📬 sendMessage response:', response);
  if (response.error) throw new Error(response.error);
  if (!response.data) throw new Error('No message data returned');
  return response.data;
}

/**
 * READ RECEIPTS
 */

export async function markAsRead(conversationId: number | string): Promise<void> {
  const response = await baseClient.post(`${API_BASE}/${conversationId}/read`, {});
  if (response.error) throw new Error(response.error);
}
