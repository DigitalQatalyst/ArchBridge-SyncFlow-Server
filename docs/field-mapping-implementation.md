# Field Mapping Implementation Documentation

## Overview

Field mapping functionality has been fully implemented to enable configurable transformation of Ardoq component fields to Azure DevOps work item fields during synchronization. This allows users to customize how data flows from Ardoq to Azure DevOps on a per-project basis.

## Implementation Status

✅ **Fully Implemented** - All core functionality is complete and integrated.

## Architecture

### Components

1. **Database Layer** (`supabase-field-mapping-migration.sql`)
   - Stores field mapping configurations and mappings in Supabase
   - Two main tables: `field_mapping_configs` and `field_mappings`

2. **Storage Service** (`src/services/fieldMappingStorage.ts`)
   - Handles all database operations for field mapping configurations
   - Provides CRUD operations for configurations and mappings

3. **Mapping Engine** (`src/services/fieldMappingEngine.ts`)
   - Core transformation logic
   - Applies field mappings to Ardoq components
   - Handles default mappings when no configuration is provided

4. **API Controllers** (`src/controllers/fieldMapping/fieldMapping.ts`)
   - REST API endpoints for managing field mapping configurations
   - Endpoints for discovering Azure DevOps work item types and fields

5. **Type Definitions** (`src/types/fieldMapping.ts`)
   - TypeScript interfaces for all field mapping entities

6. **Integration** (`src/controllers/azureDevOps/azureDevOpsWorkItems.ts`)
   - Field mapping integrated into work item creation process

## Database Schema

### Tables

#### `field_mapping_configs`

Stores field mapping configuration metadata.

```sql
CREATE TABLE field_mapping_configs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  project_id TEXT NOT NULL,
  project_name TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Key Features:**

- Unique constraint on `(project_id, name)` to prevent duplicate config names per project
- `is_default` flag to mark default configurations
- Automatic `updated_at` timestamp via trigger

#### `field_mappings`

Stores individual field mappings within a configuration.

```sql
CREATE TABLE field_mappings (
  id TEXT PRIMARY KEY,
  config_id TEXT NOT NULL REFERENCES field_mapping_configs(id) ON DELETE CASCADE,
  work_item_type TEXT NOT NULL CHECK (work_item_type IN ('epic', 'feature', 'user_story')),
  ardoq_field TEXT NOT NULL,
  azure_devops_field TEXT NOT NULL,
  transform_function TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(config_id, work_item_type, ardoq_field)
);
```

**Key Features:**

- Foreign key with CASCADE delete (deleting a config deletes its mappings)
- Check constraint ensures valid work item types
- Unique constraint prevents duplicate mappings per config/work item type/field combination
- `transform_function` field reserved for future transformation logic

### Indexes

- `idx_field_mapping_configs_project` - Fast lookup by project
- `idx_field_mapping_configs_default` - Fast lookup of default configs
- `idx_field_mappings_config` - Fast lookup of mappings by config
- `idx_field_mappings_work_item_type` - Fast lookup by config and work item type

## API Endpoints

### Field Mapping Configuration Management

#### 1. Get All Configurations for a Project

```
GET /api/field-mapping/configs?projectId={projectId}
```

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
      "description": "Default field mapping",
      "projectId": "project-123",
      "projectName": "My Project",
      "mappings": [...],
      "isDefault": true,
      "createdAt": "2024-01-01T12:00:00Z",
      "updatedAt": "2024-01-01T12:00:00Z"
    }
  ]
}
```

#### 2. Get Specific Configuration

```
GET /api/field-mapping/configs/:id
```

**Response:** Single field mapping configuration object

#### 3. Create Configuration

