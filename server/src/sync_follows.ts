import { UserService } from './services/userService.js';
import { pool } from './db/connection.js';

async function sync() {
  console.log('--- SYNCING ALL FOLLOW COUNTS ---');
  const userService = new UserService();
  
  try {
    const users = await pool.query('SELECT id, username, followers_count, following_count FROM users');
    console.log(`Checking ${users.rows.length} users...`);
    
    await userService.syncAllFollowCounts();
    
    const updatedUsers = await pool.query('SELECT id, username, followers_count, following_count FROM users');
    
    let fixCount = 0;
    for (let i = 0; i < users.rows.length; i++) {
      const old = users.rows[i];
      const current = updatedUsers.rows.find(u => u.id === old.id);
      
      if (current && (old.followers_count !== current.followers_count || old.following_count !== current.following_count)) {
        console.log(`[FIXED] @${old.username}: Followers ${old.followers_count} -> ${current.followers_count}, Following ${old.following_count} -> ${current.following_count}`);
        fixCount++;
      }
    }
    
    console.log(`--- SYNC COMPLETE. Fixed ${fixCount} users. ---`);
  } catch (err) {
    console.error('Error during sync:', err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

sync();
