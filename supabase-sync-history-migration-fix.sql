-- Fix for sync_history table: Change config_id columns from UUID to VARCHAR
-- Run this SQL in your Supabase SQL Editor if you already have the tables created

-- Alter sync_history table to change config_id columns to VARCHAR
ALTER TABLE sync_history 
  ALTER COLUMN source_config_id TYPE VARCHAR(255) USING source_config_id::text,
  ALTER COLUMN target_config_id TYPE VARCHAR(255) USING target_config_id::text;

-- Note: If the columns are NULL, you can also use:
-- ALTER TABLE sync_history 
--   ALTER COLUMN source_config_id TYPE VARCHAR(255),
--   ALTER COLUMN target_config_id TYPE VARCHAR(255);