```
POST /api/field-mapping/configs
```

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
    }
  ],
  "isDefault": false
}
```

**Validation:**

- `name` must be non-empty string
- `projectId` must be non-empty string
- `mappings` must be an array
- Each mapping must have `ardoqField`, `azureDevOpsField`, and `workItemType`
- `workItemType` must be one of: `epic`, `feature`, `user_story`
- If `isDefault` is true, other defaults for the project are automatically unset

#### 4. Update Configuration

```
PUT /api/field-mapping/configs/:id
```

**Request Body:** Partial configuration object (same structure as create)

**Behavior:**

- Updates configuration metadata
- If `mappings` provided, replaces all existing mappings
- If `isDefault` set to true, unsets other defaults for the project

#### 5. Delete Configuration

```
DELETE /api/field-mapping/configs/:id
```

**Response:**

```json
{
  "success": true,
  "message": "Field mapping configuration deleted successfully"
}
```

**Note:** Deletion cascades to all associated mappings.

### Work Item Discovery

#### 6. Get Work Item Types

```
GET /api/field-mapping/work-item-types?projectId={projectId}&configId={configId}
```

**Query Parameters:**

- `projectId` (required): Azure DevOps project ID or name
- `configId` (optional): Azure DevOps configuration ID for authentication

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

**Implementation Details:**

- Fetches work item types from Azure DevOps API
- For each type, fetches available fields
- Returns fields with their metadata (name, type, reference name)

#### 7. Get Fields for Work Item Type

```
GET /api/field-mapping/fields?projectId={projectId}&workItemType={workItemType}&configId={configId}
```

**Query Parameters:**

- `projectId` (required): Azure DevOps project ID or name
- `workItemType` (required): Work item type name (e.g., "Epic", "Feature", "User Story")
- `configId` (optional): Azure DevOps configuration ID for authentication

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

The `FieldMappingEngine` class (`src/services/fieldMappingEngine.ts`) provides:

1. **Configuration Loading**
   - Loads field mapping configuration by ID
   - Falls back to default configuration for project if no ID provided
   - Falls back to hardcoded defaults if no configuration found

2. **Field Transformation**
   - Maps Ardoq component fields to Azure DevOps work item fields
   - Handles special transformations (priority, tags, dates, etc.)
   - Builds Azure DevOps patch documents for work item creation

3. **Default Mappings**
   - Provides sensible defaults when no configuration exists
   - Different defaults for Epic, Feature, and User Story

### Default Field Mappings

#### Epic Default Mappings

- `description` → `System.Description`
- `priority` → `Microsoft.VSTS.Common.Priority` (with conversion)
- `tags` → `System.Tags` (array to comma-separated string)
- `lastUpdatedBy` → `System.ChangedBy`
- `lastUpdatedDate` → `System.ChangedDate`

#### Feature Default Mappings

- `description` → `System.Description` (with special concatenation - see below)
- `tags` → `System.Tags`
- `priority` → `Microsoft.VSTS.Common.Priority`

**Special Feature Description Handling:**
For Features, the description field is constructed by concatenating:

1. Main description/context
2. Purpose
3. Input
4. Output (Definition of Done)
5. Approach

Format:

```
[Original Description/Context]

