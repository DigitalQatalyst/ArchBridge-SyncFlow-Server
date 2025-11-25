# Backend Sync History and Audit Logs Setup Guide

This document outlines the backend implementation requirements for sync history and audit logging functionality.

## Database Schema

### 1. sync_history Table

```sql
CREATE TYPE sync_status AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'cancelled');

CREATE TABLE sync_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type VARCHAR(50) NOT NULL,
    source_config_id UUID,
    target_type VARCHAR(50) NOT NULL,
    target_config_id UUID,
    project_name VARCHAR(255) NOT NULL,
    status sync_status NOT NULL DEFAULT 'pending',
    overwrite_mode BOOLEAN NOT NULL DEFAULT false,
    total_items INTEGER NOT NULL DEFAULT 0,
    items_created INTEGER NOT NULL DEFAULT 0,
    items_failed INTEGER NOT NULL DEFAULT 0,
    epics_created INTEGER NOT NULL DEFAULT 0,
    epics_failed INTEGER NOT NULL DEFAULT 0,
    features_created INTEGER NOT NULL DEFAULT 0,
    features_failed INTEGER NOT NULL DEFAULT 0,
    user_stories_created INTEGER NOT NULL DEFAULT 0,
    user_stories_failed INTEGER NOT NULL DEFAULT 0,
    deletion_count INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    error_message TEXT,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_sync_history_status ON sync_history(status);
CREATE INDEX idx_sync_history_created_at ON sync_history(created_at DESC);
CREATE INDEX idx_sync_history_source_config ON sync_history(source_config_id);
CREATE INDEX idx_sync_history_target_config ON sync_history(target_config_id);
CREATE INDEX idx_sync_history_project_name ON sync_history(project_name);
```

### 2. sync_history_items Table

```sql
CREATE TYPE item_type AS ENUM ('epic', 'feature', 'user_story');
CREATE TYPE item_status AS ENUM ('created', 'failed', 'skipped');

CREATE TABLE sync_history_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_history_id UUID NOT NULL REFERENCES sync_history(id) ON DELETE CASCADE,
    ardoq_id VARCHAR(255) NOT NULL,
    item_name VARCHAR(500) NOT NULL,
    item_type item_type NOT NULL,
    status item_status NOT NULL,
    azure_devops_id INTEGER,
    azure_devops_url TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_sync_history_items_sync_id ON sync_history_items(sync_history_id);
CREATE INDEX idx_sync_history_items_status ON sync_history_items(status);
CREATE INDEX idx_sync_history_items_type ON sync_history_items(item_type);
CREATE INDEX idx_sync_history_items_ardoq_id ON sync_history_items(ardoq_id);
```

### 3. audit_logs Table

```sql
CREATE TYPE action_type AS ENUM (
    'sync_started',
    'sync_completed',
    'sync_failed',
    'sync_cancelled',
    'config_created',
    'config_updated',
    'config_deleted',
    'config_activated',
    'connection_tested'
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type action_type NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    user_id UUID,
    source_ip VARCHAR(45),
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
```

## API Endpoints

### Sync History Endpoints

#### GET /api/sync-history

List all sync history records with pagination and filtering.

**Query Parameters:**

- `limit` (integer, default: 50, max: 100) - Number of records per page
- `offset` (integer, default: 0) - Pagination offset
- `status` (string, optional) - Filter by status: 'pending', 'in_progress', 'completed', 'failed', 'cancelled'
- `source_type` (string, optional) - Filter by source type (e.g., 'ardoq')
- `target_type` (string, optional) - Filter by target type (e.g., 'azure-devops')
- `start_date` (ISO 8601 date, optional) - Filter records from this date
- `end_date` (ISO 8601 date, optional) - Filter records until this date
- `project_name` (string, optional) - Filter by project name (partial match)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "source_type": "ardoq",
      "source_config_id": "uuid",
      "target_type": "azure-devops",
      "target_config_id": "uuid",
      "project_name": "My Project",
      "status": "completed",
      "overwrite_mode": false,
      "total_items": 15,
      "items_created": 15,
      "items_failed": 0,
      "epics_created": 3,
      "epics_failed": 0,
      "features_created": 5,
      "features_failed": 0,
      "user_stories_created": 7,
      "user_stories_failed": 0,
      "deletion_count": 0,
      "started_at": "2024-01-15T10:00:00Z",
      "completed_at": "2024-01-15T10:05:00Z",
      "duration_ms": 300000,
      "error_message": null,
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:05:00Z"
    }
  ],
  "pagination": {
    "total": 100,
    "limit": 50,
    "offset": 0,
    "has_more": true
  }
}
```

#### GET /api/sync-history/:id

Get detailed sync history record by ID.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "source_type": "ardoq",
    "source_config_id": "uuid",
    "target_type": "azure-devops",
    "target_config_id": "uuid",
    "project_name": "My Project",
    "status": "completed",
    "overwrite_mode": false,
    "total_items": 15,
    "items_created": 15,
    "items_failed": 0,
    "epics_created": 3,
    "epics_failed": 0,
    "features_created": 5,
    "features_failed": 0,
    "user_stories_created": 7,
    "user_stories_failed": 0,
    "deletion_count": 0,
    "started_at": "2024-01-15T10:00:00Z",
    "completed_at": "2024-01-15T10:05:00Z",
    "duration_ms": 300000,
    "error_message": null,
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:05:00Z"
  }
}
```

