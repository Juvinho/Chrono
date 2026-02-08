import { pool } from '../db/connection.js';

interface UserStats {
  userId: string;
  username: string;
  displayName: string;
  customBio: string | null;
  avatar: string | null;
  joinedAt: Date;
  isVerified: boolean;
  totalPosts: number;
  totalLikesGiven: number;
  totalLikesReceived: number;
  totalCommentsGiven: number;
  totalFollowers: number;
  totalFollowing: number;
  postsLast30Days: number;
  likesToPostsRatio: number;
  daysSinceJoined: number;
}

export class UserBioService {
  
  /**
   * Gera bio automática baseada em estatísticas
   */
  async generateAutoBio(userId: string): Promise<string> {
    const stats = await this.getUserStats(userId);
    
    if (!stats) {
      return 'Novo usuário explorando o Chrono.';
    }
    
    const parts: string[] = [];
    
    // Introdução baseada em atividade
    if (stats.totalPosts > 100) {
      parts.push(`Criador prolífico de conteúdo no @Chrono.`);
    } else if (stats.totalPosts > 20) {
      parts.push(`Criador ativo de histórias.`);
    } else if (stats.likesToPostsRatio > 10) {
      parts.push(`Observador silencioso que aprecia bom conteúdo.`);
    } else if (stats.totalPosts > 0) {
      parts.push(`Compartilhando momentos no @Chrono.`);
    } else {
      parts.push(`Novo no @Chrono, explorando possibilidades.`);
    }
    
    // Tempo na plataforma
    const monthsActive = Math.floor(stats.daysSinceJoined / 30);
    const yearsActive = Math.floor(stats.daysSinceJoined / 365);
    
    if (yearsActive > 0) {
      parts.push(`Veterano de ${yearsActive} ${yearsActive === 1 ? 'ano' : 'anos'}.`);
    } else if (monthsActive > 6) {
      parts.push(`Ativo há ${monthsActive} meses.`);
    } else if (monthsActive > 0) {
      parts.push(`Membro desde ${this.getMonthName(stats.joinedAt)}.`);
    }
    
    // Comportamento social
    if (stats.totalFollowers > 1000) {
      parts.push(`Influenciador com ${this.formatNumber(stats.totalFollowers)} seguidores.`);
    } else if (stats.totalFollowers > 100) {
      parts.push(`Construindo uma comunidade engajada.`);
    }
    
    // Interações
    if (stats.totalLikesGiven > stats.totalPosts * 20 && stats.totalPosts > 0) {
      parts.push(`Apreciador entusiasta da criatividade alheia.`);
    } else if (stats.totalCommentsGiven > 100) {
      parts.push(`Conversador ativo nos comentários.`);
    }
    
    // Atividade recente
    if (stats.postsLast30Days > 20) {
      parts.push(`Postando diariamente.`);
    } else if (stats.postsLast30Days > 10) {
      parts.push(`Frequentemente ativo.`);
    }
    
    return parts.join(' ');
  }
  
