-- Add is_banned column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'is_banned'
    ) THEN
        ALTER TABLE users ADD COLUMN is_banned BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Column is_banned added to users table';
    ELSE
        RAISE NOTICE 'Column is_banned already exists';
    END IF;
END $$;

-- Create index for banned users
CREATE INDEX IF NOT EXISTS idx_users_is_banned ON users(is_banned);
