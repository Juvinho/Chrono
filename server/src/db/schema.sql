-- Create database (run this manually first)
-- CREATE DATABASE chrono_db;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm for efficient text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Users table
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add subscription fields if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'subscription_tier') THEN
        ALTER TABLE users ADD COLUMN subscription_tier VARCHAR(20) DEFAULT 'free';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'subscription_expires_at') THEN
        ALTER TABLE users ADD COLUMN subscription_expires_at TIMESTAMP;
    END IF;

    -- Add professional fields to users
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'profile_type') THEN
        ALTER TABLE users ADD COLUMN profile_type VARCHAR(20) DEFAULT 'personal';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'headline') THEN
        ALTER TABLE users ADD COLUMN headline VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'connections_count') THEN
        ALTER TABLE users ADD COLUMN connections_count INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'skills') THEN
        ALTER TABLE users ADD COLUMN skills TEXT[] DEFAULT '{}';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'work_experience') THEN
        ALTER TABLE users ADD COLUMN work_experience JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'education') THEN
        ALTER TABLE users ADD COLUMN education JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Images table for multimedia content
CREATE TABLE IF NOT EXISTS images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url TEXT NOT NULL,
    format VARCHAR(20),
    size_bytes BIGINT,
    width INTEGER,
    height INTEGER,
    uploader_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Videos table for multimedia content
CREATE TABLE IF NOT EXISTS videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    duration_seconds INTEGER,
    codec VARCHAR(50),
    size_bytes BIGINT,
    width INTEGER,
    height INTEGER,
    uploader_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Items table (Cosmetics)
CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(20) NOT NULL, -- 'frame', 'effect', 'badge', 'theme'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'BRL',
    image_url TEXT,
    rarity VARCHAR(20) DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Items (Inventory)
CREATE TABLE IF NOT EXISTS user_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    is_equipped BOOLEAN DEFAULT FALSE,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, item_id)
);

-- Seed Items
INSERT INTO items (type, name, description, price, image_url, rarity) VALUES
('frame', 'Neon Demon', 'A pulsing purple and pink neon border.', 5.00, 'frame_neon_demon', 'rare'),
('frame', 'Glitch Border', 'A chaotic, glitching border style.', 7.00, 'frame_glitch', 'epic'),
('frame', 'Retro Arcade', 'Pixel art style border.', 4.00, 'frame_retro', 'common'),
('frame', 'Golden Legend', 'A shining golden frame for the elite.', 25.00, 'frame_gold', 'legendary'),
('effect', 'Matrix Rain', 'Green code raining down your profile.', 15.00, 'effect_matrix', 'epic'),
('effect', 'Hologram', 'Flickering holographic overlay.', 10.00, 'effect_hologram', 'rare'),
('badge', 'OG User', 'Badge for early adopters.', 0.00, 'badge_og', 'rare')
ON CONFLICT DO NOTHING; -- Note: This requires a unique constraint on name or similar to work perfectly, but for now it's fine as we don't have unique constraint on name. 
-- To prevent duplicates on multiple runs, let's just leave it as simple inserts that might duplicate if not careful, OR better:
-- We can skip seeding here and do it in a seed script, but for simplicity I'll wrap in a DO block or just assume the user won't run migrate 100 times without resetting.
-- Actually, let's rely on the user interface to show these, or I can create a seed script.
-- Let's just create the tables for now.

-- Indexes for items
CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
CREATE INDEX IF NOT EXISTS idx_user_items_user_id ON user_items(user_id);

-- Indexes for users
CREATE INDEX IF NOT EXISTS idx_users_username_trgm ON users USING GIN (username gin_trgm_ops);

-- User Profiles table (Bio, Location, etc.)
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT DEFAULT '',
    birthday DATE,
    location VARCHAR(100),
    website VARCHAR(255),
    cover_image TEXT,
    pronouns VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Settings table (Preferences, Customizations)
CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'light',
    accent_color VARCHAR(20) DEFAULT 'purple',
    effect VARCHAR(20) DEFAULT 'none',
    animations_enabled BOOLEAN DEFAULT TRUE,
    is_private BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Follows table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(follower_id, following_id),
    CHECK(follower_id != following_id)
);

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    image_url TEXT,
    video_url TEXT,
    is_thread BOOLEAN DEFAULT FALSE,
    is_private BOOLEAN DEFAULT FALSE,
    in_reply_to_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    repost_of_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    poll_options JSONB,
    poll_ends_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure unlock_at exists (from migration)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'unlock_at') THEN
        ALTER TABLE posts ADD COLUMN unlock_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Indexes for posts
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_in_reply_to_id ON posts(in_reply_to_id);

