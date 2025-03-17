import { UserService } from './services/userService.js';
import { pool } from './db/connection.js';

async function verify() {
  const userService = new UserService();
  
  // Get a user
  const client = await pool.connect();
  const res = await client.query('SELECT username, id FROM users LIMIT 1');
  client.release();
  
  if (res.rows.length === 0) {
    console.log('No users found.');
    return;
  }
  
  const { username, id } = res.rows[0];
  console.log(`Verifying user: ${username} (${id})`);
  
  try {
      // 1. Test without flag (should not have lists)
      console.log('Testing getUserById(id, false)...');
      const start1 = performance.now();
      const user1 = await userService.getUserById(id);
      const end1 = performance.now();
      console.log(`Time taken (default): ${end1 - start1}ms`);
      
      if (user1) {
          if (!user1.followersList && !user1.followingList) {
              console.log('SUCCESS: No follow lists returned (default).');
          } else {
              console.log('FAILURE: Follow lists returned when they should not be.');
          }
      } else {
          console.log('FAILURE: User not found.');
      }

      // 2. Test with flag (should have lists)
      console.log('Testing getUserById(id, true)...');
      const start2 = performance.now();
      const user2 = await userService.getUserById(id, true);
      const end2 = performance.now();
      console.log(`Time taken (with follows): ${end2 - start2}ms`);

      if (user2) {
          if (user2.followersList && user2.followingList) {
              console.log('SUCCESS: Follow lists returned (flag=true).');
          } else {
              console.log('FAILURE: Follow lists NOT returned when they should be.');
          }
      } else {
          console.log('FAILURE: User not found.');
      }
  } catch (err) {
      console.error('Error during user verification:', err);
  }
  
  process.exit(0);
}

verify().catch(console.error);