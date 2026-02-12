-- Clean up old items table schema issues
-- This migration removes any old columns that don't match current schema

-- Drop any constraints that reference old columns
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_nome_key CASCADE;

-- Drop old columns if they exist
ALTER TABLE items DROP COLUMN IF EXISTS nome CASCADE;
ALTER TABLE items DROP COLUMN IF EXISTS categoria CASCADE;
ALTER TABLE items DROP COLUMN IF EXISTS ativo CASCADE;
ALTER TABLE items DROP COLUMN IF EXISTS created_at CASCADE;

-- Re-add created_at if it was removed
ALTER TABLE items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Ensure proper structure for items
ALTER TABLE items ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE items ALTER COLUMN type SET NOT NULL;
ALTER TABLE items ALTER COLUMN name SET NOT NULL;
ALTER TABLE items ALTER COLUMN price SET NOT NULL;
ALTER TABLE items ALTER COLUMN currency SET DEFAULT 'BRL';
ALTER TABLE items ALTER COLUMN rarity SET DEFAULT 'common';

-- Recreate indexes if needed
CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);

-- Check and re-insert default items if table is empty
INSERT INTO items (type, name, description, price, image_url, rarity) VALUES
('frame', 'Neon Demon', 'A pulsing purple and pink neon border.', 5.00, 'frame_neon_demon', 'rare'),
('frame', 'Glitch Border', 'A chaotic, glitching border style.', 7.00, 'frame_glitch', 'epic'),
('frame', 'Retro Arcade', 'Pixel art style border.', 4.00, 'frame_retro', 'common'),
('frame', 'Golden Legend', 'A shining golden frame for the elite.', 25.00, 'frame_gold', 'legendary'),
('effect', 'Matrix Rain', 'Green code raining down your profile.', 15.00, 'effect_matrix', 'epic'),
('effect', 'Hologram', 'Flickering holographic overlay.', 10.00, 'effect_hologram', 'rare'),
('badge', 'OG User', 'Badge for early adopters.', 0.00, 'badge_og', 'rare')
ON CONFLICT (name) DO NOTHING;

-- Clean up any duplicate or invalid constraint messages
SELECT 'Items table schema cleaned up successfully' as message;
