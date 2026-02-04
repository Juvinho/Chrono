-- Migration: Add last_seen column to users table
-- This tracks when a user was last active on the platform

ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen DESC);
