-- Migration: Add image_url support to messages table
-- This migration allows messages to have optional images and makes content optional

BEGIN;

-- Step 1: Drop old constraint if it exists
ALTER TABLE IF EXISTS messages DROP CONSTRAINT IF EXISTS messages_content_len_chk;

-- Step 2: Add image_url column if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'image_url'
    ) THEN
        ALTER TABLE messages ADD COLUMN image_url TEXT;
    END IF;
END $$;

-- Step 3: Make content optional (allow NULL) if not already
DO $$ BEGIN
    -- Check if content is NOT NULL and change it
    DECLARE
        col_not_null BOOLEAN;
    BEGIN
        SELECT is_not_null INTO col_not_null
        FROM information_schema.columns
        WHERE table_name = 'messages' AND column_name = 'content';
        
        IF col_not_null THEN
            ALTER TABLE messages ALTER COLUMN content DROP NOT NULL;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL; -- Ignore if column doesn't exist or other errors
    END;
END $$;

-- Step 4: Drop old content length constraint if it exists
ALTER TABLE IF EXISTS messages DROP CONSTRAINT IF EXISTS messages_content_len_chk;

-- Step 5: Add new constraints to ensure either content or image_url exists
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'messages' AND constraint_name = 'messages_content_or_image'
    ) THEN
        ALTER TABLE messages ADD CONSTRAINT messages_content_or_image 
            CHECK (char_length(COALESCE(content, '')) > 0 OR image_url IS NOT NULL);
    END IF;
END $$;

-- Step 6: Add content length constraint
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'messages' AND constraint_name = 'messages_content_len_chk'
    ) THEN
        ALTER TABLE messages ADD CONSTRAINT messages_content_len_chk 
            CHECK (content IS NULL OR char_length(content) BETWEEN 1 AND 1000);
    END IF;
END $$;

COMMIT;