#### GET /api/sync-history/:id/items

Get all items for a specific sync history record.

**Query Parameters:**

- `limit` (integer, default: 100, max: 500)
- `offset` (integer, default: 0)
- `status` (string, optional) - Filter by status: 'created', 'failed', 'skipped'
- `item_type` (string, optional) - Filter by type: 'epic', 'feature', 'user_story'

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "sync_history_id": "uuid",
      "ardoq_id": "epic-123",
      "item_name": "Epic Name",
      "item_type": "epic",
      "status": "created",
      "azure_devops_id": 12345,
      "azure_devops_url": "https://dev.azure.com/org/project/_workitems/edit/12345",
      "error_message": null,
      "created_at": "2024-01-15T10:01:00Z"
    }
  ],
  "pagination": {
    "total": 15,
    "limit": 100,
    "offset": 0,
    "has_more": false
  }
}
```

#### GET /api/sync-history/stats

Get aggregate statistics for sync history.

**Query Parameters:**

- `start_date` (ISO 8601 date, optional)
- `end_date` (ISO 8601 date, optional)

**Response:**

```json
{
  "success": true,
  "data": {
    "total_syncs": 150,
    "completed_syncs": 140,
    "failed_syncs": 8,
    "cancelled_syncs": 2,
    "success_rate": 93.33,
    "average_duration_ms": 285000,
    "total_items_created": 2250,
    "total_items_failed": 45
  }
}
```

### Audit Logs Endpoints

#### GET /api/audit-logs

List audit log entries with pagination and filtering.

**Query Parameters:**

- `limit` (integer, default: 50, max: 100)
- `offset` (integer, default: 0)
- `action_type` (string, optional) - Filter by action type
- `entity_type` (string, optional) - Filter by entity type
- `start_date` (ISO 8601 date, optional)
- `end_date` (ISO 8601 date, optional)
- `entity_id` (UUID, optional) - Filter by specific entity ID

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "action_type": "sync_started",
      "entity_type": "sync",
      "entity_id": "uuid",
      "user_id": null,
      "source_ip": "192.168.1.1",
      "user_agent": "Mozilla/5.0...",
      "details": {
        "source_type": "ardoq",
        "target_type": "azure-devops",
        "project_name": "My Project"
      },
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 500,
    "limit": 50,
    "offset": 0,
    "has_more": true
  }
}
```

#### GET /api/audit-logs/stats

Get aggregate statistics for audit logs.

**Query Parameters:**

- `start_date` (ISO 8601 date, optional)
- `end_date` (ISO 8601 date, optional)

**Response:**

```json
{
  "success": true,
  "data": {
    "total_events": 500,
    "events_today": 25,
    "action_type_counts": {
      "sync_started": 150,
      "sync_completed": 140,
      "sync_failed": 8,
      "config_created": 10,
      "config_updated": 5
    }
  }
}
```

## Integration Points

### 1. Sync Endpoint Integration

Modify the sync endpoint (`POST /api/azure-devops/projects/:project/workitems`) to:

1. **Before sync starts:**

   ```javascript
   const syncHistoryId = await createSyncHistory({
     source_type: 'ardoq',
     source_config_id: sourceConfigId,
     target_type: 'azure-devops',
     target_config_id: targetConfigId,
     project_name: projectName,
     status: 'pending',
     overwrite_mode: overwrite || false,
     total_items: request.epics.reduce((count, epic) => {
       // Calculate total items
     }, 0),
     started_at: new Date()
   });

   await createAuditLog({
     action_type: 'sync_started',
     entity_type: 'sync',
     entity_id: syncHistoryId,
     source_ip: req.ip,
     user_agent: req.headers['user-agent'],
     details: {
       source_type: 'ardoq',
       target_type: 'azure-devops',
       project_name: projectName,
       overwrite_mode: overwrite || false
     }
   });
   ```

2. **Update status to in_progress:**

   ```javascript
   await updateSyncHistory(syncHistoryId, {
     status: 'in_progress'
   });
   ```

