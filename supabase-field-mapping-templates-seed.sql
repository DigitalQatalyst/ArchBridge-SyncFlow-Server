-- Supabase Migration: Seed System Default Process Template Templates
-- Run this SQL in your Supabase SQL Editor to populate default templates
-- This should be run after the field_mapping_templates table is created

-- Process Template Type IDs (standard Azure DevOps process template IDs)
-- Agile: adcc42ab-9882-485e-a3ed-7676785c7e0f
-- Scrum: 6b724908-ef14-45cf-84f8-768b5384da45
-- CMMI: 27450541-8e31-4150-9947-d59beef0d2ce
-- Basic: b8a3a935-7e91-48b8-a94c-8d3a4b8e8d3a

-- Insert Agile Template
INSERT INTO field_mapping_templates (
  id,
  process_template_name,
  process_template_type_id,
  name,
  description,
  is_system_default
) VALUES (
  'template-agile-default',
  'Agile',
  'adcc42ab-9882-485e-a3ed-7676785c7e0f',
  'Agile Process Template - Default Mapping',
  'Default field mapping for Agile process template (Epic, Feature, User Story, Task, Bug)',
  TRUE
) ON CONFLICT (process_template_name) DO NOTHING;

-- Insert Agile Template Mappings
INSERT INTO field_mappings (
  id,
  template_id,
  config_id,
  work_item_type,
  ardoq_field,
  azure_devops_field,
  transform_function
) VALUES
  -- Epic mappings
  ('agile-epic-desc', 'template-agile-default', NULL, 'epic', 'description', 'System.Description', NULL),
  ('agile-epic-priority', 'template-agile-default', NULL, 'epic', 'priority', 'Microsoft.VSTS.Common.Priority', NULL),
  ('agile-epic-tags', 'template-agile-default', NULL, 'epic', 'tags', 'System.Tags', NULL),
  ('agile-epic-componentkey', 'template-agile-default', NULL, 'epic', 'componentKey', 'System.Tags', NULL),
  ('agile-epic-changedby', 'template-agile-default', NULL, 'epic', 'lastUpdatedBy', 'System.ChangedBy', NULL),
  ('agile-epic-changeddate', 'template-agile-default', NULL, 'epic', 'lastUpdatedDate', 'System.ChangedDate', NULL),
  -- Feature mappings
  ('agile-feature-desc', 'template-agile-default', NULL, 'feature', 'description', 'System.Description', NULL),
  ('agile-feature-tags', 'template-agile-default', NULL, 'feature', 'tags', 'System.Tags', NULL),
  ('agile-feature-componentkey', 'template-agile-default', NULL, 'feature', 'componentKey', 'System.Tags', NULL),
  ('agile-feature-priority', 'template-agile-default', NULL, 'feature', 'priority', 'Microsoft.VSTS.Common.Priority', NULL),
  -- User Story mappings
  ('agile-us-desc', 'template-agile-default', NULL, 'user_story', 'description', 'System.Description', NULL),
  ('agile-us-acceptance', 'template-agile-default', NULL, 'user_story', 'acceptanceCriteria', 'Microsoft.VSTS.Common.AcceptanceCriteria', NULL),
  ('agile-us-priority', 'template-agile-default', NULL, 'user_story', 'priority', 'Microsoft.VSTS.Common.Priority', NULL),
  ('agile-us-classification', 'template-agile-default', NULL, 'user_story', 'classification', 'Microsoft.VSTS.Common.Category', NULL),
  ('agile-us-risk', 'template-agile-default', NULL, 'user_story', 'risk', 'Custom.Risk', NULL),
  ('agile-us-tags', 'template-agile-default', NULL, 'user_story', 'tags', 'System.Tags', NULL),
  ('agile-us-componentkey', 'template-agile-default', NULL, 'user_story', 'componentKey', 'System.Tags', NULL)
ON CONFLICT DO NOTHING;

