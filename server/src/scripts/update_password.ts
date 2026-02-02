import { pool } from '../db/connection.js';
import bcrypt from 'bcryptjs';

const updatePassword = async () => {
  const username = 'Juvinho';
  const newPassword = '27Set@2004';

  try {
    console.log(`Updating password for user: ${username}`);

    // Check if user exists
    const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

    if (userResult.rows.length === 0) {
      console.log(`User ${username} not found. Creating user...`);
      // Optional: Create the user if it doesn't exist
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      
      // Basic user creation
      await pool.query(
        `INSERT INTO users (username, email, password_hash) 
         VALUES ($1, $2, $3)`,
        [username, 'juvinho@example.com', hashedPassword]
      );
      console.log(`User ${username} created with new password.`);
    } else {
      // Update existing user
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      await pool.query(
        'UPDATE users SET password_hash = $1 WHERE username = $2',
        [hashedPassword, username]
      );
      console.log(`Password updated successfully for user: ${username}`);
    }

  } catch (error) {
    console.error('Error updating password:', error);
  } finally {
    await pool.end();
  }
};

updatePassword();
