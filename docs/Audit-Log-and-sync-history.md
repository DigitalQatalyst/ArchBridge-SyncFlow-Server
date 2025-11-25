# Audit Log and Sync History

This document explains how the audit log and sync history systems work in ArchBridge-SyncFlow, including their data models, lifecycle, API interactions, and user interface.

## Overview

The system provides two complementary tracking mechanisms:

1. **Sync History**: Detailed records of synchronization operations, tracking the progress and results of each sync from Ardoq to Azure DevOps
2. **Audit Logs**: Comprehensive activity logs that track all system events including sync operations, configuration changes, and connection tests

These systems work together to provide complete visibility into system operations, compliance tracking, and troubleshooting capabilities.

## Quick Reference: API Endpoints

### Sync History Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sync-history` | GET | List all sync history records with filters and pagination |
| `/api/sync-history/:id` | GET | Get a single sync history record by ID |
| `/api/sync-history/:id/items` | GET | Get all items for a specific sync history record |
| `/api/sync-history/stats` | GET | Get aggregate statistics for sync history |
| `/api/sync-history/diagnostics` | GET | Check database connectivity and table status |

### Audit Logs Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/audit-logs` | GET | List all audit log entries with filters and pagination |
| `/api/audit-logs/stats` | GET | Get aggregate statistics for audit logs |

**Base URL:**

- Development: `http://localhost:3000/api`
- Production: `https://your-api-domain.com/api`

All endpoints return JSON responses with a `success` boolean and either `data` (on success) or `error` (on failure).

---

## Sync History

### Purpose

Sync History provides detailed tracking of each synchronization operation, including:

- Which items were synced (epics, features, user stories)
- Success/failure status for each item
- Performance metrics (duration, success rates)
- Error messages and troubleshooting information
- Links to created Azure DevOps work items

### Data Model

#### SyncHistory Entity

The main sync history record tracks the overall sync operation:

```typescript
interface SyncHistory {
  id: string;                          // Unique identifier
  source_type: string;                 // e.g., "ardoq"
  source_config_id?: string;           // Configuration ID for source
  target_type: string;                 // e.g., "azure-devops"
  target_config_id?: string;           // Configuration ID for target
  project_name: string;                // Project being synced
  status: SyncStatus;                  // pending | in_progress | completed | failed | cancelled
  overwrite_mode: boolean;             // Whether existing items were overwritten
  total_items: number;                 // Total items to sync
  items_created: number;               // Successfully created items
  items_failed: number;                // Failed items
  epics_created: number;               // Epics successfully created
  epics_failed: number;                // Epics that failed
  features_created: number;            // Features successfully created
  features_failed: number;             // Features that failed
  user_stories_created: number;        // User stories successfully created
  user_stories_failed: number;         // User stories that failed
  deletion_count: number;              // Items deleted (in overwrite mode)
  started_at: string;                  // When sync started
  completed_at?: string;               // When sync completed
  duration_ms?: number;                // Duration in milliseconds
  error_message?: string;              // Overall error message (if failed)
  user_id?: string;                    // User who initiated sync
  created_at: string;                  // Record creation timestamp
  updated_at: string;                  // Last update timestamp
}
```

#### SyncHistoryItem Entity

Individual items processed during a sync:

```typescript
interface SyncHistoryItem {
  id: string;                          // Unique identifier
  sync_history_id: string;             // Reference to parent sync history
  ardoq_id: string;                    // Original Ardoq item ID
  item_name: string;                   // Name of the item
  item_type: ItemType;                 // epic | feature | user_story
  status: ItemStatus;                  // created | failed | skipped
  azure_devops_id?: number;            // Created Azure DevOps work item ID
  azure_devops_url?: string;           // Link to Azure DevOps work item
  error_message?: string;              // Error message if failed
  changed_by_user?: AzureDevOpsIdentityRef; // User who created/changed the work item (from System.ChangedBy)
  created_at: string;                  // When item was processed
}

interface AzureDevOpsIdentityRef {
  displayName?: string;                // User's display name (e.g., "Dennis Mwangi")
  uniqueName?: string;                 // User's unique name/email (e.g., "Dennis.Mwangi@DigitalQatalyst.com")
  id?: string;                         // User's unique ID (e.g., "9650e4c0-699e-600d-a0b5-44b1c8416e57")
  url?: string;                        // API URL for the user identity
  imageUrl?: string;                   // URL to user's avatar image
  descriptor?: string;                 // User's descriptor (e.g., "aad.OTY1MGU0YzAtNjk5ZS03MDBkLWEwYjUtNDRiMWM4NDE2ZTU3")
  _links?: {                           // Links object
    avatar?: {
      href?: string;                   // Avatar image URL
    };
  };
}
```