-- Insert Scrum Template
INSERT INTO field_mapping_templates (
  id,
  process_template_name,
  process_template_type_id,
  name,
  description,
  is_system_default
) VALUES (
  'template-scrum-default',
  'Scrum',
  '6b724908-ef14-45cf-84f8-768b5384da45',
  'Scrum Process Template - Default Mapping',
  'Default field mapping for Scrum process template (Epic, Feature, Product Backlog Item, Task, Bug)',
  TRUE
) ON CONFLICT (process_template_name) DO NOTHING;

-- Insert Scrum Template Mappings (similar to Agile, but Product Backlog Item instead of User Story)
INSERT INTO field_mappings (
  id,
  template_id,
  config_id,
  work_item_type,
  ardoq_field,
  azure_devops_field,
  transform_function
) VALUES
  -- Epic mappings
  ('scrum-epic-desc', 'template-scrum-default', NULL, 'epic', 'description', 'System.Description', NULL),
  ('scrum-epic-priority', 'template-scrum-default', NULL, 'epic', 'priority', 'Microsoft.VSTS.Common.Priority', NULL),
  ('scrum-epic-tags', 'template-scrum-default', NULL, 'epic', 'tags', 'System.Tags', NULL),
  ('scrum-epic-componentkey', 'template-scrum-default', NULL, 'epic', 'componentKey', 'System.Tags', NULL),
  ('scrum-epic-changedby', 'template-scrum-default', NULL, 'epic', 'lastUpdatedBy', 'System.ChangedBy', NULL),
  ('scrum-epic-changeddate', 'template-scrum-default', NULL, 'epic', 'lastUpdatedDate', 'System.ChangedDate', NULL),
  -- Feature mappings
  ('scrum-feature-desc', 'template-scrum-default', NULL, 'feature', 'description', 'System.Description', NULL),
  ('scrum-feature-tags', 'template-scrum-default', NULL, 'feature', 'tags', 'System.Tags', NULL),
  ('scrum-feature-componentkey', 'template-scrum-default', NULL, 'feature', 'componentKey', 'System.Tags', NULL),
  ('scrum-feature-priority', 'template-scrum-default', NULL, 'feature', 'priority', 'Microsoft.VSTS.Common.Priority', NULL),
  -- User Story mappings (maps to Product Backlog Item in Scrum)
  ('scrum-pbi-desc', 'template-scrum-default', NULL, 'user_story', 'description', 'System.Description', NULL),
  ('scrum-pbi-acceptance', 'template-scrum-default', NULL, 'user_story', 'acceptanceCriteria', 'Microsoft.VSTS.Common.AcceptanceCriteria', NULL),
  ('scrum-pbi-priority', 'template-scrum-default', NULL, 'user_story', 'priority', 'Microsoft.VSTS.Common.Priority', NULL),
  ('scrum-pbi-tags', 'template-scrum-default', NULL, 'user_story', 'tags', 'System.Tags', NULL),
  ('scrum-pbi-componentkey', 'template-scrum-default', NULL, 'user_story', 'componentKey', 'System.Tags', NULL)
ON CONFLICT DO NOTHING;

-- Insert Basic Template
INSERT INTO field_mapping_templates (
  id,
  process_template_name,
  process_template_type_id,
  name,
  description,
  is_system_default
) VALUES (
  'template-basic-default',
  'Basic',
  '27450541-8e31-4150-9947-d59beef0d2ce',
  'Basic Process Template - Default Mapping',
  'Default field mapping for Basic process template (Epic, Issue, Task)',
  TRUE
) ON CONFLICT (process_template_name) DO NOTHING;

