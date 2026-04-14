import { Post, User } from '../types/index';
import { apiClient } from '../api';

export interface SearchQuery {
  term: string;
  type?: 'all' | 'users' | 'posts' | 'cordoes';
}

export interface SearchResults {
  users: User[];
  cordoes: Post[];
  posts: Post[];
  total: number;
  query: string;
}

export interface TrendingCordao {
  tag: string;
  displayName: string;
  mentions: number;
}

/**
 * Serviço centralizado de pesquisa da Crono
 * Responsável por toda a lógica de busca
 */
export class SearchService {
  /**
   * Sanitiza termo de busca removendo caracteres especiais perigosos para regex
   * @param term - Termo bruto de busca
   * @returns Termo sanitizado seguro para regex
   */
  static sanitizeSearchTerm(term: string): string {
    // Escapar caracteres especiais de regex
    return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim();
  }

  /**
   * Extrai cordões de um texto
   */
  static extractCordoes(text: string): string[] {
    const matches = text.match(/\$[A-Za-z0-9_]+/g) || [];
    return [...new Set(matches)];
  }

  /**
   * Verifica se um post é um cordão (thread ou tem tag)
   */
  static isCordao(post: Post): boolean {
    return post.isThread || this.hasCordaoTag(post);
  }

  /**
   * Verifica se um post tem tag de cordão
   */
  static hasCordaoTag(post: Post): boolean {
    return /\$[A-Za-z0-9_]+/.test(post.content);
  }

  /**
   * Filtra posts por popularidade (engajamento)
   */
  static getPopularity(post: Post): number {
    const reactions = Object.values(post.reactions || {}).reduce((a, c) => a + (c || 0), 0);
    const replies = post.replies?.length || 0;
    return reactions + replies * 2;
  }

  /**
   * Pesquisa de users na API
   */
  static async searchUsers(term: string): Promise<User[]> {
    if (term.length < 1) return [];
    
    try {
      const response = await apiClient.searchUsers(term.trim());
      return response.data || [];
    } catch (error) {
      console.error('User search failed:', error);
      return [];
    }
  }

  /**
   * Busca por cordão com algoritmo de prefixo/substring relevante.
   * Ex: "$osso" encontra $ossodemais (prefixo) e $meuosso (substring).
   * Ordem: prefixo exato > outros prefixos > substring > popularidade.
   */
  static searchCordoes(term: string, allPosts: Post[]): Post[] {
    if (!term.startsWith('$')) return [];

    const query = term.substring(1).toLowerCase();
    if (!query) return [];

    // Extract all cords from a post's content
    const getCords = (content: string) =>
      (content.match(/\$[A-Za-z0-9_]+/g) || []).map(t => t.substring(1).toLowerCase());

    const exactMatches: Post[] = [];
    const prefixMatches: Post[] = [];
    const substringMatches: Post[] = [];
    const seen = new Set<string>();

    for (const post of allPosts) {
      const cords = getCords(post.content);
      const isExact    = cords.some(c => c === query);
      const isPrefix   = !isExact && cords.some(c => c.startsWith(query));
      const isSubstr   = !isExact && !isPrefix && cords.some(c => c.includes(query));

      if (isExact)   { exactMatches.push(post);    seen.add(post.id); }
      else if (isPrefix)   { prefixMatches.push(post);  seen.add(post.id); }
      else if (isSubstr)   { substringMatches.push(post); seen.add(post.id); }
    }

    const byPopularity = (a: Post, b: Post) => this.getPopularity(b) - this.getPopularity(a);

    return [
      ...exactMatches.sort(byPopularity),
      ...prefixMatches.sort(byPopularity),
      ...substringMatches.sort(byPopularity),
    ];
  }

  /**
   * Busca genérica por keyword em posts
   */
  static searchPosts(keyword: string, allPosts: Post[]): Post[] {
    const lowerKeyword = keyword.toLowerCase();
    return allPosts.filter(p => {
      try {
        return (
          p.content.toLowerCase().includes(lowerKeyword) ||
          p.author.username.toLowerCase().includes(lowerKeyword)
        );
      } catch {
        return false; // Se busca falhar, excluir post
      }
    });
  }