### Sync Lifecycle

A sync operation goes through the following stages:

1. **Pending** (`pending`)
   - Sync history record is created when sync is initiated
   - Initial metadata is stored (source, target, project, total items)
   - Audit log entry is created for `sync_started`

2. **In Progress** (`in_progress`)
   - Status is updated when sync processing begins
   - Items are processed one by one
   - For each item:
     - A `SyncHistoryItem` record is created
     - Counters are incremented (items_created, epics_created, etc.)
     - If successful: Azure DevOps ID and URL are stored
     - If failed: Error message is stored

3. **Completed** (`completed`)
   - Status is updated when all items are processed
   - `completed_at` timestamp is set
   - `duration_ms` is calculated
   - Audit log entry is created for `sync_completed`

4. **Failed** (`failed`)
   - Status is set if sync encounters a fatal error
   - `error_message` contains the failure reason
   - `completed_at` timestamp is set
   - Audit log entry is created for `sync_failed`

5. **Cancelled** (`cancelled`)
   - Status is set if sync is manually cancelled
   - Audit log entry is created for `sync_cancelled`

### API Endpoints for Frontend

All endpoints are prefixed with `/api`. Base URL examples:

- Development: `http://localhost:3000/api`
- Production: `https://your-api-domain.com/api`

#### 1. List Sync History

**Endpoint:** `GET /api/sync-history`

**Query Parameters:**

- `status` (optional): Filter by status - `pending`, `in_progress`, `completed`, `failed`, or `cancelled`
- `source_type` (optional): Filter by source type (e.g., `"ardoq"`)
- `target_type` (optional): Filter by target type (e.g., `"azure-devops"`)
- `start_date` (optional): Filter by start date in ISO 8601 format (e.g., `"2024-01-01T00:00:00Z"`)
- `end_date` (optional): Filter by end date in ISO 8601 format
- `project_name` (optional): Filter by project name (partial match, case-insensitive)
- `limit` (optional): Number of records per page (default: `50`, max: `100`)
- `offset` (optional): Pagination offset (default: `0`)

**Example Request:**

```javascript
// Get first page of completed syncs
fetch('/api/sync-history?status=completed&limit=50&offset=0')
  .then(res => res.json())
  .then(data => console.log(data));

// Get syncs for a specific project
fetch('/api/sync-history?project_name=MyProject&limit=20')
  .then(res => res.json())
  .then(data => console.log(data));
```

**Response Format:**

```typescript
{
  success: true,
  data: [
    {
      id: "uuid-string",
      source_type: "ardoq",
      source_config_id: "config-1234567890-abc123",  // Optional, may be undefined
      target_type: "azure-devops",
      target_config_id: "config-1234567890-xyz789",  // Optional, may be undefined
      project_name: "My Project",
      status: "completed",  // "pending" | "in_progress" | "completed" | "failed" | "cancelled"
      overwrite_mode: false,
      total_items: 25,
      items_created: 23,
      items_failed: 2,
      epics_created: 5,
      epics_failed: 0,
      features_created: 8,
      features_failed: 1,
      user_stories_created: 10,
      user_stories_failed: 1,
      deletion_count: 0,
      started_at: "2024-01-15T10:30:00.000Z",
      completed_at: "2024-01-15T10:35:00.000Z",
      duration_ms: 300000,
      error_message: null,  // Only present if status is "failed"
      user_id: null,  // Optional
      created_at: "2024-01-15T10:30:00.000Z",
      updated_at: "2024-01-15T10:35:00.000Z"
    }
    // ... more records
  ],
  pagination: {
    total: 150,        // Total number of records matching filters
    limit: 50,
    offset: 0,
    has_more: true    // true if offset + limit < total
  }
}
```

