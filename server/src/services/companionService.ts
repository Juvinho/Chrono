import { pool } from '../db/connection.js';

export interface CyberCompanion {
  id: string;
  userId: string;
  name: string;
  type: 'robot' | 'hologram' | 'drone';
  level: number;
  xp: number;
  mood: 'happy' | 'neutral' | 'sad' | 'excited' | 'sleepy';
  accessories: any[];
  createdAt: Date;
}

export class CompanionService {
  async getCompanion(userId: string): Promise<CyberCompanion | null> {
    const result = await pool.query(
      'SELECT * FROM cyber_companions WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) return null;
    return this.mapFromDb(result.rows[0]);
  }

  async createCompanion(userId: string, name: string, type: 'robot' | 'hologram' | 'drone' = 'robot'): Promise<CyberCompanion> {
    const result = await pool.query(
      `INSERT INTO cyber_companions (user_id, name, type, level, xp, mood)
       VALUES ($1, $2, $3, 1, 0, 'happy')
       RETURNING *`,
      [userId, name, type]
    );
    return this.mapFromDb(result.rows[0]);
  }

  async addXp(userId: string, amount: number): Promise<CyberCompanion> {
    const companion = await this.getCompanion(userId);
    if (!companion) throw new Error('Companion not found');

    let newXp = companion.xp + amount;
    let newLevel = companion.level;
    
    // Simple leveling logic: Level * 100 XP required for next level
    const xpRequired = newLevel * 100;
    
    if (newXp >= xpRequired) {
        newLevel++;
        newXp -= xpRequired;
        // Maybe change mood on level up
    }

    const result = await pool.query(
        `UPDATE cyber_companions 
         SET xp = $1, level = $2, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $3
         RETURNING *`,
        [newXp, newLevel, userId]
    );

    return this.mapFromDb(result.rows[0]);
  }

  async updateMood(userId: string, mood: string): Promise<CyberCompanion> {
      const result = await pool.query(
          `UPDATE cyber_companions SET mood = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 RETURNING *`,
          [mood, userId]
      );
      return this.mapFromDb(result.rows[0]);
  }

  private mapFromDb(row: any): CyberCompanion {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      type: row.type,
      level: row.level,
      xp: row.xp,
      mood: row.mood,
      accessories: row.accessories || [],
      createdAt: row.created_at
    };
  }
}
