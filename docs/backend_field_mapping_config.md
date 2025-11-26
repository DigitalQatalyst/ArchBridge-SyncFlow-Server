# Backend Field Mapping Requirements

This document outlines the backend implementation requirements for field mapping between Ardoq and Azure DevOps Agile template.

## Overview

The backend must implement field mapping functionality that transforms Ardoq field data to Azure DevOps work item fields when creating work items. Field mappings support two types:

1. **Process Template Templates** (System Defaults) - Pre-defined, reusable templates for each Azure DevOps process template (Agile, Scrum, CMMI, Basic)
2. **Project-Specific Configurations** - Custom mappings tied to specific Azure DevOps projects

Users can choose to use a process template template or create project-specific configurations.

## API Endpoints

### Process Template Templates (System Defaults)

#### 0. Get Process Template Templates

**Endpoint:** `GET /api/field-mapping/templates?processTemplateName={processTemplateName}`

**Query Parameters:**

- `processTemplateName` (optional): Filter by process template name (e.g., "Agile", "Scrum", "CMMI", "Basic"). If omitted, returns all templates.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "template-agile-001",
      "processTemplateName": "Agile",
      "processTemplateTypeId": "adcc42ab-9882-485e-a3ed-7676785c7e0f",
      "name": "Agile Process Template - Default Mapping",
      "description": "Default field mapping for Agile process template",
      "isSystemDefault": true,
      "mappings": [
        {
          "id": "mapping-1",
          "ardoqField": "description",
          "azureDevOpsField": "System.Description",
          "workItemType": "epic"
        }
      ],
      "createdAt": "2024-01-01T12:00:00Z",
      "updatedAt": "2024-01-01T12:00:00Z"
    }
  ]
}
```

**Note:** Process template templates are system defaults and are read-only. They cannot be created, updated, or deleted by users.

### Field Mapping Configuration Management

#### 1. Get Field Mapping Configurations for a Project

**Endpoint:** `GET /api/field-mapping/configs?projectId={projectId}`

**Query Parameters:**

- `projectId` (required): Azure DevOps project ID or name

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "fm-config-123",
      "name": "Default Mapping",
      "description": "Default field mapping for Agile template",
      "projectId": "project-123",
      "projectName": "My Project",
      "mappings": [
        {
          "id": "mapping-1",
          "ardoqField": "description",
          "azureDevOpsField": "System.Description",
          "workItemType": "epic"
        }
      ],
      "isDefault": true,
      "createdAt": "2024-01-01T12:00:00Z",
      "updatedAt": "2024-01-01T12:00:00Z"
    }
  ]
}
```

#### 2. Get Specific Field Mapping Configuration

**Endpoint:** `GET /api/field-mapping/configs/{configId}`

**Response:** Single field mapping configuration object

#### 3. Create Field Mapping Configuration

**Endpoint:** `POST /api/field-mapping/configs`

**Request Body:**

```json
{
  "name": "Custom Mapping",
  "description": "Custom field mapping configuration",
  "projectId": "project-123",
  "projectName": "My Project",
  "mappings": [
    {
      "ardoqField": "description",
      "azureDevOpsField": "System.Description",
      "workItemType": "epic"
    },
    {
      "ardoqField": "priority",
      "azureDevOpsField": "Microsoft.VSTS.Common.Priority",
      "workItemType": "epic"
    }
  ],
  "isDefault": false
}
```

**Response:** Created field mapping configuration object

#### 4. Update Field Mapping Configuration

**Endpoint:** `PUT /api/field-mapping/configs/{configId}`

**Request Body:** Partial field mapping configuration object

**Response:** Updated field mapping configuration object

#### 5. Delete Field Mapping Configuration

**Endpoint:** `DELETE /api/field-mapping/configs/{configId}`

**Response:**

```json
{
  "success": true,
  "message": "Field mapping configuration deleted successfully"
}
```

### Work Item Types and Fields

#### 6. Get Work Item Types for a Project