**Error Response:**

```typescript
{
  success: false,
  error: "Error message here"
}
```

#### 2. Get Single Sync History Record

**Endpoint:** `GET /api/sync-history/:id`

**Path Parameters:**

- `id` (required): The UUID of the sync history record

**Example Request:**

```javascript
const syncId = "123e4567-e89b-12d3-a456-426614174000";
fetch(`/api/sync-history/${syncId}`)
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      console.log('Sync details:', data.data);
    } else {
      console.error('Error:', data.error);
    }
  });
```

**Response Format:**

```typescript
{
  success: true,
  data: {
    // Same structure as individual item in list endpoint
    id: "uuid-string",
    source_type: "ardoq",
    // ... all fields from SyncHistory interface
  }
}
```

**Error Response (404 if not found):**

```typescript
{
  success: false,
  error: "Sync history not found"
}
```

#### 3. Get Sync History Items

**Endpoint:** `GET /api/sync-history/:id/items`

**Path Parameters:**

- `id` (required): The UUID of the sync history record

**Query Parameters:**

- `status` (optional): Filter by item status - `created`, `failed`, or `skipped`
- `item_type` (optional): Filter by item type - `epic`, `feature`, or `user_story`
- `limit` (optional): Number of records per page (default: `100`, max: `500`)
- `offset` (optional): Pagination offset (default: `0`)

**Example Request:**

```javascript
const syncId = "123e4567-e89b-12d3-a456-426614174000";
// Get all failed items
fetch(`/api/sync-history/${syncId}/items?status=failed`)
  .then(res => res.json())
  .then(data => console.log(data));

// Get only epics
fetch(`/api/sync-history/${syncId}/items?item_type=epic`)
  .then(res => res.json())
  .then(data => console.log(data));
```

**Response Format:**

```typescript
{
  success: true,
  data: [
    {
      id: "uuid-string",
      sync_history_id: "123e4567-e89b-12d3-a456-426614174000",
      ardoq_id: "ardoq-item-id-123",
      item_name: "Epic Name",
      item_type: "epic",  // "epic" | "feature" | "user_story"
      status: "created",  // "created" | "failed" | "skipped"
      azure_devops_id: 12345,  // Optional, only if status is "created"
      azure_devops_url: "https://dev.azure.com/org/project/_workitems/edit/12345",  // Optional
      error_message: null,  // Only present if status is "failed"
      changed_by_user: {  // Optional, only if status is "created" - User who created the work item
        displayName: "Dennis Mwangi",
        uniqueName: "Dennis.Mwangi@DigitalQatalyst.com",
        id: "9650e4c0-699e-600d-a0b5-44b1c8416e57",
        url: "https://spsproduks1.vssps.visualstudio.com/Aa8aa44bb-4093-4af0-bf43-6acf509a2285/_apis/Identities/9650e4c0-699e-600d-a0b5-44b1c8416e57",
        imageUrl: "https://dev.azure.com/DigitalQatalyst/_apis/GraphProfile/MemberAvatars/aad.OTY1MGU0YzAtNjk5ZS03MDBkLWEwYjUtNDRiMWM4NDE2ZTU3",
        descriptor: "aad.OTY1MGU0YzAtNjk5ZS03MDBkLWEwYjUtNDRiMWM4NDE2ZTU3",
        _links: {
          avatar: {
            href: "https://dev.azure.com/DigitalQatalyst/_apis/GraphProfile/MemberAvatars/aad.OTY1MGU0YzAtNjk5ZS03MDBkLWEwYjUtNDRiMWM4NDE2ZTU3"
          }
        }
      },
      created_at: "2024-01-15T10:30:15.000Z"
    }
    // ... more items
  ],
  pagination: {
    total: 25,
    limit: 100,
    offset: 0,
    has_more: false
  }
}
```

#### 4. Get Sync History Statistics

**Endpoint:** `GET /api/sync-history/stats`

