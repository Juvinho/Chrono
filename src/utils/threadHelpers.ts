import { Post } from '../types/index';

/**
 * Calcula a duração de um thread (tempo entre primeiro e último post)
 * @param posts - Array de posts do thread
 * @returns String formatada da duração (ex: "4 dias", "2 horas")
 */
export function calculateThreadDuration(posts: Post[]): string {
  if (!posts || posts.length === 0) {
    return 'Sem posts';
  }

  // Se há apenas 1 post, a duração é "Hoje"
  if (posts.length === 1) {
    return 'Hoje';
  }

  // Ordenar posts por data
  const sortedPosts = [...posts].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const firstDate = new Date(sortedPosts[0].createdAt);
  const lastDate = new Date(sortedPosts[sortedPosts.length - 1].createdAt);

  // Calcular diferença
  const diffMs = lastDate.getTime() - firstDate.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  // Retornar formato legível adaptativo
  if (diffYears > 0) return diffYears === 1 ? '1 ano' : `${diffYears} anos`;
  if (diffMonths > 0) return diffMonths === 1 ? '1 mês' : `${diffMonths} meses`;
  if (diffDays > 0) return diffDays === 1 ? '1 dia' : `${diffDays} dias`;
  if (diffHours > 0) return diffHours === 1 ? '1 hora' : `${diffHours} horas`;
  if (diffMinutes > 0) return diffMinutes === 1 ? '1 minuto' : `${diffMinutes} minutos`;

  return 'Agora';
}

/**
 * Formata a duração de forma curta (ex: "4d" para 4 dias)
 * Útil para cards compactos
 */
export function formatThreadDurationShort(posts: Post[]): string {
  const full = calculateThreadDuration(posts);

  // Mapear formatos completos para abreviações
  const matches = full.match(/(\d+)\s*(ano|mês|dia|hora|minuto)/i);
  if (matches) {
    const [, number, unit] = matches;
    const unitMap: Record<string, string> = {
      ano: 'a',
      mês: 'm',
      dia: 'd',
      hora: 'h',
      minuto: 'min',
    };
    return `${number}${unitMap[unit.toLowerCase()] || unit[0]}`;
  }

  return full; // Fallback
}
