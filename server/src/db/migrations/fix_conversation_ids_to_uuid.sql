-- Migration: Convert conversation IDs from INTEGER to valid UUIDs
-- This fixes conversations that were created with numeric IDs before the UUID migration

-- Step 1: Check if there are any conversations with non-UUID IDs (numeric or malformed)
-- These are old records that need to be fixed

-- Step 2: For each numeric ID, generate a valid v5 UUID based on user IDs
-- This ensures consistency even if migration is run multiple times

-- Create a temporary column to store new UUIDs
ALTER TABLE conversations 
ADD COLUMN id_new UUID;

-- Generate UUIDs for all conversations using a deterministic v5 UUID
-- based on user1_id and user2_id, ensuring same conversation always gets same UUID
UPDATE conversations
SET id_new = uuid_generate_v5(
  '6ba7b815-9dad-11d1-80b4-00c04fd430c8'::uuid, 
  CONCAT(LEAST(user1_id, user2_id)::text, '-', GREATEST(user1_id, user2_id)::text)
)
WHERE id_new IS NULL;

-- Step 3: Update foreign key references
-- Update messages table to reference the new UUID
UPDATE messages m
SET conversation_id = (
  SELECT id_new FROM conversations c 
  WHERE c.id = m.conversation_id
)
WHERE conversation_id IS NOT NULL;

-- Step 4: Drop old PK and replace with new UUID column
ALTER TABLE conversations 
DROP CONSTRAINT conversations_pkey CASCADE;

-- Remove old id column and rename new column
ALTER TABLE conversations 
DROP COLUMN id;

ALTER TABLE conversations 
RENAME COLUMN id_new TO id;

-- Recreate primary key and constraints
ALTER TABLE conversations 
ADD PRIMARY KEY (id);

ALTER TABLE conversations 
ADD CONSTRAINT uk_conv_participants UNIQUE (user1_id, user2_id);

ALTER TABLE conversations 
ADD CONSTRAINT chk_conv_order CHECK (user1_id < user2_id);

-- Recreate foreign key for messages table
ALTER TABLE messages 
ADD CONSTRAINT fk_messages_conversations 
FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;

-- Log completion
SELECT 'Conversation IDs migration completed' AS status;
