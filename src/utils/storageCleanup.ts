// 🧹 Utilitário para limpar e gerenciar localStorage
import { postIdMapper } from './postIdMapper';
import { cleanupExpiredData } from './storageManager';

export function cleanupLocalStorage() {
  try {
    console.log('[🧹 Storage Cleanup] Iniciando limpeza...');
    
    // I-13: Limpar dados expirados com TTL
    cleanupExpiredData();
    
    // Cleanup post ID mapper TTL entries
    postIdMapper.cleanup();
    
    const itemsToClean = [
      'chrono_users_v4',  // Usuários em cache - sempre fetch fresh (I-13)
      'chrono_posts_cache', // Posts em cache
      'echo_frame_posts', // Posts do echo frame
      'feed_data', // Dados do feed
      'reactions_cache', // Reações em cache
    ];

    let freedSpace = 0;
    itemsToClean.forEach((key) => {
      const item = localStorage.getItem(key);
      if (item) {
        const size = new Blob([item]).size;
        localStorage.removeItem(key);
        freedSpace += size;
        console.log(`[🧹 Storage Cleanup] ✅ Removido ${key} (${(size / 1024).toFixed(2)}KB)`);
      }
    });

    console.log(`[🧹 Storage Cleanup] 📊 Espaço liberado: ${(freedSpace / 1024).toFixed(2)}KB`);
    return true;
  } catch (error) {
    console.error('[🧹 Storage Cleanup] ❌ Erro ao limpar storage:', error);
    return false;
  }
}

// Tentar limpar se localStorage está cheio
export function handleQuotaExceeded() {
  try {
    // Limpar dados em cache
    cleanupLocalStorage();
    
    // Se ainda estiver cheio, remover dados antigos
    const allKeys = Object.keys(localStorage);
    allKeys.forEach((key) => {
      if (key.includes('cache') || key.includes('temp') || key.includes('debug')) {
        localStorage.removeItem(key);
        console.log(`[🧹 Storage] Removido ${key}`);
      }
    });

    return true;
  } catch (error) {
    console.error('[🧹 Storage] Erro crítico:', error);
    return false;
  }
}

// 🛡️ Safe wrapper para localStorage.setItem com detecção de quota
export function safeSetItem(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch (error: any) {
    if (error.name === 'QuotaExceededError') {
      console.warn(`[🛡️ Storage Safe] localStorage cheio para ${key}`);
      
      // Tentar limpar e retry
      if (handleQuotaExceeded()) {
        try {
          localStorage.setItem(key, value);
          console.log(`[🛡️ Storage Safe] ✅ Retry bem-sucedido para ${key}`);
        } catch (retryError) {
          console.error(`[🛡️ Storage Safe] ❌ Falha após limpeza:`, retryError);
        }
      }
    } else {
      console.error('[🛡️ Storage Safe] Erro ao salvar:', error);
    }
  }
}
