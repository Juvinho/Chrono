
-- Add unlock_at column to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS unlock_at TIMESTAMP WITH TIME ZONE;