**Query Parameters:**

- `start_date` (optional): Start date filter in ISO 8601 format
- `end_date` (optional): End date filter in ISO 8601 format

**Example Request:**

```javascript
// Get all-time stats
fetch('/api/sync-history/stats')
  .then(res => res.json())
  .then(data => console.log(data));

// Get stats for a date range
const startDate = new Date('2024-01-01').toISOString();
const endDate = new Date('2024-01-31').toISOString();
fetch(`/api/sync-history/stats?start_date=${startDate}&end_date=${endDate}`)
  .then(res => res.json())
  .then(data => console.log(data));
```

**Response Format:**

```typescript
{
  success: true,
  data: {
    total_syncs: 150,
    completed_syncs: 120,
    failed_syncs: 25,
    cancelled_syncs: 5,
    success_rate: 80.0,  // Percentage (0-100)
    average_duration_ms: 245000,  // Average duration in milliseconds
    total_items_created: 2500,
    total_items_failed: 150
  }
}
```

### Frontend Implementation Guide

#### Example API Client Functions

Here are example functions you can use in your frontend to fetch data:

```typescript
// API Client for Sync History
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

interface SyncHistoryFilters {
  status?: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  source_type?: string;
  target_type?: string;
  start_date?: string;
  end_date?: string;
  project_name?: string;
  limit?: number;
  offset?: number;
}

interface SyncHistoryItemsFilters {
  status?: 'created' | 'failed' | 'skipped';
  item_type?: 'epic' | 'feature' | 'user_story';
  limit?: number;
  offset?: number;
}

// List sync history with filters
export async function getSyncHistory(filters: SyncHistoryFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });
  
  const response = await fetch(`${API_BASE_URL}/sync-history?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch sync history: ${response.statusText}`);
  }
  return response.json();
}

// Get single sync history record
export async function getSyncHistoryById(id: string) {
  const response = await fetch(`${API_BASE_URL}/sync-history/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch sync history: ${response.statusText}`);
  }
  return response.json();
}

// Get sync history items
export async function getSyncHistoryItems(id: string, filters: SyncHistoryItemsFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });
  
  const response = await fetch(`${API_BASE_URL}/sync-history/${id}/items?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch sync history items: ${response.statusText}`);
  }
  return response.json();
}

// Get sync history statistics
export async function getSyncHistoryStats(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  
  const response = await fetch(`${API_BASE_URL}/sync-history/stats?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch sync history stats: ${response.statusText}`);
  }
  return response.json();
}

// List audit logs with filters
interface AuditLogFilters {
  action_type?: string;
  entity_type?: string;
  entity_id?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export async function getAuditLogs(filters: AuditLogFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });
  
  const response = await fetch(`${API_BASE_URL}/audit-logs?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch audit logs: ${response.statusText}`);
  }
  return response.json();
}

// Get audit log statistics
export async function getAuditLogStats(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  
  const response = await fetch(`${API_BASE_URL}/audit-logs/stats?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch audit log stats: ${response.statusText}`);
  }
  return response.json();
}
```

#### React Query Hooks Example

If you're using React Query, here are example hooks:

```typescript
import { useQuery } from '@tanstack/react-query';
import { getSyncHistory, getSyncHistoryById, getSyncHistoryItems, getSyncHistoryStats } from './api';

// List sync history with filters
export function useSyncHistoryList(filters: SyncHistoryFilters = {}) {
  return useQuery({
    queryKey: ['syncHistory', 'list', filters],
    queryFn: () => getSyncHistory(filters),
  });
}

// Get single sync history record
export function useSyncHistory(id: string) {
  return useQuery({
    queryKey: ['syncHistory', id],
    queryFn: () => getSyncHistoryById(id),
    enabled: !!id,
  });
}

// Get items for a sync history record
export function useSyncHistoryItems(id: string, filters: SyncHistoryItemsFilters = {}) {
  return useQuery({
    queryKey: ['syncHistory', id, 'items', filters],
    queryFn: () => getSyncHistoryItems(id, filters),
    enabled: !!id,
  });
}

// Get statistics
export function useSyncHistoryStats(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['syncHistory', 'stats', startDate, endDate],
    queryFn: () => getSyncHistoryStats(startDate, endDate),
  });
}

// List audit logs
export function useAuditLogsList(filters: AuditLogFilters = {}) {
  return useQuery({
    queryKey: ['auditLogs', 'list', filters],
    queryFn: () => getAuditLogs(filters),
  });
}

// Get audit log statistics
export function useAuditLogStats(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['auditLogs', 'stats', startDate, endDate],
    queryFn: () => getAuditLogStats(startDate, endDate),
  });
}
```