Purpose: [purpose value]
Input: [input value]
Output (Definition of Done): [output value]
Approach: [approach value]
```

#### User Story Default Mappings

- `description` → `System.Description`
- `acceptanceCriteria` → `Microsoft.VSTS.Common.AcceptanceCriteria`
- `priority` → `Microsoft.VSTS.Common.Priority` (1-4 scale)
- `classification` → `Microsoft.VSTS.Common.Category`
- `risk` → `Custom.Risk` (with conversion: 1=High, 2=Medium, 3=Low)
- `tags` → `System.Tags`

### Field Transformations

The engine handles several automatic transformations:

1. **Priority Conversion**
   - Converts string priorities ("critical", "high", "medium", "low") to numbers (1-4)
   - Validates numeric priorities are in range 1-4
   - Defaults to 3 (Medium) if conversion fails

2. **Tags Conversion**
   - Converts arrays to comma-separated strings
   - Handles null/undefined values

3. **Date Conversion**
   - Converts dates to ISO 8601 format
   - Handles Date objects, strings, and timestamps

4. **Risk Conversion** (User Stories)
   - Converts numeric risk values: 1=High, 2=Medium, 3=Low
   - Falls back to string representation if invalid

5. **IdentityRef Fields**
   - Handles `System.ChangedBy` and `System.AssignedTo`
   - Converts to string (Azure DevOps may handle further conversion)

6. **Nested Field Access**
   - Supports dot notation for nested fields (e.g., `metadata.createdBy`)
   - Safely handles missing nested properties

### Error Handling

The engine is designed to be resilient:

- **Missing Configuration:** Falls back to default mappings, logs warning
- **Missing Field Values:** Skips mapping, continues with other fields
- **Invalid Field Types:** Attempts conversion, logs warning if fails
- **Missing Azure DevOps Fields:** Logs warning, skips field (doesn't fail sync)

## Integration with Work Item Creation

### Sync Endpoint Integration

The field mapping is integrated into the work item creation endpoint:

```
POST /api/azure-devops/projects/:project/workitems?configId={configId}&overwrite={overwrite}
```

**Request Body:**

```json
{
  "epics": [...],
  "fieldMappingConfigId": "fm-config-123"  // Optional
}
```

### Processing Flow

1. **Load Configuration**
   - If `fieldMappingConfigId` provided, load that configuration
   - If not provided, try to load default configuration for project
   - If no configuration found, use hardcoded defaults

2. **For Each Work Item**
   - Determine work item type (Epic, Feature, User Story)
   - Get mappings for that work item type
   - Extract field values from Ardoq component
   - Transform values according to mapping rules
   - Build Azure DevOps patch document
   - Create work item with mapped fields

3. **Error Handling**
   - Configuration not found: Use defaults, log warning
   - Field mapping fails: Skip field, log warning, continue
   - Never fails entire sync due to field mapping issues

## Storage Service

The `FieldMappingStorage` class (`src/services/fieldMappingStorage.ts`) provides:

### Methods

- `saveConfiguration(config, mappings)` - Create new configuration
- `getConfigurationById(id)` - Get configuration by ID
- `getConfigurationsByProject(projectId)` - Get all configs for project
- `getDefaultConfiguration(projectId)` - Get default config for project
- `updateConfiguration(id, updates, mappings?)` - Update configuration
- `deleteConfiguration(id)` - Delete configuration (cascades to mappings)
- `getMappingsByConfig(configId)` - Get all mappings for config
- `getMappingsByConfigAndType(configId, workItemType)` - Get filtered mappings

### Features

- **Automatic Default Management:** When setting a config as default, automatically unsets other defaults for the same project
- **Transaction-like Behavior:** If mapping insert fails, rolls back config creation
- **Efficient Queries:** Uses indexes for fast lookups
- **Type Safety:** Full TypeScript type definitions

## Type Definitions

All types are defined in `src/types/fieldMapping.ts`:

- `WorkItemType` - Union type: `'epic' | 'feature' | 'user_story'`
- `FieldMapping` - Individual field mapping
- `FieldMappingConfig` - Configuration with mappings
- `FieldMappingConfigRow` - Database row format for configs
- `FieldMappingRow` - Database row format for mappings
- `WorkItemTypeDefinition` - Azure DevOps work item type info
- `WorkItemField` - Azure DevOps field definition
- Request/Response types for API endpoints

## Usage Examples

### Creating a Custom Field Mapping Configuration

```typescript
// POST /api/field-mapping/configs
{
  "name": "Custom Epic Mapping",
  "description": "Custom mapping for epics with additional fields",
  "projectId": "my-project",
  "projectName": "My Project",
  "isDefault": true,
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
    },
    {
      "ardoqField": "customField",
      "azureDevOpsField": "Custom.MyCustomField",
      "workItemType": "epic"
    }
  ]
}
```

### Using Field Mapping in Sync

```typescript
// POST /api/azure-devops/projects/my-project/workitems?configId=xxx
{
  "epics": [
    {
      "name": "My Epic",
      "description": "Epic description",
      "priority": "high",
      "tags": ["tag1", "tag2"]
    }
  ],
  "fieldMappingConfigId": "fm-config-123"
}
```

The sync will:

1. Load configuration `fm-config-123`
2. Map `description` → `System.Description`
3. Map `priority` → `Microsoft.VSTS.Common.Priority` (converted to 2)
4. Map `tags` → `System.Tags` (converted to "tag1, tag2")
5. Create work item with mapped fields

## Testing

### Manual Testing Checklist

- [x] Create field mapping configuration via API
- [x] Update field mapping configuration
- [x] Delete field mapping configuration
- [x] Get work item types and fields from Azure DevOps
- [x] Sync work items with custom field mapping
- [x] Sync work items with default field mapping
- [x] Verify Feature description concatenation
- [x] Verify priority conversion
- [x] Verify tags array to string conversion
- [x] Test with missing configuration (should use defaults)
- [x] Test with invalid field mappings (should skip gracefully)

## Future Enhancements

Potential improvements for future iterations:

1. **Transform Functions**
   - Implement support for `transform_function` field
   - Allow custom JavaScript/JSON transformations

2. **Field Validation**
   - Validate Azure DevOps fields exist before saving mappings
   - Provide field type validation

3. **Bulk Operations**
   - Import/export field mapping configurations
   - Clone configurations between projects

4. **UI Integration**
   - Frontend UI for managing field mappings
   - Visual mapping builder

5. **Advanced Transformations**
   - Conditional mappings
   - Multi-field concatenation
   - Lookup tables for value mapping

## Related Files

- Database Migration: `supabase-field-mapping-migration.sql`
- Storage Service: `src/services/fieldMappingStorage.ts`
- Mapping Engine: `src/services/fieldMappingEngine.ts`
- API Controllers: `src/controllers/fieldMapping/fieldMapping.ts`
- Type Definitions: `src/types/fieldMapping.ts`
- Integration: `src/controllers/azureDevOps/azureDevOpsWorkItems.ts`
- Routes: `src/routes/api.ts`
- Requirements Doc: `docs/backend_field_mapping_config.md`

## Summary

Field mapping is fully implemented and production-ready. It provides:

✅ Complete CRUD API for field mapping configurations
✅ Integration with work item creation process
✅ Default mappings for all work item types
✅ Special handling for Feature descriptions
✅ Robust error handling and fallbacks
✅ Database persistence with Supabase
✅ Type-safe TypeScript implementation
✅ Discovery endpoints for Azure DevOps fields

The implementation follows best practices with proper error handling, type safety, and extensibility for future enhancements.
