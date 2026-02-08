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
    
    // ==========================================
    // TAGS DE SISTEMA
    // ==========================================
    
    if (stats.isVerified) {
      tags.push('verified');
    }
    
    // Founder: IDs 1-10 (usuários mais antigos)
    const userIdNum = parseInt(userId.substring(0, 8), 16) || 1;
    if (userIdNum <= 10) {
      tags.push('founder');
    }
    
    // ==========================================
    // TAGS DE COMPORTAMENTO - OBSERVADOR/CRIADOR
    // ==========================================
    
    // Observador: likes muito mais que posts
    if (stats.likesToPostsRatio > 10 && stats.totalLikesGiven > 50) {
      tags.push('observer');
    }
    
    // Criador: muitos posts
    if (stats.totalPosts > 50) {
      tags.push('creator');
    }
    
    // ==========================================
    // TAGS DE CONTEÚDO ESPECÍFICO
    // ==========================================
    
    // Storyteller: posts longos (>500 chars) com descrição
    if (stats.totalPosts > 20 && stats.customBio && stats.customBio.length > 50) {
      tags.push('storyteller');
    }
    
    // Visual Artist: muitos posts com imagens
    // Aproximação: se tem muitos posts, assume que alguns têm imagens
    if (stats.totalPosts > 30) {
      try {
        const imagePostsResult = await pool.query(`
          SELECT COUNT(*) as count
          FROM posts
          WHERE user_id = $1 AND content ILIKE '%<img%' OR content ILIKE '%photo%'
        `, [userId]);
        
        const imagePosts = parseInt(imagePostsResult.rows[0]?.count || 0, 10);
        if (imagePosts > stats.totalPosts * 0.4) {
          tags.push('visual_artist');
        }
      } catch (err) {
        // Silently fail on image detection
      }
    }
    
    // Videomaker: posts com vídeos
    if (stats.totalPosts > 10) {
      try {
        const videoPostsResult = await pool.query(`
          SELECT COUNT(*) as count
          FROM posts
          WHERE user_id = $1 AND (content ILIKE '%<video%' OR content ILIKE '%youtube%' OR content ILIKE '%vimeo%')
        `, [userId]);
        
        const videoPosts = parseInt(videoPostsResult.rows[0]?.count || 0, 10);
        if (videoPosts >= 5) {
          tags.push('videomaker');
        }
      } catch (err) {
        // Silently fail on video detection
      }
    }
    
    // Thread Master: posts muito longos (>1000 chars)
    try {
      const threadsResult = await pool.query(`
        SELECT COUNT(*) as count
        FROM posts
        WHERE user_id = $1 AND LENGTH(content) > 1000
      `, [userId]);
      
      const longPosts = parseInt(threadsResult.rows[0]?.count || 0, 10);
      if (longPosts >= 10) {
        tags.push('thread_master');
      }
    } catch (err) {
      // Silently fail
    }
    
    // ==========================================
    // TAGS DE INTERAÇÃO SOCIAL
    // ==========================================
    
    // Social: muitos comentários
    if (stats.totalCommentsGiven > 100) {
      tags.push('social');
    }
    
    // Reply King: sempre responde comentários
    if (stats.totalCommentsGiven > 50) {
      try {
        const repliesResult = await pool.query(`
          SELECT COUNT(*) as count
          FROM comments
          WHERE user_id = $1 AND parent_comment_id IS NOT NULL
        `, [userId]);
        
        const replies = parseInt(repliesResult.rows[0]?.count || 0, 10);
        if (replies > stats.totalCommentsGiven * 0.6) {
          tags.push('reply_king');
        }
      } catch (err) {
        // Silently fail
      }
    }
    
    // Debater: comentários longos e engajados
    if (stats.totalCommentsGiven > 30) {
      try {
        const longCommentsResult = await pool.query(`
          SELECT COUNT(*) as count
          FROM comments
          WHERE user_id = $1 AND LENGTH(content) > 200
        `, [userId]);
        
        const deepComments = parseInt(longCommentsResult.rows[0]?.count || 0, 10);
        if (deepComments > stats.totalCommentsGiven * 0.5) {
          tags.push('debater');
        }
      } catch (err) {
        // Silently fail
      }
    }
    
    // ==========================================
    // TAGS DE ENGAGEMENT
    // ==========================================
    
    // Viral: um post com >1000 likes
    try {
      const viralResult = await pool.query(`
        SELECT MAX(COALESCE((data->'likes')::int, 0)) as max_likes
        FROM posts
        WHERE user_id = $1
      `, [userId]);
      
      const maxLikes = parseInt(viralResult.rows[0]?.max_likes || 0, 10);
      if (maxLikes > 1000) {
        tags.push('viral');
      }
    } catch (err) {
      // Silently fail
    }
    
    // Trending: posts aparecem em trending (muitos posts com alto engajamento)
    if (stats.totalLikesReceived > stats.totalPosts * 50) {
      tags.push('trending');
    }
    
    // Engagement God: taxa média de engajamento >20%
    if (stats.totalPosts > 0) {
      const avgEngagement = stats.totalLikesReceived / (stats.totalPosts * 10);
      if (avgEngagement > 0.2) {
        tags.push('engagement_god');
      }
    }
    
    // ==========================================
    // TAGS DE TEMPO/HÁBITOS
    // ==========================================
    
    // Pioneiro: primeiros usuários + posts
    if (stats.daysSinceJoined > 300 && stats.totalPosts > 0) {
      tags.push('pioneer');
    }
    
    // Veterano: mais de 365 dias
    if (stats.daysSinceJoined > 365) {
      tags.push('veteran');
    }
    
    // Ativo: postando regularmente
    if (stats.postsLast30Days > 10) {
      tags.push('active');
    }
    
    // Beta Tester: cadastrado antes de 2025
    if (stats.joinedAt < new Date('2025-01-01')) {
      tags.push('beta_tester');
    }
    
    // Insomniac: posta entre 00h-06h
    if (stats.totalPosts > 20) {
      try {
        const insomniaCResult = await pool.query(`
          SELECT COUNT(*) as count
          FROM posts
          WHERE user_id = $1 AND EXTRACT(HOUR FROM created_at) BETWEEN 0 AND 5
        `, [userId]);
        
        const insomniaPosts = parseInt(insomniaCResult.rows[0]?.count || 0, 10);
        if (insomniaPosts > stats.totalPosts * 0.3) {
          tags.push('insomniac');
        }
      } catch (err) {
        // Silently fail
      }
    }
    
    // Morning Person: posta entre 05h-09h
    if (stats.totalPosts > 20) {
      try {
        const morningResult = await pool.query(`
          SELECT COUNT(*) as count
          FROM posts
          WHERE user_id = $1 AND EXTRACT(HOUR FROM created_at) BETWEEN 5 AND 8
        `, [userId]);
        
        const morningPosts = parseInt(morningResult.rows[0]?.count || 0, 10);
        if (morningPosts > stats.totalPosts * 0.3) {
          tags.push('morning_person');
        }
      } catch (err) {
        // Silently fail
      }
    }
    
    // Night Owl: posta entre 22h-03h
    if (stats.totalPosts > 20) {
      try {
        const nightResult = await pool.query(`
          SELECT COUNT(*) as count
          FROM posts
          WHERE user_id = $1 AND (EXTRACT(HOUR FROM created_at) >= 22 OR EXTRACT(HOUR FROM created_at) <= 3)
        `, [userId]);
        
        const nightPosts = parseInt(nightResult.rows[0]?.count || 0, 10);
        if (nightPosts > stats.totalPosts * 0.3) {
          tags.push('night_owl');
        }
      } catch (err) {
        // Silently fail
      }
    }
    
    // Weekend Warrior: 80% posts sáb/dom
    if (stats.totalPosts > 10) {
      try {
        const weekendResult = await pool.query(`
          SELECT COUNT(*) as count
          FROM posts
          WHERE user_id = $1 AND EXTRACT(DOW FROM created_at) IN (0, 6)
        `, [userId]);
        
        const weekendPosts = parseInt(weekendResult.rows[0]?.count || 0, 10);
        if (weekendPosts > stats.totalPosts * 0.8) {
          tags.push('weekend_warrior');
        }
      } catch (err) {
        // Silently fail
      }
    }
    
    // ==========================================
    // TAGS DE INFLUÊNCIA/ELITE
    // ==========================================
    
    // Popular: >1000 seguidores
    if (stats.totalFollowers >= 1000) {
      tags.push('popular');
    }
    
    // Influenciador: >10k seguidores
    if (stats.totalFollowers >= 10000) {
      tags.push('influencer');
    }
    
    // Prolífico: >100 posts
    if (stats.totalPosts >= 100) {
      tags.push('prolific');
    }
    
    // Lenda: >5000 seguidores AND >1000 posts
    if (stats.totalFollowers >= 5000 && stats.totalPosts >= 1000) {
      tags.push('legend');
    }
    
    // Remove duplicates and return
    return Array.from(new Set(tags));
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