#### UI Components

1. **SyncHistory Page** (`/sync-history`)
   - Displays list of all sync operations
   - Shows statistics dashboard
   - Provides filtering and pagination
   - Links to detailed view

2. **SyncHistoryDetail Page** (`/sync-history/:id`)
   - Shows complete sync operation details
   - Displays summary metrics
   - Breakdown by item type (epics, features, user stories)
   - Lists all individual items with status
   - Shows timing information
   - Provides links to Azure DevOps work items

3. **SyncHistoryTable Component**
   - Displays sync history in tabular format
   - Shows status badges, project names, item counts
   - Includes duration and success rate
   - Provides "View" button to navigate to details

4. **SyncHistoryStats Component**
   - Displays aggregate statistics
   - Shows total syncs, success rate, average duration
   - Provides visual metrics

---

## Audit Logs

### Purpose

Audit Logs provide comprehensive activity tracking for:

- Compliance and security auditing
- Troubleshooting system issues
- Tracking configuration changes
- Monitoring user activities
- System event history

### Data Model

#### AuditLog Entity

```typescript
interface AuditLog {
  id: string;                          // Unique identifier
  action_type: ActionType;             // Type of action performed
  entity_type: string;                 // Type of entity affected (sync, configuration, etc.)
  entity_id?: string;                  // ID of the affected entity
  user_id?: string;                    // User who performed the action
  source_ip?: string;                  // IP address of the request
  user_agent?: string;                 // User agent string
  details?: Record<string, any>;       // Additional context (JSON)
  created_at: string;                  // When the action occurred
}
```

#### Action Types

The system tracks the following action types:

- **Sync Operations**:
  - `sync_started`: Sync operation initiated
  - `sync_completed`: Sync operation completed successfully
  - `sync_failed`: Sync operation failed
  - `sync_cancelled`: Sync operation was cancelled

- **Configuration Management**:
  - `config_created`: New configuration created
  - `config_updated`: Configuration updated
  - `config_deleted`: Configuration deleted
  - `config_activated`: Configuration activated

- **Connection Testing**:
  - `connection_tested`: Connection test performed

### Audit Log Lifecycle

Audit logs are created automatically when specific events occur:

1. **Sync Events**:
   - Created when sync status changes (started, completed, failed, cancelled)
   - Includes sync metadata in `details` field
   - Links to sync history via `entity_id`

2. **Configuration Events**:
   - Created when configurations are created, updated, deleted, or activated
   - Includes configuration type and name in `details`
   - Links to configuration via `entity_id`

3. **Connection Test Events**:
   - Created when connection tests are performed
   - Includes test results in `details`

### API Endpoints for Frontend

All endpoints are prefixed with `/api`. Base URL examples:

- Development: `http://localhost:3000/api`
- Production: `https://your-api-domain.com/api`

#### 1. List Audit Logs

**Endpoint:** `GET /api/audit-logs`

**Query Parameters:**

- `action_type` (optional): Filter by action type - `sync_started`, `sync_completed`, `sync_failed`, `sync_cancelled`, `config_created`, `config_updated`, `config_deleted`, `config_activated`, or `connection_tested`
- `entity_type` (optional): Filter by entity type (e.g., `"sync"`, `"configuration"`)
- `entity_id` (optional): Filter by specific entity ID (e.g., sync history ID)
- `start_date` (optional): Filter by start date in ISO 8601 format (e.g., `"2024-01-01T00:00:00Z"`)
- `end_date` (optional): Filter by end date in ISO 8601 format
- `limit` (optional): Number of records per page (default: `50`, max: `100`)
- `offset` (optional): Pagination offset (default: `0`)

