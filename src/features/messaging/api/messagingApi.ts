import { Conversation, Message, SendMessageRequest } from '../types';
import { baseClient } from '../../../api/client';

const API_BASE = '/chat';

/**
 * CONVERSAS
 */

// Lista todas as conversas do usuário
export async function getConversations(): Promise<Conversation[]> {
  const response = await baseClient.get<Conversation[]>(`${API_BASE}`);

  if (response.error) {
    const err: any = new Error(response.error);
    err.statusCode = response.status ?? 0;
    throw err;
  }
  
  // Response is already typed as Conversation[]
  if (Array.isArray(response.data)) {
    return response.data;
  }

  console.warn('⚠️ getConversations returned non-array:', response.data);
  return [];
}

// Inicializa conversa com outro usuário (Find or Create)
export async function initConversation(targetUserId: number | string): Promise<Conversation> {
  // Auth is handled via httpOnly cookie — no need to check token

  console.log('🔗 initConversation API call with targetUserId:', targetUserId);
  console.log('🔗 Using endpoint:', `${API_BASE}/init`);
  
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
  const normalizedContent = typeof request.content === 'string' ? request.content : '';
  const trimmedContent = normalizedContent.trim();

  // Validate input - allow if has content OR has image
  if (trimmedContent.length === 0 && !request.imageUrl) {
    throw new Error('Mensagem ou imagem é obrigatória');
  }
  if (normalizedContent.length > 1000) {
    throw new Error('Mensagem não pode exceder 1000 caracteres');
  }
  if (!request.conversationId) {
    throw new Error('ID da conversa é obrigatório');
  }

  const endpoint = `${API_BASE}/${request.conversationId}/messages`;
  
  const payload = {
    content: trimmedContent,
    ...(request.imageUrl && { imageUrl: request.imageUrl }),
  };
  
  console.log('📤 sendMessage API:', {
    conversationId: request.conversationId,
    conversationIdType: typeof request.conversationId,
    contentLength: trimmedContent.length,
    hasImageUrl: !!request.imageUrl,
    imageUrlType: typeof request.imageUrl,
    imageUrlLength: request.imageUrl ? request.imageUrl.length : 0,
    imageUrlPreview: request.imageUrl ? request.imageUrl.substring(0, 50) : null,
    payloadKeys: Object.keys(payload),
    endpoint
  });

  console.log('🔍 Request payload:', {
    content: payload.content.substring(0, 50),
    imageUrl: payload.imageUrl ? 'present (base64 data URL)' : 'not present',
    payloadString: JSON.stringify(payload).substring(0, 150)
  });

  const response = await baseClient.post<Message>(
    endpoint,
    payload
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

/**
 * ADMIN: Reindex conversations for current user
 * Removes orphaned conversations and rebuilds conversation list
 */
export async function reindexConversations(): Promise<{
  success: boolean;
  diagnostics: {
    orphanedDeleted: number;
    validConversations: number;
    rebuiltConversations: number;
    conversations: any[];
  };
}> {
  const response = await baseClient.post(`${API_BASE}/reindex/conversations`, {});
  if (response.error) throw new Error(response.error);
  const data = response.data as any || { success: false, diagnostics: { orphanedDeleted: 0, validConversations: 0, rebuiltConversations: 0, conversations: [] } };
  return data;
}