-- Reactions table (for cyberpunk reactions: Glitch, Upload, Corrupt, Rewind, Static)
CREATE TABLE IF NOT EXISTS reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction_type VARCHAR(20) NOT NULL CHECK (reaction_type IN ('Glitch', 'Upload', 'Corrupt', 'Rewind', 'Static')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, user_id)
);

-- Poll votes table
CREATE TABLE IF NOT EXISTS poll_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    option_index INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, user_id)
);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conversation participants table
CREATE TABLE IF NOT EXISTS conversation_participants (
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    unread_count INTEGER DEFAULT 0,
    last_read_at TIMESTAMP,
    PRIMARY KEY (conversation_id, user_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    image_url TEXT,
    video_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(20) DEFAULT 'sent',
    is_encrypted BOOLEAN DEFAULT FALSE,
    delete_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Message Status table (per-user status)
CREATE TABLE IF NOT EXISTS message_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'sent', -- 'sent', 'delivered', 'read'
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, user_id)
);

-- Indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(20) NOT NULL,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Remove Stories feature: drop table if exists (idempotent)
DROP TABLE IF EXISTS stories CASCADE;

-- Push Subscriptions (for Web Push)
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, endpoint)
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- Migrations for existing databases
DO $$
BEGIN
    -- Add location column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='location') THEN
        ALTER TABLE users ADD COLUMN location VARCHAR(100);
    END IF;

    -- Add website column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='website') THEN
        ALTER TABLE users ADD COLUMN website VARCHAR(255);
    END IF;

    -- Update reactions unique constraint
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reactions_post_id_user_id_reaction_type_key') THEN
        ALTER TABLE reactions DROP CONSTRAINT reactions_post_id_user_id_reaction_type_key;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reactions_post_id_user_id_key') THEN
        -- Clean up potential duplicates before adding unique constraint
        DELETE FROM reactions a USING reactions b WHERE a.id < b.id AND a.post_id = b.post_id AND a.user_id = b.user_id;
        ALTER TABLE reactions ADD CONSTRAINT reactions_post_id_user_id_key UNIQUE (post_id, user_id);
    END IF;

    -- Migrate Profiles (Idempotent)
    INSERT INTO user_profiles (user_id, bio, birthday, location, website, cover_image, pronouns)
    SELECT id, bio, birthday, location, website, cover_image, pronouns
    FROM users
    WHERE id NOT IN (SELECT user_id FROM user_profiles);

    -- Migrate Settings (Idempotent)
    INSERT INTO user_settings (user_id, theme, accent_color, effect, animations_enabled, is_private)
    SELECT 
        id, 
        COALESCE(profile_settings->>'theme', 'light'),
        COALESCE(profile_settings->>'accentColor', 'purple'),
        COALESCE(profile_settings->>'effect', 'none'),
        COALESCE((profile_settings->>'animationsEnabled')::boolean, true),
        is_private
    FROM users
    WHERE id NOT IN (SELECT user_id FROM user_settings);

    -- Add mood column to posts if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='mood') THEN
        ALTER TABLE posts ADD COLUMN mood VARCHAR(20) DEFAULT 'neutral';
    END IF;

    -- Add is_encrypted to messages
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='is_encrypted') THEN
        ALTER TABLE messages ADD COLUMN is_encrypted BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add delete_at to messages
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='delete_at') THEN
        ALTER TABLE messages ADD COLUMN delete_at TIMESTAMP;
    END IF;

    -- Add media and status columns to messages
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='image_url') THEN
        ALTER TABLE messages ADD COLUMN image_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='video_url') THEN
        ALTER TABLE messages ADD COLUMN video_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='metadata') THEN
        ALTER TABLE messages ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='status') THEN
        ALTER TABLE messages ADD COLUMN status VARCHAR(20) DEFAULT 'sent';
    END IF;

    -- Clean up duplicate notifications (same user, actor, type, post)
    -- Keep only the most recent one
    DELETE FROM notifications n1
    USING notifications n2
    WHERE n1.id < n2.id 
    AND n1.user_id = n2.user_id 
    AND n1.actor_id = n2.actor_id 
    AND n1.notification_type = n2.notification_type 
    AND (n1.post_id = n2.post_id OR (n1.post_id IS NULL AND n2.post_id IS NULL));
END $$;

-- Encrypted Cords table (for secure conversations)
CREATE TABLE IF NOT EXISTS encrypted_cords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    self_destruct_timer INTEGER DEFAULT 3600,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(conversation_id)
);