**Example Request:**

```javascript
// Get all audit logs
fetch('/api/audit-logs?limit=50&offset=0')
  .then(res => res.json())
  .then(data => console.log(data));

// Get only sync-related events
fetch('/api/audit-logs?entity_type=sync&limit=100')
  .then(res => res.json())
  .then(data => console.log(data));

// Get events for a specific sync
const syncId = "123e4567-e89b-12d3-a456-426614174000";
fetch(`/api/audit-logs?entity_type=sync&entity_id=${syncId}`)
  .then(res => res.json())
  .then(data => console.log(data));

// Get failed syncs only
fetch('/api/audit-logs?action_type=sync_failed')
  .then(res => res.json())
  .then(data => console.log(data));
```

**Response Format:**

```typescript
{
  success: true,
  data: [
    {
      id: "uuid-string",
      action_type: "sync_started",  // See Action Types below
      entity_type: "sync",
      entity_id: "123e4567-e89b-12d3-a456-426614174000",  // Optional, may be undefined
      user_id: null,  // Optional, may be undefined
      source_ip: "192.168.1.1",  // Optional, may be undefined
      user_agent: "Mozilla/5.0...",  // Optional, may be undefined
      details: {  // Optional, JSON object with additional context
        source_type: "ardoq",
        target_type: "azure-devops",
        project_name: "My Project",
        overwrite_mode: false,
        total_items: 25
      },
      created_at: "2024-01-15T10:30:00.000Z"
    }
    // ... more records
  ],
  pagination: {
    total: 500,
    limit: 50,
    offset: 0,
    has_more: true
  }
}
```

**Action Types:**

- `sync_started` - Sync operation initiated
- `sync_completed` - Sync operation completed successfully
- `sync_failed` - Sync operation failed
- `sync_cancelled` - Sync operation was cancelled
- `config_created` - New configuration created
- `config_updated` - Configuration updated
- `config_deleted` - Configuration deleted
- `config_activated` - Configuration activated
- `connection_tested` - Connection test performed

**Error Response:**

```typescript
{
  success: false,
  error: "Error message here"
}
```

#### 2. Get Audit Log Statistics

**Endpoint:** `GET /api/audit-logs/stats`

**Query Parameters:**

- `start_date` (optional): Start date filter in ISO 8601 format
- `end_date` (optional): End date filter in ISO 8601 format

**Example Request:**

```javascript
// Get all-time stats
fetch('/api/audit-logs/stats')
  .then(res => res.json())
  .then(data => console.log(data));

// Get stats for a date range
const startDate = new Date('2024-01-01').toISOString();
const endDate = new Date('2024-01-31').toISOString();
fetch(`/api/audit-logs/stats?start_date=${startDate}&end_date=${endDate}`)
  .then(res => res.json())
  .then(data => console.log(data));
```

**Response Format:**

```typescript
{
  success: true,
  data: {
    total_events: 1000,
    events_today: 25,  // Events created today (since midnight UTC)
    action_type_counts: {
      "sync_started": 150,
      "sync_completed": 120,
      "sync_failed": 25,
      "sync_cancelled": 5,
      "config_created": 10,
      "config_updated": 8,
      "config_deleted": 2,
      "config_activated": 5,
      "connection_tested": 50
    }
  }
}
```

### Frontend Implementation

#### React Hooks

```typescript
// List audit logs with filters
useAuditLogsList(filters?: AuditLogFilters)

// Get statistics
useAuditLogStats(startDate?: string, endDate?: string)
```

#### UI Components

1. **AuditLogs Page** (`/audit-logs`)
   - Displays list of all audit log entries
   - Shows statistics dashboard
   - Provides filtering and pagination
   - Expandable rows for details

2. **AuditLogTable Component**
   - Displays audit logs in tabular format
   - Shows action type badges, timestamps, entity information
   - Expandable rows to view JSON details
   - Detail dialog for complete information
   - Shows IP addresses and user agents

3. **AuditLogStats Component**
   - Displays aggregate statistics
   - Shows total events, events today
   - Breakdown by action type