3. **For each item created/failed:**

   ```javascript
   await createSyncHistoryItem({
     sync_history_id: syncHistoryId,
     ardoq_id: item._id,
     item_name: item.name,
     item_type: item.type,
     status: 'created', // or 'failed'
     azure_devops_id: createdItem.id,
     azure_devops_url: createdItem.url,
     error_message: error ? error.message : null
   });

   // Update counters in sync_history
   await incrementSyncHistoryCounters(syncHistoryId, {
     items_created: 1,
     epics_created: item.type === 'epic' ? 1 : 0,
     // etc.
   });
   ```

4. **On sync completion:**

   ```javascript
   const completedAt = new Date();
   const durationMs = completedAt - startedAt;

   await updateSyncHistory(syncHistoryId, {
     status: 'completed',
     completed_at: completedAt,
     duration_ms: durationMs
   });

   await createAuditLog({
     action_type: 'sync_completed',
     entity_type: 'sync',
     entity_id: syncHistoryId,
     source_ip: req.ip,
     user_agent: req.headers['user-agent'],
     details: {
       total_items: summary.total,
       items_created: summary.created,
       items_failed: summary.failed
     }
   });
   ```

5. **On sync failure:**

   ```javascript
   await updateSyncHistory(syncHistoryId, {
     status: 'failed',
     completed_at: new Date(),
     error_message: error.message
   });

   await createAuditLog({
     action_type: 'sync_failed',
     entity_type: 'sync',
     entity_id: syncHistoryId,
     source_ip: req.ip,
     user_agent: req.headers['user-agent'],
     details: {
       error: error.message
     }
   });
   ```

6. **On sync cancellation:**

   ```javascript
   await updateSyncHistory(syncHistoryId, {
     status: 'cancelled',
     completed_at: new Date()
   });

   await createAuditLog({
     action_type: 'sync_cancelled',
     entity_type: 'sync',
     entity_id: syncHistoryId,
     source_ip: req.ip,
     user_agent: req.headers['user-agent']
   });
   ```

### 2. Configuration Endpoints Integration

Add audit logging to configuration operations:

**Configuration Created:**

```javascript
await createAuditLog({
  action_type: 'config_created',
  entity_type: 'configuration',
  entity_id: config.id,
  source_ip: req.ip,
  user_agent: req.headers['user-agent'],
  details: {
    config_type: 'azure-devops', // or 'ardoq'
    config_name: config.name
  }
});
```

**Configuration Updated:**

```javascript
await createAuditLog({
  action_type: 'config_updated',
  entity_type: 'configuration',
  entity_id: config.id,
  source_ip: req.ip,
  user_agent: req.headers['user-agent'],
  details: {
    config_type: 'azure-devops',
    config_name: config.name,
    changes: updatedFields
  }
});
```

**Configuration Deleted:**

```javascript
await createAuditLog({
  action_type: 'config_deleted',
  entity_type: 'configuration',
  entity_id: configId,
  source_ip: req.ip,
  user_agent: req.headers['user-agent'],
  details: {
    config_type: 'azure-devops',
    config_name: config.name
  }
});
```

**Configuration Activated:**

```javascript
await createAuditLog({
  action_type: 'config_activated',
  entity_type: 'configuration',
  entity_id: configId,
  source_ip: req.ip,
  user_agent: req.headers['user-agent'],
  details: {
    config_type: 'azure-devops',
    config_name: config.name
  }
});
```

## Helper Functions

### createSyncHistory(data)

Creates a new sync history record.

### updateSyncHistory(id, data)

Updates an existing sync history record.

### incrementSyncHistoryCounters(id, counters)

Atomically increments counter fields in sync_history.

### createSyncHistoryItem(data)

Creates a sync history item record.

### createAuditLog(data)

Creates an audit log entry.

## Performance Considerations

1. **Batch Inserts:** When creating multiple sync_history_items, use batch inserts for better performance.

2. **Async Logging:** Consider making audit log creation asynchronous to avoid blocking the main sync flow.

3. **Database Indexes:** Ensure all indexes are created as specified above.

4. **Connection Pooling:** Use connection pooling for database operations.

5. **Pagination:** Always implement pagination for list endpoints to handle large datasets.

## Data Retention

Consider implementing:

- Automatic archival of old sync history records (e.g., older than 1 year)
- Soft deletes for compliance
- Configurable retention policies

## Security Considerations

1. **IP Address Logging:** Log source IP addresses for security auditing.

2. **Sensitive Data:** Do NOT log sensitive information like API tokens or passwords in audit logs.

3. **Access Control:** Consider implementing role-based access control for audit logs (admin-only access).

4. **Rate Limiting:** Implement rate limiting on audit log endpoints to prevent abuse.

## Error Handling

- All database operations should be wrapped in try-catch blocks
- Log errors appropriately
- Return meaningful error messages to the frontend
- Ensure sync operations can continue even if history/audit logging fails (use try-catch with logging)
