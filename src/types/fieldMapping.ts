// Field Mapping type definitions

export type WorkItemType = 'epic' | 'feature' | 'user_story';

export interface FieldMapping {
  id?: string;
  ardoqField: string;
  azureDevOpsField: string;
  workItemType: WorkItemType;
  transformFunction?: string; // Optional: JSON or code for transformation
}

export interface FieldMappingConfig {
  id: string;
  name: string;
  description?: string;
  projectId: string;
  projectName?: string;
  mappings: FieldMapping[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Process Template Template (System Default)
 */
export interface FieldMappingTemplate {
  id: string;
  processTemplateName: string;
  processTemplateTypeId?: string;
  name: string;
  description?: string;
  isSystemDefault: boolean;
  mappings: FieldMapping[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Database row interface for field_mapping_configs table
 */
export interface FieldMappingConfigRow {
  id: string;
  name: string;
  description: string | null;
  project_id: string;
  project_name: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Database row interface for field_mapping_templates table
 */
export interface FieldMappingTemplateRow {
  id: string;
  process_template_name: string;
  process_template_type_id: string | null;
  name: string;
  description: string | null;
  is_system_default: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Database row interface for field_mappings table
 */
export interface FieldMappingRow {
  id: string;
  config_id: string | null;
  template_id: string | null;
  work_item_type: WorkItemType;
  ardoq_field: string;
  azure_devops_field: string;
  transform_function: string | null;
  created_at: string;
}

/**
 * Azure DevOps Work Item Type definition
 */
export interface WorkItemTypeDefinition {
  name: string;
  referenceName: string;
  fields?: WorkItemField[];
}

/**
 * Azure DevOps Work Item Field definition
 */
export interface WorkItemField {
  referenceName: string;
  name: string;
  type: string;
  workItemTypes?: string[]; // Array of work item types that support this field
}

/**
 * Request/Response types for API endpoints
 */
export interface CreateFieldMappingConfigRequest {
  name: string;
  description?: string;
  projectId: string;
  projectName?: string;
  mappings: Omit<FieldMapping, 'id'>[];
  isDefault?: boolean;
}

export interface UpdateFieldMappingConfigRequest {
  name?: string;
  description?: string;
  projectName?: string;
  mappings?: Omit<FieldMapping, 'id'>[];
  isDefault?: boolean;
}

export interface FieldMappingConfigResponse {
  success: boolean;
  data?: FieldMappingConfig | FieldMappingConfig[];
  error?: string;
  message?: string;
}

export interface WorkItemTypesResponse {
  success: boolean;
  data?: WorkItemTypeDefinition[];
  error?: string;
}

export interface WorkItemFieldsResponse {
  success: boolean;
  data?: WorkItemField[];
  error?: string;
}

export interface FieldMappingTemplateResponse {
  success: boolean;
  data?: FieldMappingTemplate | FieldMappingTemplate[];
  error?: string;
}

