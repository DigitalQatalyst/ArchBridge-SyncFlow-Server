-- Supabase Migration: Field Mapping Configuration Tables
-- Run this SQL in your Supabase SQL Editor to create the field mapping tables

-- Create the field_mapping_configs table
CREATE TABLE IF NOT EXISTS field_mapping_configs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  project_id TEXT NOT NULL,
  project_name TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create the field_mappings table
CREATE TABLE IF NOT EXISTS field_mappings (
  id TEXT PRIMARY KEY,
  config_id TEXT NOT NULL REFERENCES field_mapping_configs(id) ON DELETE CASCADE,
  work_item_type TEXT NOT NULL CHECK (work_item_type IN ('epic', 'feature', 'user_story')),
  ardoq_field TEXT NOT NULL,
  azure_devops_field TEXT NOT NULL,
  transform_function TEXT, -- Optional: JSON or code for transformation
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(config_id, work_item_type, ardoq_field)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_field_mapping_configs_project 
  ON field_mapping_configs(project_id);

CREATE INDEX IF NOT EXISTS idx_field_mapping_configs_default 
  ON field_mapping_configs(project_id, is_default) 
  WHERE is_default = TRUE;

CREATE INDEX IF NOT EXISTS idx_field_mappings_config 
  ON field_mappings(config_id);

CREATE INDEX IF NOT EXISTS idx_field_mappings_work_item_type 
  ON field_mappings(config_id, work_item_type);

-- Create unique constraint to prevent duplicate config names per project
CREATE UNIQUE INDEX IF NOT EXISTS idx_field_mapping_configs_unique_name 
  ON field_mapping_configs(project_id, name);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_field_mapping_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update updated_at on row updates
CREATE TRIGGER update_field_mapping_configs_updated_at
  BEFORE UPDATE ON field_mapping_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_field_mapping_configs_updated_at();

-- Optional: Add Row Level Security (RLS) policies if needed
-- Uncomment the following lines if you want to enable RLS
-- ALTER TABLE field_mapping_configs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE field_mappings ENABLE ROW LEVEL SECURITY;

-- Example RLS policy (adjust based on your security requirements):
-- CREATE POLICY "Service role can manage all field mapping configs"
--   ON field_mapping_configs
--   FOR ALL
--   USING (auth.role() = 'service_role');

-- CREATE POLICY "Service role can manage all field mappings"
--   ON field_mappings
--   FOR ALL
--   USING (auth.role() = 'service_role');

