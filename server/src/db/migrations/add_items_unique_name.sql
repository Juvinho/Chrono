-- Migration: Add UNIQUE constraint to items.name
-- Fixes ON CONFLICT (name) warning at startup (Query 24)
DO $$ BEGIN
  ALTER TABLE items ADD CONSTRAINT items_name_unique UNIQUE (name);
EXCEPTION WHEN duplicate_table THEN NULL;
         WHEN duplicate_object THEN NULL; END $$;