  /**
   * Executa pesquisa completa (users, posts, cordões)
   */
  static async performSearch(
    query: string,
    allPosts: Post[],
    allUsers: User[]
  ): Promise<SearchResults> {
    const term = query.trim().toLowerCase();

    if (term.length < 1) {
      return {
        users: [],
        cordoes: [],
        posts: [],
        total: 0,
        query: term,
      };
    }

    // Pesquisa de users na API
    const users = await this.searchUsers(term);
    console.log(`[Search] Users (${term}):`, users.length);

    // Se começa com $, busca específica de cordão
    let cordoes: Post[] = [];
    let posts: Post[] = [];

    if (term.startsWith('$')) {
      cordoes = this.searchCordoes(term, allPosts)
        .filter(p => p.isThread || this.hasCordaoTag(p))
        .sort((a, b) => this.getPopularity(b) - this.getPopularity(a));

      posts = this.searchCordoes(term, allPosts)
        .filter(p => !p.isThread && !this.hasCordaoTag(p))
        .sort((a, b) => this.getPopularity(b) - this.getPopularity(a));
    } else {
      // Busca genérica
      const resultados = this.searchPosts(term, allPosts);
      console.log(`[Search] Post matches (${term}):`, resultados.length);

      // Filtra cordões garantindo que o nome da tag contém o termo (case-insensitive)
      cordoes = resultados
        .filter(p => p.isThread || this.hasCordaoTag(p))
        .filter(p => {
          const tags = this.extractCordoes(p.content);
          return tags.some(tag => tag.toLowerCase().includes(term.toLowerCase()));
        })
        .sort((a, b) => this.getPopularity(b) - this.getPopularity(a));

      posts = resultados
        .filter(p => !p.isThread && !this.hasCordaoTag(p))
        .sort((a, b) => this.getPopularity(b) - this.getPopularity(a));
    }

    return {
      users,
      cordoes,
      posts,
      total: users.length + cordoes.length + posts.length,
      query: term,
    };
  }

  /**
   * Carrega cordões em alta (trending) do backend
   */
  static async fetchTrendingCordoes(): Promise<TrendingCordao[]> {
    try {
      const response = await apiClient.get('/posts/trending/cordoes');
      
      if (response.data && Array.isArray(response.data)) {
        // Converter dados do backend para TrendingCordao
        return response.data.map((cord: any) => ({
          tag: cord.tag,
          mentions: cord.mentions,
          displayName: cord.displayName,
          content: cord.displayName, // para compatibilidade
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Failed to load trending cordões:', error);
      return [];
    }
  }

  /**
   * Recomendações padrão (sem busca)
   * Filtra apenas posts dos últimos 7 dias para cordões populares
   */
  static getRecommendations(
    allPosts: Post[],
    allUsers: User[],
    currentUser: User,
    limit = 5
  ) {
    // Janela de tempo: últimos 7 dias
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Filtrar posts dos últimos 7 dias
    const recentPosts = allPosts.filter(p => {
      const postDate = new Date(p.timestamp);
      return postDate >= sevenDaysAgo;
    });

    return {
      // Popular cordões baseados apenas em atividade recente (últimos 7 dias)
      popularCordoes: recentPosts
        .filter(p => this.isCordao(p))
        .sort((a, b) => this.getPopularity(b) - this.getPopularity(a))
        .slice(0, limit),

      // Popular posts recentes (também filtrado)
      popularPosts: recentPosts
        .filter(p => !this.isCordao(p))
        .sort((a, b) => this.getPopularity(b) - this.getPopularity(a))
        .slice(0, limit),

      suggestedUsers: allUsers
        .filter(u => u.username !== currentUser.username && !currentUser.followingList?.includes(u.username))
        .slice(0, limit),
    };
  }

  /**
   * Conta menções de um cordão apenas nos últimos 7 dias
   */
  static countCordaoMentions(cordao: string, allPosts: Post[]): number {
    // Janela de tempo: últimos 7 dias
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const pattern = new RegExp(`\\${cordao}\\b`, 'i');
    return allPosts.filter(p => {
      const postDate = new Date(p.timestamp);
      return postDate >= sevenDaysAgo && pattern.test(p.content);
    }).length;
  }
}