---

## Relationship Between Sync History and Audit Logs

### How They Work Together

1. **Sync Initiation**:
   - Sync history record is created with status `pending`
   - Audit log entry is created with `action_type: 'sync_started'`
   - Audit log `entity_id` references the sync history `id`

2. **During Sync**:
   - Sync history status is updated to `in_progress`
   - Individual items are tracked in `sync_history_items`
   - Counters are updated in real-time

3. **Sync Completion**:
   - Sync history status is updated to `completed` or `failed`
   - Final metrics are calculated and stored
   - Audit log entry is created with `action_type: 'sync_completed'` or `'sync_failed'`

### Use Cases

- **Sync History**: Use when you need detailed information about what was synced, which items succeeded/failed, and links to created work items
- **Audit Logs**: Use when you need to track all system activities, compliance auditing, or understand the sequence of events across the system

---

## Backend Implementation Requirements

For backend implementation details, refer to:

- `docs/Backend-Sync-History-Setup.md` - Complete database schema and API specifications
- `docs/Backend-Sync-History-Implementation-Checklist.md` - Step-by-step implementation guide

### Key Backend Responsibilities

1. **Sync History**:
   - Create sync history record when sync starts
   - Update status and counters during sync
   - Create sync history items for each processed item
   - Calculate final metrics on completion

2. **Audit Logs**:
   - Create audit log entries for all tracked events
   - Include request metadata (IP, user agent)
   - Store relevant context in `details` field
   - Link to related entities via `entity_id`

3. **Performance Considerations**:
   - Use batch inserts for sync history items
   - Consider async logging for audit logs
   - Implement proper database indexes
   - Use connection pooling

---

## Frontend Architecture

### File Structure

```
src/
├── types/
│   └── sync-history.ts          # TypeScript type definitions
├── lib/
│   └── api/
│       └── sync-history.ts      # API client functions
├── hooks/
│   └── useSyncHistory.ts        # React Query hooks
├── pages/
│   ├── SyncHistory.tsx          # Main sync history page
│   ├── SyncHistoryDetail.tsx    # Detailed sync view
│   └── AuditLogs.tsx            # Main audit logs page
└── components/
    ├── sync-history/
    │   ├── SyncHistoryTable.tsx
    │   ├── SyncHistoryFilters.tsx
    │   └── SyncHistoryStats.tsx
    └── audit-logs/
        ├── AuditLogTable.tsx
        ├── AuditLogFilters.tsx
        └── AuditLogStats.tsx
```

### Data Flow

1. **User Interaction** → Component triggers hook
2. **React Query Hook** → Calls API client function
3. **API Client** → Makes HTTP request to backend
4. **Backend** → Returns data with pagination
5. **API Client** → Transforms response
6. **React Query** → Caches and returns data
7. **Component** → Renders UI with data

### State Management

- **React Query** handles server state (caching, refetching, loading states)
- **React State** handles UI state (filters, pagination, expanded rows)
- **URL Parameters** can be used for shareable filter states

---

## Best Practices

### For Developers

1. **Always create audit logs** for tracked events
2. **Link audit logs to entities** via `entity_id` for traceability
3. **Include relevant context** in audit log `details` field
4. **Use batch operations** when creating multiple sync history items
5. **Handle errors gracefully** and log them appropriately

### For Users

1. **Check sync history** to see what was synced and troubleshoot failures
2. **Review audit logs** for compliance and security auditing
3. **Use filters** to find specific syncs or events
4. **View details** to see individual item status and error messages
5. **Monitor statistics** to track system health and performance

---

## Future Enhancements

Potential improvements to consider:

1. **Real-time Updates**: WebSocket support for live sync progress
2. **Export Functionality**: Export sync history and audit logs to CSV/JSON
3. **Advanced Filtering**: More granular filter options
4. **Search**: Full-text search across sync history and audit logs
5. **Retention Policies**: Automatic archival of old records
6. **Alerts**: Notifications for failed syncs or critical events
7. **Analytics Dashboard**: Visual charts and trends
8. **Bulk Operations**: Bulk retry failed items
