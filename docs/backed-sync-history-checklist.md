# Backend Sync History Implementation Checklist

## Problem

Sync history is not being stored after sync completion. The sync history API returns empty data because the backend is not creating sync history records.

## Solution

The backend needs to implement sync history tracking in the sync endpoint (`POST /api/azure-devops/projects/:project/workitems`). This document provides a step-by-step checklist for implementation.

## Implementation Checklist

### 1. Database Setup ✅ (Documented)

- [ ] Create `sync_history` table
- [ ] Create `sync_history_items` table  
- [ ] Create `audit_logs` table
- [ ] Create all required indexes
- [ ] Run database migrations

**Reference:** See `docs/Backend-Sync-History-Setup.md` sections 1.1-1.3 for complete SQL schema.

### 2. Sync Endpoint Integration

#### 2.1 Before Sync Starts

- [ ] Create `sync_history` record with status `'pending'`
  - Extract `source_config_id` from request (Ardoq config)
  - Extract `target_config_id` from query params (`configId`)
  - Extract `project_name` from path parameter
  - Set `overwrite_mode` from query param (`overwrite=true`)
  - Calculate `total_items` from request body (count all epics, features, user stories)
  - Set `started_at` to current timestamp
  - Store `sync_history_id` for later updates

- [ ] Create audit log entry for `'sync_started'`
  - `action_type`: `'sync_started'`
  - `entity_type`: `'sync'`
  - `entity_id`: `sync_history_id`
  - `source_ip`: Extract from request headers
  - `user_agent`: Extract from request headers
  - `details`: JSON with source_type, target_type, project_name, overwrite_mode

**Code Location:** At the start of the sync endpoint handler, before processing any items.

#### 2.2 Update Status to In Progress

- [ ] Update `sync_history` record status to `'in_progress'`
  - Update happens right before starting to process items

**Code Location:** After creating the sync_history record, before the main sync loop.

#### 2.3 During Sync - Track Each Item

For each work item processed (epic, feature, user story):

- [ ] Create `sync_history_items` record when item is created/failed
  - `sync_history_id`: The ID from step 2.1
  - `ardoq_id`: From the item's `_id` field
  - `item_name`: From the item's `name` field
  - `item_type`: Map from Ardoq type ('Epic' → 'epic', 'Feature' → 'feature', 'User Story' → 'user_story')
  - `status`: 'created' or 'failed'
  - `azure_devops_id`: Work item ID if created successfully
  - `azure_devops_url`: URL to the work item if created successfully
  - `error_message`: Error message if failed

- [ ] Update `sync_history` counters atomically
  - Increment `items_created` if successful
  - Increment `items_failed` if failed
  - Increment type-specific counters (`epics_created`, `epics_failed`, etc.)

**Code Location:** In the event handlers where you emit SSE events (`epic:created`, `feature:created`, etc.)

#### 2.4 On Sync Completion

- [ ] Update `sync_history` record
  - Set `status` to `'completed'`
  - Set `completed_at` to current timestamp
  - Calculate `duration_ms` = `completed_at - started_at`
  - Update all counters (should already be updated, but verify)

- [ ] Create audit log entry for `'sync_completed'`
  - `action_type`: `'sync_completed'`
  - `entity_type`: `'sync'`
  - `entity_id`: `sync_history_id`
  - `source_ip`: From request headers
  - `user_agent`: From request headers
  - `details`: JSON with summary (total_items, items_created, items_failed)

**Code Location:** When emitting the `sync:complete` SSE event.

#### 2.5 On Sync Failure

- [ ] Update `sync_history` record
  - Set `status` to `'failed'`
  - Set `completed_at` to current timestamp
  - Set `error_message` to the error message
  - Calculate `duration_ms`

- [ ] Create audit log entry for `'sync_failed'`
  - `action_type`: `'sync_failed'`
  - `entity_type`: `'sync'`
  - `entity_id`: `sync_history_id`
  - `source_ip`: From request headers
  - `user_agent`: From request headers
  - `details`: JSON with error message

**Code Location:** When emitting the `sync:error` SSE event or catching exceptions.

#### 2.6 On Sync Cancellation (if supported)

- [ ] Update `sync_history` record
  - Set `status` to `'cancelled'`
  - Set `completed_at` to current timestamp
  - Calculate `duration_ms`

- [ ] Create audit log entry for `'sync_cancelled'`
  - Similar structure to sync_failed

**Code Location:** If cancellation is implemented.

#### 2.7 Overwrite Mode - Track Deletions

If `overwrite=true`:

- [ ] Update `deletion_count` in `sync_history`
  - Increment when items are deleted
  - This should happen during the deletion phase (before sync starts)

**Code Location:** In the overwrite deletion logic, after each chunk is deleted.

### 3. Helper Functions to Create

Create these helper functions in your backend codebase:

```javascript
// Create sync history record
async function createSyncHistory(data) {
  // Insert into sync_history table
  // Return the created record with ID
}

// Update sync history record
async function updateSyncHistory(id, updates) {
  // Update sync_history table
  // Update updated_at timestamp
}

// Atomically increment counters
async function incrementSyncHistoryCounters(id, counters) {
  // Use SQL UPDATE with += to atomically increment
  // Example: UPDATE sync_history SET items_created = items_created + 1 WHERE id = ?
}

// Create sync history item
async function createSyncHistoryItem(data) {
  // Insert into sync_history_items table
}

// Create audit log entry
async function createAuditLog(data) {
  // Insert into audit_logs table
  // Consider making this async/non-blocking to avoid slowing down sync
}
```

### 4. Error Handling

- [ ] Wrap sync history operations in try-catch
- [ ] Ensure sync can continue even if history logging fails
- [ ] Log errors to application logs (don't fail the sync)
- [ ] Consider making audit log creation asynchronous

**Important:** Sync history tracking should never cause a sync to fail. If history logging fails, log the error but continue with the sync.

### 5. Testing

- [ ] Test sync with sync history tracking enabled
- [ ] Verify sync_history record is created
- [ ] Verify sync_history_items are created for each item
- [ ] Verify counters are updated correctly
- [ ] Verify audit logs are created
- [ ] Test error scenarios (sync failure, cancellation)
- [ ] Test overwrite mode with deletion tracking
- [ ] Verify pagination and filtering work correctly

### 6. Performance Considerations

- [ ] Use batch inserts for sync_history_items if processing many items
- [ ] Consider making audit log creation asynchronous
- [ ] Use database transactions where appropriate
- [ ] Index database tables properly (already documented in setup doc)

## Current State

**Frontend:** ✅ Complete

- All UI components are implemented
- API client is ready
- Hooks are ready
- Pages are ready

**Backend:** ❌ Not Implemented

- Database tables need to be created
- Sync endpoint needs integration
- Helper functions need to be created
- API endpoints for sync history need to be implemented

## Next Steps

1. **Backend Team:** Follow this checklist to implement sync history tracking
2. **Database Admin:** Run the migrations from `docs/Backend-Sync-History-Setup.md`
3. **Backend Developer:** Integrate sync history tracking into the sync endpoint
4. **QA:** Test sync history tracking end-to-end

## Reference Documents

- `docs/Backend-Sync-History-Setup.md` - Complete database schema and API specifications
- `docs/Azure-devops-API-Documentation.md` - Current sync endpoint documentation
- `docs/syncing-progress.md` - SSE event structure documentation

## Questions?

If you need clarification on any step, refer to the detailed documentation in `docs/Backend-Sync-History-Setup.md` section 2 (Integration Points).
