import { pool } from './db/connection';

async function updateSchema() {
  console.log('Updating database schema...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Add unlock_at to posts (Time Capsules)
    console.log('Adding unlock_at to posts...');
    await client.query(`
      ALTER TABLE posts 
      ADD COLUMN IF NOT EXISTS unlock_at TIMESTAMP;
    `);

    // 2. Add Cyber Companions table
    console.log('Creating cyber_companions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS cyber_companions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(50),
        type VARCHAR(20) DEFAULT 'robot',
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        mood VARCHAR(20) DEFAULT 'happy',
        accessories JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      );
    `);

    // 3. Add Theme/Skin support to User Settings
    console.log('Adding theme_skin to user_settings...');
    await client.query(`
      ALTER TABLE user_settings
      ADD COLUMN IF NOT EXISTS theme_skin VARCHAR(50) DEFAULT 'default';
    `);

    // 4. Encrypted Cords (Private Groups)
    console.log('Creating encrypted_cords tables...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS encrypted_cords (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100),
        creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        is_active BOOLEAN DEFAULT TRUE,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS encrypted_cord_members (
        cord_id UUID NOT NULL REFERENCES encrypted_cords(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (cord_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS encrypted_cord_messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        cord_id UUID NOT NULL REFERENCES encrypted_cords(id) ON DELETE CASCADE,
        sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        is_encrypted BOOLEAN DEFAULT TRUE,
        self_destruct_after INTEGER, -- seconds
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query('COMMIT');
    console.log('Schema updated successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating schema:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

updateSchema();
