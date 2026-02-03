import { pool } from './db/connection.js';
import bcrypt from 'bcryptjs';

const resetPassword = async () => {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('\nUsage: npx tsx src/reset_password.ts <username> <new_password>');
    console.log('\n--- Available Users ---');
    try {
        const res = await pool.query('SELECT id, username, email FROM users ORDER BY created_at DESC');
        if (res.rows.length === 0) {
            console.log('No users found in database.');
        } else {
            res.rows.forEach((u: any) => console.log(`- ${u.username} (ID: ${u.id}, Email: ${u.email})`));
        }
    } catch (e) {
        console.error('Error connecting to database:', e);
        console.log('Ensure your PostgreSQL database is running!');
    } finally {
        await pool.end();
    }
    process.exit(0);
  }

  const [username, newPassword] = args;
  
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const res = await pool.query(
        'UPDATE users SET password_hash = $1 WHERE username = $2 RETURNING id',
        [hashedPassword, username]
    );
    
    if (res.rowCount === 0) {
        console.log(`\n❌ User "${username}" not found.`);
    } else {
        console.log(`\n✅ Password for user "${username}" has been updated successfully.`);
    }
  } catch (e) {
    console.error('\n❌ Error updating password:', e);
  } finally {
    await pool.end();
  }
};

resetPassword();
