// ✅ Stub simples - atualização via callbacks diretos do EchoFrame
import { Post } from '../types/index';

let onNewPost: ((post: Post) => void) | null = null;

export function setOnNewPostCallback(callback: (post: Post) => void) {
  onNewPost = callback;
}

export function useRealtimeFeed() {
  // Hook vazio - EchoFrame chama onNewPost diretamente quando post é criado
  console.log('[useRealtimeFeed] ✅ Esperando posts via callbacks diretos (sem polling)');
  return null;
}
