-- Chrono: Temporal Social Network - Database Schema
-- Clean version without problematic DO blocks

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100),
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
    connections_count INTEGER DEFAULT 0,
    is_private BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    verification_badge_label VARCHAR(100),
    verification_badge_color VARCHAR(20),
    profile_settings JSONB DEFAULT '{"theme":"light","accentColor":"purple","effect":"none","animationsEnabled":true}'::jsonb,
    profile_type VARCHAR(20) DEFAULT 'personal',
    headline VARCHAR(255),
    skills TEXT[] DEFAULT '{}',
    work_experience JSONB DEFAULT '[]'::jsonb,
    education JSONB DEFAULT '[]'::jsonb,
    subscription_tier VARCHAR(20) DEFAULT 'free',
    subscription_expires_at TIMESTAMP,
    blocked_users TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username_trgm ON users USING GIN (username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- ============================================================================
-- CONVERSATIONS (Direct Messages)
-- ============================================================================
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP,
    CONSTRAINT uk_conv_participants UNIQUE (user1_id, user2_id),
    CONSTRAINT chk_conv_order CHECK (user1_id < user2_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON conversations(user2_id);

-- ============================================================================
-- MESSAGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT messages_content_len_chk CHECK (char_length(content) BETWEEN 1 AND 1000)
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_sender ON messages(conversation_id, sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_created ON messages(sender_id, created_at DESC);

-- ============================================================================
-- MESSAGE STATUS TRACKING
-- ============================================================================
CREATE TABLE IF NOT EXISTS message_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('delivered', 'read')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (message_id, user_id, status)
);

CREATE INDEX IF NOT EXISTS idx_message_status_message ON message_status(message_id);

-- ============================================================================
-- ENCRYPTED CORDS (Private Groups)
-- ============================================================================
CREATE TABLE IF NOT EXISTS encrypted_cords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    self_destruct_timer INTEGER DEFAULT 60,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- MEDIA TABLES
-- ============================================================================
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

-- ============================================================================
-- MARKETPLACE ITEMS (Cosmetics)
-- ============================================================================
CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'BRL',
    image_url TEXT,
    rarity VARCHAR(20) DEFAULT 'common',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    is_equipped BOOLEAN DEFAULT FALSE,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
CREATE INDEX IF NOT EXISTS idx_user_items_user_id ON user_items(user_id);

-- Seed default items
INSERT INTO items (type, name, description, price, image_url, rarity) VALUES
('frame', 'Neon Demon', 'A pulsing purple and pink neon border.', 5.00, 'frame_neon_demon', 'rare'),
('frame', 'Glitch Border', 'A chaotic, glitching border style.', 7.00, 'frame_glitch', 'epic'),
('frame', 'Retro Arcade', 'Pixel art style border.', 4.00, 'frame_retro', 'common'),
('frame', 'Golden Legend', 'A shining golden frame for the elite.', 25.00, 'frame_gold', 'legendary'),
('effect', 'Matrix Rain', 'Green code raining down your profile.', 15.00, 'effect_matrix', 'epic'),
('effect', 'Hologram', 'Flickering holographic overlay.', 10.00, 'effect_hologram', 'rare'),
('badge', 'OG User', 'Badge for early adopters.', 0.00, 'badge_og', 'rare')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- USER PROFILE & SETTINGS
-- ============================================================================
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

-- ============================================================================
-- FOLLOWS
-- ============================================================================
CREATE TABLE IF NOT EXISTS follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(follower_id, following_id),
    CHECK(follower_id != following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

-- ============================================================================
-- THREADS (Cordões)
-- ============================================================================
CREATE TABLE IF NOT EXISTS threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMP,
    unlock_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT chk_thread_status CHECK (status IN ('active', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_threads_status ON threads(status);
CREATE INDEX IF NOT EXISTS idx_threads_creator_id ON threads(creator_id);
CREATE INDEX IF NOT EXISTS idx_threads_created_at ON threads(created_at DESC);

-- ============================================================================
-- THREAD AUDIT LOG
-- ============================================================================
CREATE TABLE IF NOT EXISTS thread_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    actor_user_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_thread_audit_thread_id ON thread_audit(thread_id);

-- ============================================================================
-- POSTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    image_url TEXT,
    video_url TEXT,
    is_thread BOOLEAN DEFAULT FALSE,
    is_private BOOLEAN DEFAULT FALSE,
    mood VARCHAR(20) DEFAULT 'neutral',
    in_reply_to_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    repost_of_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    thread_id UUID REFERENCES threads(id) ON DELETE SET NULL,
    poll_options JSONB,
    poll_ends_at TIMESTAMP,
    unlock_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_in_reply_to_id ON posts(in_reply_to_id);
CREATE INDEX IF NOT EXISTS idx_posts_thread_id ON posts(thread_id);

-- ============================================================================
-- POST MEDIA
-- ============================================================================
CREATE TABLE IF NOT EXISTS post_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    image_id UUID REFERENCES images(id) ON DELETE SET NULL,
    video_id UUID REFERENCES videos(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_post_media_post_id ON post_media(post_id);

-- ============================================================================
-- REACTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction_type VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, user_id),
    CONSTRAINT chk_reaction_type CHECK (reaction_type IN ('Glitch', 'Upload', 'Corrupt', 'Rewind', 'Static'))
);

CREATE INDEX IF NOT EXISTS idx_reactions_post_id ON reactions(post_id);

-- ============================================================================
-- POLL VOTES
-- ============================================================================
CREATE TABLE IF NOT EXISTS poll_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    option_index INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_poll_votes_post_id ON poll_votes(post_id);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(20) NOT NULL,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================================================
-- PUSH SUBSCRIPTIONS (Web Push)
-- ============================================================================
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

-- ============================================================================
-- STORED PROCEDURES & FUNCTIONS
-- ============================================================================

-- Function: enforce_reply_same_thread
CREATE OR REPLACE FUNCTION enforce_reply_same_thread()
RETURNS TRIGGER AS $$
DECLARE
    parent_thread UUID;
BEGIN
    IF NEW.in_reply_to_id IS NOT NULL THEN
        SELECT thread_id INTO parent_thread FROM posts WHERE id = NEW.in_reply_to_id;
        IF parent_thread IS NOT NULL THEN
            IF NEW.thread_id IS NULL THEN
                NEW.thread_id := parent_thread;
            ELSIF NEW.thread_id <> parent_thread THEN
                RAISE EXCEPTION 'Reply must belong to the same thread as parent (expected %, got %)', parent_thread, NEW.thread_id;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: enforce_reply_same_thread_trg
DROP TRIGGER IF EXISTS enforce_reply_same_thread_trg ON posts;
CREATE TRIGGER enforce_reply_same_thread_trg
BEFORE INSERT OR UPDATE OF in_reply_to_id, thread_id ON posts
FOR EACH ROW
EXECUTE FUNCTION enforce_reply_same_thread();

-- Function: thread_audit_trigger
CREATE OR REPLACE FUNCTION thread_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO thread_audit (thread_id, action, new_status, actor_user_id)
        VALUES (NEW.id, 'created', NEW.status, NEW.creator_id);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.status IS DISTINCT FROM OLD.status THEN
            INSERT INTO thread_audit (thread_id, action, old_status, new_status, actor_user_id)
            VALUES (NEW.id, 'status_changed', OLD.status, NEW.status, NEW.creator_id);
        ELSE
            INSERT INTO thread_audit (thread_id, action, old_status, new_status, actor_user_id)
            VALUES (NEW.id, 'updated', OLD.status, NEW.status, NEW.creator_id);
        END IF;
        RETURN NEW;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: thread_audit_trg
DROP TRIGGER IF EXISTS thread_audit_trg ON threads;
CREATE TRIGGER thread_audit_trg
AFTER INSERT OR UPDATE ON threads
FOR EACH ROW
EXECUTE FUNCTION thread_audit_trigger();

-- Function: archive_threads
CREATE OR REPLACE FUNCTION archive_threads(cutoff_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER := 0;
BEGIN
    WITH last_activity AS (
        SELECT t.id AS thread_id, COALESCE(MAX(p.created_at), t.updated_at) AS last_ts
        FROM threads t
        LEFT JOIN posts p ON p.thread_id = t.id
        GROUP BY t.id, t.updated_at
    )
    UPDATE threads t
    SET status = 'archived',
        archived_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    FROM last_activity la
    WHERE t.id = la.thread_id
      AND t.status = 'active'
      AND la.last_ts < (CURRENT_TIMESTAMP - (cutoff_days || ' days')::INTERVAL);

    GET DIAGNOSTICS archived_count = ROW_COUNT;
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MIGRATION DATA (Idempotent Inserts)
-- ============================================================================

-- Migrate Profiles from users table
INSERT INTO user_profiles (user_id, bio, birthday, location, website, cover_image, pronouns)
SELECT id, bio, birthday, location, website, cover_image, pronouns
FROM users
WHERE id NOT IN (SELECT user_id FROM user_profiles)
ON CONFLICT DO NOTHING;

-- Migrate Settings from users table
INSERT INTO user_settings (user_id, theme, accent_color, effect, animations_enabled, is_private)
SELECT 
    id, 
    COALESCE(profile_settings->>'theme', 'light'),
    COALESCE(profile_settings->>'accentColor', 'purple'),
    COALESCE(profile_settings->>'effect', 'none'),
    COALESCE((profile_settings->>'animationsEnabled')::boolean, true),
    is_private
FROM users
WHERE id NOT IN (SELECT user_id FROM user_settings)
ON CONFLICT DO NOTHING;

-- Clean up duplicate notifications (keep only the most recent)
DELETE FROM notifications n1
USING notifications n2
WHERE n1.id < n2.id 
  AND n1.user_id = n2.user_id 
  AND n1.actor_id = n2.actor_id 
  AND n1.notification_type = n2.notification_type 
  AND (n1.post_id = n2.post_id OR (n1.post_id IS NULL AND n2.post_id IS NULL));

-- Clean up duplicate reactions (keep only the most recent)
DELETE FROM reactions r1
USING reactions r2
WHERE r1.id < r2.id 
  AND r1.post_id = r2.post_id 
  AND r1.user_id = r2.user_id;

-- ============================================================================
-- SCHEMA VERSION
-- ============================================================================
-- Remember: This is our clean, consolidated schema for production
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" CASCADE;

