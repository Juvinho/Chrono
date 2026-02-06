/**
 * Formata timestamp estilo Facebook Messenger
 * - Hoje: 14:30
 * - Ontem: Ontem
 * - Esta semana: Seg, Ter, Qua...
 * - Mais antigo: 05/02/2026
 */
export function formatTimestamp(timestamp: string | Date): string {
  const date = new Date(timestamp);
  const now = new Date();
  
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = diffInMs / (1000 * 60 * 60);
  const diffInDays = diffInHours / 24;
  
  // Hoje
  if (diffInHours < 24 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  
  // Ontem
  if (diffInDays < 2 && date.getDate() === now.getDate() - 1) {
    return 'Ontem';
  }
  
  // Esta semana
  if (diffInDays < 7) {
    return date.toLocaleDateString('pt-BR', { weekday: 'short' });
  }
  
  // Mais antigo
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
}

/**
 * Formata hora da mensagem (14:30)
 */
export function formatMessageTime(timestamp: string | Date): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
