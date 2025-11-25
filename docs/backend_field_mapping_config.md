# Backend Field Mapping Requirements

This document outlines the backend implementation requirements for field mapping between Ardoq and Azure DevOps Agile template.

## Overview

The backend must implement field mapping functionality that transforms Ardoq field data to Azure DevOps work item fields when creating work items. Field mappings are project-specific and configurable.

## API Endpoints

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
   - If `fieldMappingConfigId` is provided in sync request, load that configuration
   - If not provided, use default mappings (see Default Mappings section)
   - If configuration doesn't exist, fall back to default mappings

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

### Default Field Mappings

If no field mapping configuration is provided, use these default mappings:

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

- Accept `fieldMappingConfigId` in the request body (optional)
- All Ardoq fields are now included in the request (not just name, description)

**Processing Flow:**

1. **Before Creating Work Items:**
   - Extract `fieldMappingConfigId` from request body
   - Load field mapping configuration (or use defaults)
   - Validate configuration exists (if provided)

2. **For Each Work Item:**
   - Get work item type (Epic, Feature, User Story)
   - Get mappings for that work item type
   - Transform Ardoq fields → Azure DevOps fields
   - Apply special transformations (Feature description concatenation)
   - Create work item with mapped fields

3. **Error Handling:**
   - If field mapping config not found: Log warning, use default mappings
   - If mapped field doesn't exist in Azure DevOps: Log warning, skip field
   - Never fail sync due to field mapping issues

## Database Schema

If storing field mapping configurations in database:

```sql
CREATE TABLE field_mapping_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  project_id VARCHAR(255) NOT NULL,
  project_name VARCHAR(255),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, name)
);

CREATE TABLE field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES field_mapping_configs(id) ON DELETE CASCADE,
  work_item_type VARCHAR(50) NOT NULL CHECK (work_item_type IN ('epic', 'feature', 'user_story')),
  ardoq_field VARCHAR(255) NOT NULL,
  azure_devops_field VARCHAR(255) NOT NULL,
  transform_function TEXT, -- Optional: JSON or code for transformation
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(config_id, work_item_type, ardoq_field)
);

CREATE INDEX idx_field_mapping_configs_project ON field_mapping_configs(project_id);
CREATE INDEX idx_field_mappings_config ON field_mappings(config_id);
```

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

- [ ] Create database tables for field mapping configurations (if using database)
- [ ] Implement field mapping configuration CRUD endpoints
- [ ] Implement work item types and fields endpoints
- [ ] Create field mapping engine service
- [ ] Implement default field mappings
- [ ] Implement Feature description concatenation logic
- [ ] Update sync endpoint to accept and use field mapping config ID
- [ ] Add field transformation logic (priority, tags, dates)
- [ ] Add error handling for missing fields/configs
- [ ] Add logging for field mapping operations
- [ ] Write unit tests for field mapping engine
- [ ] Write integration tests for field mapping endpoints
- [ ] Document field mapping API endpoints

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
