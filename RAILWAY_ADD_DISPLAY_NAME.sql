-- ============================================================================
-- Migration: Add display_name column to users table (if not exists)
-- Safe for Railway production - idempotent and non-destructive
-- ============================================================================

-- Add the display_name column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS display_name VARCHAR(100);

-- Set default values for existing users (username as display_name)
UPDATE users 
SET display_name = username 
WHERE display_name IS NULL OR display_name = '';

-- Verify the column exists and has data
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN display_name IS NOT NULL THEN 1 END) as users_with_display_name,
  COUNT(CASE WHEN display_name IS NULL OR display_name = '' THEN 1 END) as users_without_display_name
FROM users;

-- Show sample data
SELECT id, username, display_name FROM users LIMIT 5;
