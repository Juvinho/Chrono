-- Migration: Private conversation unique pairs
-- Ensures there is at most one conversation for a given ordered user pair

CREATE TABLE IF NOT EXISTS private_conversation_pairs (
    conversation_id UUID PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
    participant1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    participant2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_participants_order CHECK (participant1_id < participant2_id)
);

-- Unique constraint across ordered participants
CREATE UNIQUE INDEX IF NOT EXISTS uk_private_pair ON private_conversation_pairs(participant1_id, participant2_id);

-- Helper index for quick lookups by conversation
CREATE INDEX IF NOT EXISTS idx_private_pairs_conversation ON private_conversation_pairs(conversation_id);

