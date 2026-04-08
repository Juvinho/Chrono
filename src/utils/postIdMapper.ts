/**
 * Post ID Mapper - Gerencia mapeamento entre IDs randômicos (7 dígitos) e IDs reais de posts
 */

interface PostIdMapping {
  randomId: string;
  realId: string;
  timestamp?: number; // TTL tracking
}

interface StoredMapping {
  randomId: string;
  realId: string;
  timestamp: number;
}

class PostIdMapper {
  private mappings: Map<string, { realId: string; timestamp: number }> = new Map(); // randomId -> { realId, timestamp }
  private reverseMappings: Map<string, string> = new Map(); // realId -> randomId
  private readonly STORAGE_KEY = 'chrono_post_id_mappings';
  private readonly MAX_ENTRIES = 1000;
  private readonly TTL_DAYS = 30;
  private readonly TTL_MS = this.TTL_DAYS * 24 * 60 * 60 * 1000; // 30 days

  constructor() {
    this.loadFromStorage();
    this.cleanup();
  }

  /**
   * Gera um ID randômico de 7 dígitos
   */
  private generateRandomId(): string {
    return Math.floor(1000000 + Math.random() * 9000000).toString();
  }

  /**
   * Cria ou retorna um ID randômico para um post real
   */
  getRandomId(realId: string): string {
    // Se já existe mapeamento, retorna o ID randômico existente
    if (this.reverseMappings.has(realId)) {
      return this.reverseMappings.get(realId)!;
    }

    // Check if we're at max capacity - remove oldest entry
    if (this.mappings.size >= this.MAX_ENTRIES) {
      const oldestEntry = Array.from(this.mappings.entries()).sort(
        ([, a], [, b]) => a.timestamp - b.timestamp
      )[0];
      
      if (oldestEntry) {
        const [oldRandomId, { realId: oldRealId }] = oldestEntry;
        this.mappings.delete(oldRandomId);
        this.reverseMappings.delete(oldRealId);
      }
    }

    // Gera novo ID randômico (garante unicidade)
    let randomId = this.generateRandomId();
    while (this.mappings.has(randomId)) {
      randomId = this.generateRandomId();
    }

    // Armazena mapeamento bidirecional com timestamp
    const now = Date.now();
    this.mappings.set(randomId, { realId, timestamp: now });
    this.reverseMappings.set(realId, randomId);

    // Persiste no localStorage
    this.saveToStorage();

    return randomId;
  }

  /**
   * Obtém o ID real a partir do ID randômico
   */
  getRealId(randomId: string): string | null {
    const entry = this.mappings.get(randomId);
    return entry ? entry.realId : null;
  }

  /**
   * Verifica se um ID randômico é válido e retorna o ID real
   */
  resolveId(idString: string): string | null {
    // Se parecer um ID randômico (7 dígitos), tenta resolver
    if (/^\d{7}$/.test(idString)) {
      const mapping = this.mappings.get(idString);
      return mapping ? mapping.realId : null;
    }
    // Senão é um ID real, retorna direto
    return idString;
  }

  /**
   * Limpa mapeamentos expirados (>30 dias) e entries em excesso (>1000)
   * Chamado automaticamente no constructor e pode ser chamado manualmente
   */
  cleanup(): void {
    const now = Date.now();
    let removed = 0;

    // Remove entries expiradas (TTL)
    for (const [randomId, { realId, timestamp }] of Array.from(this.mappings.entries())) {
      if (now - timestamp > this.TTL_MS) {
        this.mappings.delete(randomId);
        this.reverseMappings.delete(realId);
        removed++;
      }
    }

    // Se ainda está acima do limite, remove as mais antigas
    while (this.mappings.size > this.MAX_ENTRIES) {
      const oldestEntry = Array.from(this.mappings.entries()).sort(
        ([, a], [, b]) => a.timestamp - b.timestamp
      )[0];
      
      if (oldestEntry) {
        const [oldRandomId, { realId: oldRealId }] = oldestEntry;
        this.mappings.delete(oldRandomId);
        this.reverseMappings.delete(oldRealId);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`[PostIdMapper] Cleaned up ${removed} expired entries`);
      this.saveToStorage();
    }
  }

  /**
   * Limpa todos os mapeamentos
   */
  clear(): void {
    this.mappings.clear();
    this.reverseMappings.clear();
    this.saveToStorage();
  }

  /**
   * Salva os mapeamentos no localStorage
   */
  private saveToStorage(): void {
    try {
      const data: StoredMapping[] = Array.from(this.mappings.entries()).map(
        ([randomId, { realId, timestamp }]) => ({
          randomId,
          realId,
          timestamp
        })
      );
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save post ID mappings:', error);
    }
  }

  /**
   * Carrega os mapeamentos do localStorage
   */
  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (data) {
        const mappings: StoredMapping[] = JSON.parse(data);
        mappings.forEach(({ randomId, realId, timestamp }) => {
          this.mappings.set(randomId, { realId, timestamp });
          this.reverseMappings.set(realId, randomId);
        });
      }
    } catch (error) {
      console.error('Failed to load post ID mappings:', error);
    }
  }

  /**
   * Obtém todas as URLs compartilháveis de posts
   */
  getShareUrl(realId: string): string {
    const randomId = this.getRandomId(realId);
    return `${window.location.origin}/post/${randomId}`;
  }
}

export const postIdMapper = new PostIdMapper();
