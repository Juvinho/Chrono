import LZ from 'lz-string';

/**
 * Storage Manager com Compressão e Limite de Tamanho
 * Resolve problemas de QuotaExceededError
 */

const STORAGE_LIMITS = {
  maxPerKey: 300 * 1024,  // 300KB por chave (aumentado de 100KB)
  maxTotal: 5 * 1024 * 1024, // 5MB total (aumentado de 4MB)
  softLimit: 4 * 1024 * 1024, // 4MB (começa a limpar antes de atingir limite)
};

// I-13: TTL Configuration (24 horas em milliseconds)
const TTL_CONFIG = {
  DEFAULT_TTL: 24 * 60 * 60 * 1000, // 24 horas
  KEY_SPECIFIC_TTL: {
    'chrono_currentUser_v4': 24 * 60 * 60 * 1000, // User data: 24 horas
    'chrono_token': 24 * 60 * 60 * 1000, // Auth token: 24 horas
    'chrono_notifications': 1 * 60 * 60 * 1000, // Notifications: 1 hora
  }
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
 * I-13: Verifica se um item armazenado expirou (TTL validation)
 * Retorna true se o item ainda é válido, false se expirou
 */
export function isDataExpired(key: string, schema: StorageSchema): boolean {
  if (!schema.timestamp) return true; // Sem timestamp = expirado

  const ttl = TTL_CONFIG.KEY_SPECIFIC_TTL[key as keyof typeof TTL_CONFIG.KEY_SPECIFIC_TTL] 
    || TTL_CONFIG.DEFAULT_TTL;
  const now = Date.now();
  const age = now - schema.timestamp;

  const expired = age > ttl;
  if (expired) {
    console.log(`[StorageManager] Data expirou para chave ${key}: ${(age / 1000 / 60).toFixed(1)}min idade (TTL: ${(ttl / 1000 / 60).toFixed(1)}min)`);
  }
  return expired;
}

/**
 * I-13: Limpa dados expirados do localStorage
 * Remove todas as chaves com TTL excedido
 */
export function cleanupExpiredData(): void {
  let removedCount = 0;
  const keysToRemove: string[] = [];

  for (let key in localStorage) {
    if (!localStorage.hasOwnProperty(key)) continue;

    try {
      const item = localStorage.getItem(key);
      if (!item) continue;

      const schema = JSON.parse(item) as StorageSchema;
      if (schema.version && schema.timestamp && isDataExpired(key, schema)) {
        keysToRemove.push(key);
        removedCount++;
      }
    } catch {
      // Se não conseguir parsear, ignora
    }
  }

  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });

  if (removedCount > 0) {
    console.log(`[StorageManager] Limpeza concluída: ${removedCount} chaves expiradas removidas`);
  }
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
 * Carrega de dados comprimidos com validação de TTL (I-13)
 */
export function getCompressed(key: string): any {
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;

    try {
      const schema = JSON.parse(item) as StorageSchema;

      // I-13: Verifica se os dados expiraram
      if (schema.version === 1 && isDataExpired(key, schema)) {
        console.log(`[StorageManager] Removendo dados expirados: ${key}`);
        localStorage.removeItem(key);
        return null;
      }

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
