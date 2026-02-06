import { pool } from './connection.js';

/**
 * Initialize database with proper error handling
 * Ensures extensions and tables are created in correct order
 */
export async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🗄️ Initializing database schema...');

    // 1. Create extensions first (these must succeed)
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      console.log('✅ UUID extension created');
    } catch (err: any) {
      console.error('⚠️ UUID extension error:', err.message);
    }

    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
      console.log('✅ pg_trgm extension created');
    } catch (err: any) {
      console.error('⚠️ pg_trgm extension error:', err.message);
    }

    // 2. Create users table
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          username VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255),
          google_id VARCHAR(255) UNIQUE,
          avatar TEXT,
          bio TEXT DEFAULT '',
          birthday DATE,
          pronouns VARCHAR(20),
          location VARCHAR(100),
          website VARCHAR(255),
          cover_image TEXT,
          public_key TEXT,
          followers_count INTEGER DEFAULT 0,
          following_count INTEGER DEFAULT 0,
          is_private BOOLEAN DEFAULT FALSE,
          is_verified BOOLEAN DEFAULT FALSE,
          email_verification_token VARCHAR(255),
          verification_badge_label VARCHAR(100),
          verification_badge_color VARCHAR(20),
          profile_settings JSONB DEFAULT '{"theme":"light","accentColor":"purple","effect":"none","animationsEnabled":true}'::jsonb,
          blocked_users TEXT[] DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          subscription_tier VARCHAR(20) DEFAULT 'free',
          subscription_expires_at TIMESTAMP,
          profile_type VARCHAR(20) DEFAULT 'personal',
          headline VARCHAR(255),
          connections_count INTEGER DEFAULT 0,
          skills TEXT[] DEFAULT '{}',
          work_experience JSONB DEFAULT '[]'::jsonb,
          education JSONB DEFAULT '[]'::jsonb
        )
      `);
      console.log('✅ Users table created');
    } catch (err: any) {
      console.error('❌ Users table error:', err.message);
      throw err;
    }

    // 3. Create conversations table
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS conversations (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_message_at TIMESTAMP
        )
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC)
      `);
      console.log('✅ Conversations table created');
    } catch (err: any) {
      console.error('❌ Conversations table error:', err.message);
      throw err;
    }

    // 4. Create messages table
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS messages (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          content TEXT,
          text TEXT,
          type VARCHAR(20) DEFAULT 'text',
          image_url TEXT,
          video_url TEXT,
          metadata JSONB,
          is_read BOOLEAN DEFAULT FALSE,
          is_encrypted BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
        ON messages(conversation_id, created_at)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_messages_sender_created 
        ON messages(sender_id, created_at)
      `);
      console.log('✅ Messages table created');
    } catch (err: any) {
      console.error('❌ Messages table error:', err.message);
      throw err;
    }

    // 5. Create message_read_status table for tracking reads
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS message_read_status (
          message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (message_id, user_id)
        )
      `);
      console.log('✅ Message read status table created');
    } catch (err: any) {
      // This table is optional, so don't error if it fails
      console.warn('⚠️ Message read status table warning:', err.message?.substring(0, 100));
    }

    console.log('✨ Database initialization complete!');
  } catch (error: any) {
    console.error('💥 Database initialization failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
}