**Endpoint:** `GET /api/field-mapping/work-item-types?projectId={projectId}&configId={configId}`

**Query Parameters:**

- `projectId` (required): Azure DevOps project ID or name
- `configId` (optional): Azure DevOps configuration ID

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "name": "Epic",
      "referenceName": "Microsoft.VSTS.WorkItemTypes.Epic",
      "fields": [
        {
          "referenceName": "System.Description",
          "name": "Description",
          "type": "Html",
          "workItemTypes": ["Epic", "Feature", "User Story"]
        }
      ]
    }
  ]
}
```

**Implementation Notes:**

- Use Azure DevOps REST API: `GET /_apis/wit/workitemtypes?api-version=7.1`
- For each work item type, fetch available fields using: `GET /_apis/wit/fields?api-version=7.1`
- Filter fields by work item type support

#### 7. Get Available Fields for Work Item Type

**Endpoint:** `GET /api/field-mapping/fields?projectId={projectId}&workItemType={workItemType}&configId={configId}`

**Query Parameters:**

- `projectId` (required): Azure DevOps project ID or name
- `workItemType` (required): Work item type (e.g., "Epic", "Feature", "User Story")
- `configId` (optional): Azure DevOps configuration ID

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "referenceName": "System.Description",
      "name": "Description",
      "type": "Html"
    }
  ]
}
```

## Field Mapping Engine

### Core Functionality

The backend must implement a field mapping engine that:

1. **Loads Field Mapping Configuration**
   - If `fieldMappingConfigId` is provided in sync request, load that project-specific configuration
   - If `processTemplateTemplateName` is provided, load the process template template for the project's process template
   - If neither provided, determine project's process template and use the corresponding process template template
   - If process template template doesn't exist, fall back to hardcoded default mappings (see Default Mappings section)
   - Resolution priority: project-specific config → process template template → hardcoded defaults

2. **Applies Field Mappings**
   - For each work item (Epic, Feature, User Story):
     - Get mappings for the work item type
     - Transform Ardoq fields to Azure DevOps fields based on mappings
     - Handle field type conversions (string to number, etc.)
     - Apply special transformations (e.g., Feature description concatenation)

3. **Handles Missing Fields**
   - If a mapped Azure DevOps field doesn't exist, log a warning and skip that field
   - Continue processing other fields
   - Never fail the entire sync due to missing fields

### Process Template Templates

