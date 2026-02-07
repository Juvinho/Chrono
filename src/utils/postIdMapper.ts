/**
 * Post ID Mapper - Gerencia mapeamento entre IDs randômicos (7 dígitos) e IDs reais de posts
 */

interface PostIdMapping {
  randomId: string;
  realId: string;
}

class PostIdMapper {
  private mappings: Map<string, string> = new Map(); // randomId -> realId
  private reverseMappings: Map<string, string> = new Map(); // realId -> randomId
  private readonly STORAGE_KEY = 'chrono_post_id_mappings';

  constructor() {
    this.loadFromStorage();
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

    // Gera novo ID randômico (garante unicidade)
    let randomId = this.generateRandomId();
    while (this.mappings.has(randomId)) {
      randomId = this.generateRandomId();
    }

    // Armazena mapeamento bidirecional
    this.mappings.set(randomId, realId);
    this.reverseMappings.set(realId, randomId);

    // Persiste no localStorage
    this.saveToStorage();

    return randomId;
  }

  /**
   * Obtém o ID real a partir do ID randômico
   */
  getRealId(randomId: string): string | null {
    return this.mappings.get(randomId) || null;
  }

  /**
   * Verifica se um ID randômico é válido e retorna o ID real
   */
  resolveId(idString: string): string | null {
    // Se parecer um ID randômico (7 dígitos), tenta resolver
    if (/^\d{7}$/.test(idString)) {
      return this.mappings.get(idString) || null;
    }
    // Senão é um ID real, retorna direto
    return idString;
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
      const data = Array.from(this.mappings.entries());
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
        const mappings: Array<[string, string]> = JSON.parse(data);
        mappings.forEach(([randomId, realId]) => {
          this.mappings.set(randomId, realId);
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