  /**
   * Busca estatísticas do usuário
   */
  private async getUserStats(userId: string): Promise<UserStats | null> {
    try {
      const result = await pool.query(`
        SELECT 
          u.id AS user_id,
          u.username,
          u.display_name,
          u.bio AS custom_bio,
          u.avatar_url AS avatar,
          u.created_at AS joined_at,
          u.verified AS is_verified,
          
          COUNT(DISTINCT p.id) AS total_posts,
          COUNT(DISTINCT l.id) AS total_likes_given,
          COUNT(DISTINCT l2.id) AS total_likes_received,
          COUNT(DISTINCT c.id) AS total_comments_given,
          COUNT(DISTINCT f.id) AS total_followers,
          COUNT(DISTINCT f2.id) AS total_following,
          
          COUNT(DISTINCT CASE WHEN p.created_at > NOW() - INTERVAL '30 days' 
              THEN p.id END) AS posts_last_30_days,
          
          CASE 
              WHEN COUNT(DISTINCT p.id) > 0 THEN
                  COUNT(DISTINCT l.id)::DECIMAL / COUNT(DISTINCT p.id)
              ELSE 0
          END AS likes_to_posts_ratio,
          
          EXTRACT(DAY FROM NOW() - u.created_at)::INTEGER AS days_since_joined
        
        FROM users u
        LEFT JOIN posts p ON u.id = p.user_id
        LEFT JOIN likes l ON u.id = l.user_id
        LEFT JOIN likes l2 ON p.id = l2.post_id
        LEFT JOIN comments c ON u.id = c.user_id
        LEFT JOIN follows f ON u.id = f.following_id
        LEFT JOIN follows f2 ON u.id = f2.follower_id
        
        WHERE u.id = $1
        GROUP BY u.id, u.username, u.display_name, u.bio, u.created_at, u.verified
      `, [userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        userId: row.user_id,
        username: row.username,
        displayName: row.display_name,
        customBio: row.custom_bio,
        avatar: row.avatar,
        joinedAt: new Date(row.joined_at),
        isVerified: row.is_verified,
        totalPosts: parseInt(row.total_posts, 10),
        totalLikesGiven: parseInt(row.total_likes_given, 10),
        totalLikesReceived: parseInt(row.total_likes_received, 10),
        totalCommentsGiven: parseInt(row.total_comments_given, 10),
        totalFollowers: parseInt(row.total_followers, 10),
        totalFollowing: parseInt(row.total_following, 10),
        postsLast30Days: parseInt(row.posts_last_30_days, 10),
        likesToPostsRatio: parseFloat(row.likes_to_posts_ratio),
        daysSinceJoined: row.days_since_joined,
      };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return null;
    }
  }
  
  /**
   * Calcula quais tags o usuário deve receber automaticamente
   */
  async calculateAutoTags(userId: string): Promise<string[]> {
    const stats = await this.getUserStats(userId);
    
    if (!stats) return [];
    
    const tags: string[] = [];
    
    // Tag: Verificado (manual, mas pode ser incluída se is_verified = true)
    if (stats.isVerified) {
      tags.push('verified');
    }
    
    // Tag: Observador (likes muito mais que posts)
    if (stats.likesToPostsRatio > 10 && stats.totalLikesGiven > 50) {
      tags.push('observer');
    }
    
    // Tag: Criador (muitos posts)
    if (stats.totalPosts > 50) {
      tags.push('creator');
    }
    
    // Tag: Contador de Histórias (posts com descrição customizada)
    if (stats.totalPosts > 20 && stats.customBio && stats.customBio.length > 50) {
      tags.push('storyteller');
    }
    
    // Tag: Social (muitos comentários)
    if (stats.totalCommentsGiven > 100) {
      tags.push('social');
    }
    
    // Tag: Pioneiro (primeiros usuários - verificar quanto tempo tem)
    if (stats.daysSinceJoined > 300 && stats.totalPosts > 0) {
      tags.push('pioneer');
    }
    
    // Tag: Veterano (mais de 365 dias)
    if (stats.daysSinceJoined > 365) {
      tags.push('veteran');
    }
    
    // Tag: Ativo (postando regularmente)
    if (stats.postsLast30Days > 10) {
      tags.push('active');
    }
    
    // Tag: Popular (mais de 1000 seguidores)
    if (stats.totalFollowers >= 1000) {
      tags.push('popular');
    }
    
    // Tag: Influenciador (mais de 10k seguidores)
    if (stats.totalFollowers >= 10000) {
      tags.push('influencer');
    }
    
    // Tag: Prolífico (mais de 100 posts)
    if (stats.totalPosts >= 100) {
      tags.push('prolific');
    }
    
    return tags;
  }
  
  /**
   * Atualiza tags do usuário
   */
  async updateUserTags(userId: string): Promise<void> {
    try {
      const calculatedTags = await this.calculateAutoTags(userId);
      
      // Remove tags automáticas antigas (não remove tags do tipo 'system')
      await pool.query(`
        DELETE FROM user_tags
        WHERE user_id = $1
          AND tag_key IN (
            SELECT tag_key FROM tag_definitions 
            WHERE tag_type != 'system'
          )
      `, [userId]);
      
      // Adiciona novas tags
      for (const tagKey of calculatedTags) {
        await pool.query(`
          INSERT INTO user_tags (user_id, tag_key)
          VALUES ($1, $2)
          ON CONFLICT (user_id, tag_key) DO NOTHING
        `, [userId, tagKey]);
      }
      
      console.log(`✅ Updated tags for user ${userId}: ${calculatedTags.join(', ')}`);
    } catch (error) {
      console.error('Error updating user tags:', error);
      throw error;
    }
  }
  
  /**
   * Busca todas as tags de um usuário
   */
  async getUserTags(userId: string) {
    try {
      const result = await pool.query(`
        SELECT 
          ut.tag_key,
          td.display_name,
          td.description,
          td.color,
          td.icon,
          td.tag_type,
          ut.earned_at
        FROM user_tags ut
        JOIN tag_definitions td ON ut.tag_key = td.tag_key
        WHERE ut.user_id = $1 AND td.is_active = true
        ORDER BY td.display_order ASC, ut.earned_at ASC
      `, [userId]);
      
      return result.rows.map(row => ({
        key: row.tag_key,
        displayName: row.display_name,
        description: row.description,
        color: row.color,
        icon: row.icon,
        type: row.tag_type,
        earnedAt: row.earned_at,
      }));
    } catch (error) {
      console.error('Error fetching user tags:', error);
      return [];
    }
  }
  
  // Helpers
  private getMonthName(date: Date): string {
    const months = [
      'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];
    return `${months[date.getMonth()]} de ${date.getFullYear()}`;
  }
  
  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  }
}
