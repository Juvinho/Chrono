import { Post, User } from '../types/index';
import { apiClient } from '../utils/api';

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
    if (term.length < 2) return [];
    
    try {
      const response = await apiClient.searchUsers(term.trim());
      return response.data || [];
    } catch (error) {
      console.error('User search failed:', error);
      return [];
    }
  }

  /**
   * Busca por cordão específico (ex: $ossodemais)
   */
  static searchCordoes(term: string, allPosts: Post[]): Post[] {
    if (!term.startsWith('$')) return [];

    const pattern = new RegExp(`\\${term.substring(1)}\\b`, 'i');
    return allPosts.filter(p => pattern.test(p.content));
  }

  /**
   * Busca genérica por keyword em posts
   */
  static searchPosts(keyword: string, allPosts: Post[]): Post[] {
    const lowerKeyword = keyword.toLowerCase();
    return allPosts.filter(p =>
      p.content.toLowerCase().includes(lowerKeyword) ||
      p.author.username.toLowerCase().includes(lowerKeyword)
    );
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

    if (term.length < 2) {
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

      cordoes = resultados
        .filter(p => p.isThread || this.hasCordaoTag(p))
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
   * Carrega cordões em alta (trending)
   */
  static async fetchTrendingCordoes(): Promise<TrendingCordao[]> {
    try {
      const response = await apiClient.get('/posts/trending/cordoes');
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Failed to load trending cordões:', error);
      return [];
    }
  }

  /**
   * Recomendações padrão (sem busca)
   */
  static getRecommendations(
    allPosts: Post[],
    allUsers: User[],
    currentUser: User,
    limit = 5
  ) {
    return {
      popularCordoes: allPosts
        .filter(p => this.isCordao(p))
        .sort((a, b) => this.getPopularity(b) - this.getPopularity(a))
        .slice(0, limit),

      popularPosts: allPosts
        .filter(p => !this.isCordao(p))
        .sort((a, b) => this.getPopularity(b) - this.getPopularity(a))
        .slice(0, limit),

      suggestedUsers: allUsers
        .filter(u => u.username !== currentUser.username && !currentUser.followingList?.includes(u.username))
        .slice(0, limit),
    };
  }

  /**
   * Conta menções de um cordão em todos os posts
   */
  static countCordaoMentions(cordao: string, allPosts: Post[]): number {
    const pattern = new RegExp(`\\${cordao}\\b`, 'i');
    return allPosts.filter(p => pattern.test(p.content)).length;
  }
}
