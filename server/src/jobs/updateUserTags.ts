import { pool } from '../db/connection.js';
import { UserBioService } from '../services/userBioService.js';
import cron from 'node-cron';

const bioService = new UserBioService();

/**
 * Atualiza tags de todos os usuários ativos diariamente
 */
export async function updateAllUserTags(): Promise<void> {
  console.log('🏷️  Starting user tag update...');

  try {
    // Busca usuários ativos (postaram nos últimos 30 dias)
    const result = await pool.query(`
      SELECT DISTINCT u.id
      FROM users u
      LEFT JOIN posts p ON u.id = p.user_id
      WHERE p.created_at > NOW() - INTERVAL '30 days'
      OR u.created_at > NOW() - INTERVAL '30 days'
    `);

    const activeUserIds = result.rows.map((row: any) => row.id);

    console.log(`📊 Updating tags for ${activeUserIds.length} active users...`);

    // Process users in batches to avoid overloading the database
    const batchSize = 10;
    for (let i = 0; i < activeUserIds.length; i += batchSize) {
      const batch = activeUserIds.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map((userId: any) => 
          bioService.updateUserTags(userId).catch((err: any) => 
            console.error(`Error updating tags for user ${userId}:`, err)
          )
        )
      );
    }

    console.log('✅ Tag update completed successfully');
  } catch (error) {
    console.error('❌ Error in tag update job:', error);
    throw error;
  }
}

/**
 * Schedules the tag update job to run daily at 3 AM
 */
export function scheduleTagUpdateJob(): void {
  // Run every day at 3 AM (03:00:00)
  cron.schedule('0 3 * * *', async () => {
    try {
      await updateAllUserTags();
    } catch (error) {
      console.error('Scheduled tag update job failed:', error);
    }
  });

  console.log('✅ Tag update cron job scheduled (daily at 3 AM)');
}