-- Insert Basic Template Mappings
INSERT INTO field_mappings (
  id,
  template_id,
  config_id,
  work_item_type,
  ardoq_field,
  azure_devops_field,
  transform_function
) VALUES
  -- Epic mappings
  ('basic-epic-desc', 'template-basic-default', NULL, 'epic', 'description', 'System.Description', NULL),
  ('basic-epic-tags', 'template-basic-default', NULL, 'epic', 'tags', 'System.Tags', NULL),
  ('basic-epic-componentkey', 'template-basic-default', NULL, 'epic', 'componentKey', 'System.Tags', NULL),
  ('basic-epic-changedby', 'template-basic-default', NULL, 'epic', 'lastUpdatedBy', 'System.ChangedBy', NULL),
  ('basic-epic-changeddate', 'template-basic-default', NULL, 'epic', 'lastUpdatedDate', 'System.ChangedDate', NULL),
  -- Feature mappings (maps to Issue in Basic)
  ('basic-issue-desc', 'template-basic-default', NULL, 'feature', 'description', 'System.Description', NULL),
  ('basic-issue-tags', 'template-basic-default', NULL, 'feature', 'tags', 'System.Tags', NULL),
  ('basic-issue-componentkey', 'template-basic-default', NULL, 'feature', 'componentKey', 'System.Tags', NULL),
  -- User Story mappings (maps to Task in Basic)
  ('basic-task-desc', 'template-basic-default', NULL, 'user_story', 'description', 'System.Description', NULL),
  ('basic-task-tags', 'template-basic-default', NULL, 'user_story', 'tags', 'System.Tags', NULL),
  ('basic-task-componentkey', 'template-basic-default', NULL, 'user_story', 'componentKey', 'System.Tags', NULL)
ON CONFLICT DO NOTHING;

-- Insert CMMI Template
INSERT INTO field_mapping_templates (
  id,
  process_template_name,
  process_template_type_id,
  name,
  description,
  is_system_default
) VALUES (
  'template-cmmi-default',
  'CMMI',
  '27450541-8e31-4150-9947-d59beef0d2ce',
  'CMMI Process Template - Default Mapping',
  'Default field mapping for CMMI process template (Epic, Feature, Requirement, Task, Change Request, Review, Risk, Bug)',
  TRUE
) ON CONFLICT (process_template_name) DO NOTHING;

-- Insert CMMI Template Mappings
INSERT INTO field_mappings (
  id,
  template_id,
  config_id,
  work_item_type,
  ardoq_field,
  azure_devops_field,
  transform_function
) VALUES
  -- Epic mappings
  ('cmmi-epic-desc', 'template-cmmi-default', NULL, 'epic', 'description', 'System.Description', NULL),
  ('cmmi-epic-priority', 'template-cmmi-default', NULL, 'epic', 'priority', 'Microsoft.VSTS.Common.Priority', NULL),
  ('cmmi-epic-tags', 'template-cmmi-default', NULL, 'epic', 'tags', 'System.Tags', NULL),
  ('cmmi-epic-componentkey', 'template-cmmi-default', NULL, 'epic', 'componentKey', 'System.Tags', NULL),
  ('cmmi-epic-changedby', 'template-cmmi-default', NULL, 'epic', 'lastUpdatedBy', 'System.ChangedBy', NULL),
  ('cmmi-epic-changeddate', 'template-cmmi-default', NULL, 'epic', 'lastUpdatedDate', 'System.ChangedDate', NULL),
  -- Feature mappings
  ('cmmi-feature-desc', 'template-cmmi-default', NULL, 'feature', 'description', 'System.Description', NULL),
  ('cmmi-feature-tags', 'template-cmmi-default', NULL, 'feature', 'tags', 'System.Tags', NULL),
  ('cmmi-feature-componentkey', 'template-cmmi-default', NULL, 'feature', 'componentKey', 'System.Tags', NULL),
  ('cmmi-feature-priority', 'template-cmmi-default', NULL, 'feature', 'priority', 'Microsoft.VSTS.Common.Priority', NULL),
  -- User Story mappings (maps to Requirement in CMMI)
  ('cmmi-req-desc', 'template-cmmi-default', NULL, 'user_story', 'description', 'System.Description', NULL),
  ('cmmi-req-acceptance', 'template-cmmi-default', NULL, 'user_story', 'acceptanceCriteria', 'Microsoft.VSTS.Common.AcceptanceCriteria', NULL),
  ('cmmi-req-priority', 'template-cmmi-default', NULL, 'user_story', 'priority', 'Microsoft.VSTS.Common.Priority', NULL),
  ('cmmi-req-tags', 'template-cmmi-default', NULL, 'user_story', 'tags', 'System.Tags', NULL),
  ('cmmi-req-componentkey', 'template-cmmi-default', NULL, 'user_story', 'componentKey', 'System.Tags', NULL)
ON CONFLICT DO NOTHING;