System default templates are provided for each Azure DevOps process template. These templates define standard field mappings based on the fields available in each process template, as documented in the [Azure DevOps Work Item Fields documentation](https://learn.microsoft.com/en-us/azure/devops/boards/work-items/guidance/work-item-field?view=azure-devops).

#### Available Process Templates

- **Agile**: Supports Epic, Feature, User Story, Task, and Bug work item types
- **Scrum**: Supports Epic, Feature, Product Backlog Item, Task, and Bug work item types
- **Basic**: Supports Epic, Issue, and Task work item types
- **CMMI**: Supports Epic, Feature, Requirement, Task, Change Request, Review, Risk, and Bug work item types

#### Template Management

- Process template templates are **system defaults** and **not user-editable**
- Templates are automatically available for all projects using the corresponding process template
- Templates are pre-populated with standard field mappings based on each process template's available fields
- Users can create project-specific configurations that override or extend template mappings

### Default Field Mappings (Hardcoded Fallback)

If no field mapping configuration or process template template is available, use these hardcoded default mappings:

#### Epic Default Mappings

```
- description → System.Description
- priority → Microsoft.VSTS.Common.Priority (convert string to number if needed)
- tags → System.Tags (comma-separated if array)
- lastUpdatedBy → System.ChangedBy
- lastUpdatedDate → System.ChangedDate
```

#### Feature Default Mappings

**Important:** For Features, the description field should be constructed by appending purpose, input, output, and approach to the description/context field.

**Format:**

```
[Original Description/Context]

Purpose: [purpose value]
Input: [input value]
Output (Definition of Done): [output value]
Approach: [approach value]
```

**Mappings:**

```
- description/context → System.Description (with purpose, input, output, approach appended)
- tags → System.Tags (comma-separated if array)
- priority → Microsoft.VSTS.Common.Priority (convert string to number if needed)
```

#### User Story Default Mappings

```
- description → System.Description
- acceptanceCriteria → Microsoft.VSTS.Common.AcceptanceCriteria
- priority → Microsoft.VSTS.Common.Priority (convert number 1-4 to Azure DevOps priority scale)
- classification → Microsoft.VSTS.Common.Category (if field exists)
- risk → Custom field (if exists, convert: 1=high, 2=med, 3=low)
- tags → System.Tags (comma-separated if array)
```

### Field Transformation Rules

1. **Priority Conversion**
   - Ardoq priority (string): Convert to Azure DevOps priority (number)
   - User Story priority (1-4): Map to Azure DevOps priority scale (1=Critical, 2=High, 3=Medium, 4=Low)

2. **Tags**
   - If Ardoq tags is an array, join with commas
   - If string, use as-is

3. **Dates**
   - Convert Ardoq date format to Azure DevOps date format (ISO 8601)

4. **Feature Description Concatenation**
   - Always append purpose, input, output, and approach to description
   - Format with clear labels and line breaks
   - Only include sections that have values

## Sync Endpoint Integration

### Update Work Item Creation Endpoint

**Endpoint:** `POST /api/azure-devops/projects/:project/workitems?configId=xxx&overwrite=true`

**Request Body Changes:**

- Accept `fieldMappingConfigId` (project-specific config) OR `processTemplateTemplateName` in the request body (optional)
- All Ardoq fields are now included in the request (not just name, description)

**Processing Flow:**

1. **Before Creating Work Items:**
   - Extract `fieldMappingConfigId` or `processTemplateTemplateName` from request body
   - If `fieldMappingConfigId` provided: Load project-specific configuration
   - If `processTemplateTemplateName` provided: Load process template template for that template
   - If neither provided: Determine project's process template and load corresponding process template template
   - If template not found: Use hardcoded default mappings
   - Validate configuration/template exists (if provided)

2. **For Each Work Item:**
   - Get work item type (Epic, Feature, User Story)
   - Get mappings for that work item type
   - Transform Ardoq fields → Azure DevOps fields
   - Apply special transformations (Feature description concatenation)
   - Create work item with mapped fields

3. **Error Handling:**
   - If field mapping config not found: Log warning, try process template template, then hardcoded defaults
   - If process template template not found: Log warning, use hardcoded default mappings
   - If mapped field doesn't exist in Azure DevOps: Log warning, skip field
   - Never fail sync due to field mapping issues

## Database Schema

If storing field mapping configurations in database:

```sql
-- Process Template Templates (System Defaults - Read-Only)
CREATE TABLE field_mapping_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_template_name VARCHAR(50) NOT NULL UNIQUE, -- 'Agile', 'Scrum', 'CMMI', 'Basic'
  process_template_type_id VARCHAR(255), -- Azure DevOps process template type ID
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_system_default BOOLEAN DEFAULT TRUE, -- Always true for templates
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Project-Specific Field Mapping Configurations
CREATE TABLE field_mapping_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  project_id VARCHAR(255) NOT NULL,
  project_name VARCHAR(255),
  process_template_name VARCHAR(50), -- Reference to process template used by project
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, name)
);

-- Field Mappings (for both templates and project configs)
CREATE TABLE field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES field_mapping_templates(id) ON DELETE CASCADE,
  config_id UUID REFERENCES field_mapping_configs(id) ON DELETE CASCADE,
  work_item_type VARCHAR(50) NOT NULL CHECK (work_item_type IN ('epic', 'feature', 'user_story')),
  ardoq_field VARCHAR(255) NOT NULL,
  azure_devops_field VARCHAR(255) NOT NULL,
  transform_function TEXT, -- Optional: JSON or code for transformation
  created_at TIMESTAMP DEFAULT NOW(),
  CHECK (
    (template_id IS NOT NULL AND config_id IS NULL) OR
    (template_id IS NULL AND config_id IS NOT NULL)
  )
);

CREATE INDEX idx_field_mapping_templates_process ON field_mapping_templates(process_template_name);
CREATE INDEX idx_field_mapping_configs_project ON field_mapping_configs(project_id);
CREATE INDEX idx_field_mappings_template ON field_mappings(template_id);
CREATE INDEX idx_field_mappings_config ON field_mappings(config_id);
```

**Note:** Process template templates should be pre-populated with system defaults during database initialization/migration. These templates are read-only and cannot be modified by users.

## Azure DevOps Field References

### Common System Fields

- `System.Title` - Work item title
- `System.Description` - Description (HTML)
- `System.Tags` - Tags (comma-separated)
- `System.ChangedBy` - Last updated by (IdentityRef)
- `System.ChangedDate` - Last updated date (DateTime)
- `System.State` - State (String)
- `System.AssignedTo` - Assigned to (IdentityRef)

### VSTS Common Fields

- `Microsoft.VSTS.Common.Priority` - Priority (Integer: 1=Critical, 2=High, 3=Medium, 4=Low)
- `Microsoft.VSTS.Common.AcceptanceCriteria` - Acceptance Criteria (HTML)
- `Microsoft.VSTS.Common.StackRank` - Stack Rank (Double)
- `Microsoft.VSTS.Common.ValueArea` - Value Area (String: Business/Architectural)
- `Microsoft.VSTS.Common.Category` - Category (String)

### Custom Fields

Custom fields follow the pattern:

- `Custom.{FieldName}` - Organization-specific custom fields
- Or organization-specific namespace

**Note:** Field references may vary based on Azure DevOps organization's process template customization. Always verify field references using Azure DevOps REST API: `GET /_apis/wit/fields?api-version=7.1`

## Implementation Checklist

- [ ] Create database tables for field mapping templates and configurations (if using database)
- [ ] Create and populate system default process template templates (Agile, Scrum, CMMI, Basic)
- [ ] Implement API endpoint to list process template templates (read-only)
- [ ] Implement field mapping configuration CRUD endpoints (project-specific)
- [ ] Implement work item types and fields endpoints
- [ ] Create field mapping engine service with template resolution logic
- [ ] Implement mapping resolution: project-specific → process template template → hardcoded defaults
- [ ] Implement Feature description concatenation logic
- [ ] Update sync endpoint to accept field mapping config ID or process template template name
- [ ] Add field transformation logic (priority, tags, dates)
- [ ] Add error handling for missing fields/configs/templates
- [ ] Add logging for field mapping operations
- [ ] Write unit tests for field mapping engine and template resolution
- [ ] Write integration tests for field mapping endpoints
- [ ] Document field mapping API endpoints and template system

## Testing Requirements

1. **Unit Tests:**
   - Field mapping transformation logic
   - Default mapping application
   - Feature description concatenation
   - Field type conversions

2. **Integration Tests:**
   - Field mapping configuration CRUD operations
   - Work item creation with field mappings
   - Default mappings when no config provided
   - Error handling for missing fields

3. **Manual Testing:**
   - Create custom field mapping configuration
   - Sync work items with custom mappings
   - Verify fields appear correctly in Azure DevOps
   - Test with missing/custom Azure DevOps fields

## Error Handling

- **Field Mapping Config Not Found:** Log warning, use default mappings, continue sync
- **Mapped Field Doesn't Exist:** Log warning, skip field, continue with other fields
- **Invalid Field Type:** Log warning, attempt conversion, skip if conversion fails
- **Missing Required Azure DevOps Field:** Use default value if possible, otherwise log error

## Performance Considerations

- Cache field mapping configurations in memory
- Cache Azure DevOps work item types and fields per project
- Batch field mapping operations where possible
- Use efficient field lookup (indexed by work item type)
