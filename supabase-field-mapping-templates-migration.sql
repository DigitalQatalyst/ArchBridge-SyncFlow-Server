-- Supabase Migration: Field Mapping Templates (System Defaults)
-- Run this SQL in your Supabase SQL Editor to add template support to field mapping

-- Create the field_mapping_templates table (System Defaults - Read-Only)
CREATE TABLE IF NOT EXISTS field_mapping_templates (
  id TEXT PRIMARY KEY,
  process_template_name TEXT NOT NULL UNIQUE, -- 'Agile', 'Scrum', 'CMMI', 'Basic'
  process_template_type_id TEXT, -- Azure DevOps process template type ID
  name TEXT NOT NULL,
  description TEXT,
  is_system_default BOOLEAN DEFAULT TRUE, -- Always true for templates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Update field_mappings table to support both templates and configs
-- First, add template_id column (nullable)
ALTER TABLE field_mappings 
ADD COLUMN IF NOT EXISTS template_id TEXT REFERENCES field_mapping_templates(id) ON DELETE CASCADE;

-- Make config_id nullable (since it can now be either template_id or config_id)
ALTER TABLE field_mappings
ALTER COLUMN config_id DROP NOT NULL;

-- Add check constraint to ensure exactly one of template_id or config_id is set
ALTER TABLE field_mappings
DROP CONSTRAINT IF EXISTS field_mappings_template_config_check;

ALTER TABLE field_mappings
ADD CONSTRAINT field_mappings_template_config_check 
CHECK (
  (template_id IS NOT NULL AND config_id IS NULL) OR
  (template_id IS NULL AND config_id IS NOT NULL)
);

-- Update unique constraint to support both templates and configs
DROP INDEX IF EXISTS idx_field_mappings_config_work_item_ardoq;

-- For configs: unique per config, work_item_type, ardoq_field
CREATE UNIQUE INDEX IF NOT EXISTS idx_field_mappings_config_unique
ON field_mappings(config_id, work_item_type, ardoq_field)
WHERE config_id IS NOT NULL;

-- For templates: unique per template, work_item_type, ardoq_field
CREATE UNIQUE INDEX IF NOT EXISTS idx_field_mappings_template_unique
ON field_mappings(template_id, work_item_type, ardoq_field)
WHERE template_id IS NOT NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_field_mapping_templates_process 
ON field_mapping_templates(process_template_name);

CREATE INDEX IF NOT EXISTS idx_field_mappings_template 
ON field_mappings(template_id);

-- Create a function to automatically update the updated_at timestamp for templates
CREATE OR REPLACE FUNCTION update_field_mapping_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update updated_at on row updates
DROP TRIGGER IF EXISTS update_field_mapping_templates_updated_at ON field_mapping_templates;
CREATE TRIGGER update_field_mapping_templates_updated_at
  BEFORE UPDATE ON field_mapping_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_field_mapping_templates_updated_at();

-- Optional: Add Row Level Security (RLS) policies if needed
-- Uncomment the following lines if you want to enable RLS
-- ALTER TABLE field_mapping_templates ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Service role can read all field mapping templates"
--   ON field_mapping_templates
--   FOR SELECT
--   USING (auth.role() = 'service_role');

