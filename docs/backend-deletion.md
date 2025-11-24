# Backend Deletion Chunking Requirements

## Overview

The Azure DevOps work items deletion process needs to be updated to delete items in chunks of 20 to avoid exceeding the API threshold of 200 items. This document outlines the required backend changes.

## Current Issue

When deleting work items in overwrite mode, the backend attempts to delete all items at once, which fails when there are more than 200 items with the error:

```
"The parameter Ids exceeded the threshold 200 of work items to delete."
```

## Required Changes

### 1. Chunked Deletion Implementation

The deletion logic should be updated to:

- Delete work items in chunks of 20 items at a time
- Process chunks sequentially (wait for each chunk to complete before starting the next)
- Only start syncing new work items after all deletions are complete

### 2. New SSE Events

The following events need to be emitted during the deletion process:

#### `overwrite:started`

Emitted when overwrite mode is enabled and deletion is about to start.

```json
{
  "type": "overwrite:started",
  "data": {
    "message": "Overwrite mode enabled. Checking for existing work items...",
    "timestamp": "2024-01-15T10:29:50Z"
  }
}
```

#### `overwrite:deleting`

Emitted when work items are found and deletion is about to begin. This should include the total count.

```json
{
  "type": "overwrite:deleting",
  "data": {
    "message": "Found 252 existing work items. Deleting in chunks of 20...",
    "count": 252,
    "timestamp": "2024-01-15T10:29:51Z"
  }
}
```

#### `overwrite:progress` (NEW)

Emitted after each chunk is deleted to show progress. This should be sent after each chunk of 20 items is successfully deleted.

```json
{
  "type": "overwrite:progress",
  "data": {
    "message": "Deleted chunk 1 of 13 (20 items)",
    "deleted": 20,
    "total": 252,
    "currentChunk": 1,
    "totalChunks": 13,
    "timestamp": "2024-01-15T10:29:52Z"
  }
}
```

**Important:** This event should be emitted after each chunk is successfully deleted, not before.

#### `overwrite:deleted`

Emitted when all work items have been successfully deleted.

```json
{
  "type": "overwrite:deleted",
  "data": {
    "message": "Successfully deleted 252 existing work items",
    "count": 252,
    "timestamp": "2024-01-15T10:29:55Z"
  }
}
```

#### `overwrite:no-items`

Emitted when no existing work items are found.

```json
{
  "type": "overwrite:no-items",
  "data": {
    "message": "No existing work items found. Proceeding with creation.",
    "timestamp": "2024-01-15T10:29:50Z"
  }
}
```

#### `overwrite:error`

Emitted if the deletion process fails.

```json
{
  "type": "overwrite:error",
  "data": {
    "error": "Failed to delete work items: [error message]",
    "message": "Overwrite operation failed. Aborting work item creation.",
    "timestamp": "2024-01-15T10:29:58Z"
  }
}
```

### 3. Implementation Pseudocode

```javascript
async function deleteWorkItemsInChunks(workItemIds, sendEvent) {
  const CHUNK_SIZE = 20;
  const total = workItemIds.length;
  const totalChunks = Math.ceil(total / CHUNK_SIZE);
  let deleted = 0;

  // Emit started event
  sendEvent('overwrite:started', {
    message: 'Overwrite mode enabled. Checking for existing work items...',
    timestamp: new Date().toISOString()
  });

  if (total === 0) {
    sendEvent('overwrite:no-items', {
      message: 'No existing work items found. Proceeding with creation.',
      timestamp: new Date().toISOString()
    });
    return;
  }

  // Emit deleting event with total count
  sendEvent('overwrite:deleting', {
    message: `Found ${total} existing work items. Deleting in chunks of ${CHUNK_SIZE}...`,
    count: total,
    timestamp: new Date().toISOString()
  });

  // Process in chunks
  for (let i = 0; i < workItemIds.length; i += CHUNK_SIZE) {
    const chunk = workItemIds.slice(i, i + CHUNK_SIZE);
    const currentChunk = Math.floor(i / CHUNK_SIZE) + 1;

    try {
      // Delete this chunk
      await deleteWorkItemsChunk(chunk);
      
      deleted += chunk.length;

      // Emit progress event after successful deletion
      sendEvent('overwrite:progress', {
        message: `Deleted chunk ${currentChunk} of ${totalChunks} (${chunk.length} items)`,
        deleted: deleted,
        total: total,
        currentChunk: currentChunk,
        totalChunks: totalChunks,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      // Emit error and abort
      sendEvent('overwrite:error', {
        error: error.message,
        message: 'Overwrite operation failed. Aborting work item creation.',
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  // Emit completion event
  sendEvent('overwrite:deleted', {
    message: `Successfully deleted ${total} existing work items`,
    count: total,
    timestamp: new Date().toISOString()
  });
}
```

### 4. Flow Control

**Important:** The sync process should only start creating new work items after:

1. All deletion chunks have been successfully processed
2. The `overwrite:deleted` event has been emitted

If an `overwrite:error` event is emitted, the entire sync process should be aborted and no new work items should be created.

### 5. Error Handling

- If a chunk deletion fails, emit `overwrite:error` and abort the entire process
- Do not attempt to continue with remaining chunks if one fails
- Ensure the error message is descriptive and includes the underlying error

### 6. Testing Considerations

Test with:

- 0 work items (should emit `overwrite:no-items`)
- 1-19 work items (1 chunk)
- 20 work items (exactly 1 chunk)
- 21-40 work items (2 chunks)
- 200+ work items (multiple chunks, previously failing case)
- Error scenarios (API failure during chunk deletion)

## Frontend Changes

The frontend has been updated to:

- Display deletion progress with a progress bar
- Show current chunk and total chunks
- Display deletion status separately from sync status
- Handle all new event types

No additional frontend changes are needed once the backend is updated.
