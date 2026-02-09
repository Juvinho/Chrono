import LZ from 'lz-string';

/**
 * Storage Manager com Compressão e Limite de Tamanho
 * Resolve problemas de QuotaExceededError
 */

const STORAGE_LIMITS = {
  maxPerKey: 100 * 1024,  // 100KB por chave
  maxTotal: 4 * 1024 * 1024, // 4MB total
  softLimit: 3 * 1024 * 1024, // 3MB (começa a limpar antes de atingir limite)
};

interface StorageSchema {
  version: number;
  timestamp: number;
  compressed: boolean;
  data: string;
}

/**
 * Comprime dados usando LZ-string
 */
export function compressData(data: any): string {
  try {
    const stringified = JSON.stringify(data);
    return LZ.compress(stringified);
  } catch (error) {
    console.error('[StorageManager] Erro ao comprimir:', error);
    return JSON.stringify(data);
  }
}

/**
 * Descomprime dados
 */
export function decompressData(compressed: string): any {
  try {
    const escaped = LZ.decompress(compressed);
    return escaped ? JSON.parse(escaped) : null;
  } catch (error) {
    try {
      // Fallback - tenta parse direto (se já for JSON normal)
      return JSON.parse(compressed);
    } catch {
      console.error('[StorageManager] Erro ao descomprimir:', error);
      return null;
    }
  }
}

/**
 * Obtém tamanho total do localStorage
 */
export function getTotalStorageSize(): number {
  let totalSize = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      totalSize += localStorage[key].length + key.length;
    }
  }
  return totalSize;
}

/**
 * Lista chaves que ocupam espaço (para debugging)
 */
export function getStorageBreakdown(): { key: string; size: number; percent: number }[] {
  const breakdown: any[] = [];
  const totalSize = getTotalStorageSize();

  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      const size = localStorage[key].length + key.length;
      breakdown.push({
        key,
        size,
        percent: (size / totalSize) * 100
      });
    }
  }

  return breakdown.sort((a, b) => b.size - a.size);
}

/**
 * Limpa dados antigos/grandes
 */
export function optimizeStorage() {
  const breakdown = getStorageBreakdown();
  const totalSize = getTotalStorageSize();

  console.log('[StorageManager] Otimizando storage...');
  console.log('[StorageManager] Tamanho total:', (totalSize / 1024).toFixed(2), 'KB');
  console.log('[StorageManager] Breakdown:', breakdown.slice(0, 10));

  // Remove chaves grandes de cache que não são essenciais
  const toRemove = [
    'echo_frame_posts',
    'chrono_posts_cache',
    'feed_data',
    'reactions_cache',
    'timeline_posts_backup',
    'users_cache',
  ];

  let freed = 0;
  toRemove.forEach(key => {
    if (localStorage.getItem(key)) {
      const size = localStorage.getItem(key)!.length;
      localStorage.removeItem(key);
      freed += size;
      console.log(`[StorageManager] Removido ${key}: ${(size / 1024).toFixed(2)}KB`);
    }
  });

  console.log(`[StorageManager] Espaço liberado: ${(freed / 1024).toFixed(2)}KB`);
  return freed;
}

/**
 * Salva com compressão automática
 */
export function setCompressed(key: string, data: any): boolean {
  try {
    const totalSize = getTotalStorageSize();

    // Se já estamos no limite suave, limpar primeiro
    if (totalSize > STORAGE_LIMITS.softLimit) {
      console.log('[StorageManager] Storage acima do limite suave, otimizando...');
      optimizeStorage();
    }

    const compressed = compressData(data);
    const schema: StorageSchema = {
      version: 1,
      timestamp: Date.now(),
      compressed: true,
      data: compressed,
    };

    const stringified = JSON.stringify(schema);

    // Verificar tamanho
    if (stringified.length > STORAGE_LIMITS.maxPerKey) {
      console.warn(
        `[StorageManager] Chave ${key} muito grande: ${(stringified.length / 1024).toFixed(2)}KB`
      );
      return false;
    }

    localStorage.setItem(key, stringified);
    return true;
  } catch (error: any) {
    if (error.name === 'QuotaExceededError') {
      console.warn(`[StorageManager] Quota excedida ao salvar ${key}`);
      optimizeStorage();

      // Tentar novamente após limpeza
      try {
        const compressed = compressData(data);
        const schema: StorageSchema = {
          version: 1,
          timestamp: Date.now(),
          compressed: true,
          data: compressed,
        };
        localStorage.setItem(key, JSON.stringify(schema));
        console.log('[StorageManager] Salvo com sucesso após limpeza');
        return true;
      } catch (retryError) {
        console.error('[StorageManager] Falha permanente:', retryError);
        return false;
      }
    }
    console.error('[StorageManager] Erro:', error);
    return false;
  }
}

/**
 * Carrega de dados comprimidos
 */
export function getCompressed(key: string): any {
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;

    try {
      const schema = JSON.parse(item) as StorageSchema;

      if (schema.version === 1 && schema.compressed && schema.data) {
        return decompressData(schema.data);
      } else {
        // Fallback para JSON antigo
        return schema;
      }
    } catch {
      // Se não conseguir parsear como schema, tenta direto como compressed
      return decompressData(item);
    }
  } catch (error) {
    console.error(`[StorageManager] Erro ao carregar ${key}:`, error);
    return null;
  }
}

/**
 * Remove chave
 */
export function removeCompressed(key: string): void {
  localStorage.removeItem(key);
}

/**
 * Limpa tudo (cuidado!)
 */
export function clearAllCompressed(): void {
  localStorage.clear();
  console.log('[StorageManager] Storage limpo completamente');
}
