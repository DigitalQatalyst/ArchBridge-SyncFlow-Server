# Syncing Progress Documentation

This document explains how the work items syncing process works between Ardoq and Azure DevOps, including the streaming progress mechanism for real-time updates in the frontend.

## Overview

The syncing process transfers hierarchical work item data from Ardoq to Azure DevOps, creating Epics, Features, and User Stories with proper parent-child relationships. The process uses Server-Sent Events (SSE) to stream real-time progress updates to the frontend, allowing users to see the creation status of each item as it happens.

## Syncing Flow

### Data Source: Ardoq Hierarchy

The sync process starts with a hierarchical structure from Ardoq:

```
Initiative
  └── Epic
      └── Feature
          └── User Story
```

### Target: Azure DevOps Work Items

The Ardoq hierarchy is mapped to Azure DevOps work items:

- **Ardoq Epic** → **Azure DevOps Epic** (`$Epic`)
- **Ardoq Feature** → **Azure DevOps Feature** (`$Feature`)
- **Ardoq User Story** → **Azure DevOps User Story** (`$User Story`)

### Sequential Creation Order

Items are created in a specific order to maintain parent-child relationships:

1. **Create Epic** - The epic is created first
2. **For each Feature under the Epic:**
   - Create Feature (linked to the Epic as parent)
   - **For each User Story under the Feature:**
     - Create User Story (linked to the Feature as parent)
3. **Move to the next Feature** - Repeat step 2
4. **Move to the next Epic** - Repeat steps 1-3

This ensures that:
- Epics exist before their Features
- Features exist before their User Stories
- Parent-child relationships are established correctly

## Progress Streaming Mechanism

### Technology: Server-Sent Events (SSE)

The syncing endpoint uses Server-Sent Events (SSE) to stream progress updates in real-time. SSE is a web standard that allows a server to push data to a client over a single HTTP connection.

**Endpoint:** `POST /api/azure-devops/projects/:project/workitems?configId=xxx`

**Response Type:** `text/event-stream`

**Connection:** Long-lived HTTP connection that streams progress events as items are created

### Request Format

**Path Parameters:**
- `project` - Azure DevOps project ID or project name

**Query Parameters:**
- `configId` (optional) - Use a specific saved configuration. If omitted, uses the active configuration.

**Request Body:**
```json
{
  "epics": [
    {
      "_id": "epic-123",
      "name": "Epic Name",
      "type": "Epic",
      "description": "Epic description",
      "children": [
        {
          "_id": "feature-456",
          "name": "Feature Name",
          "type": "Feature",
          "description": "Feature description",
          "children": [
            {
              "_id": "userstory-789",
              "name": "User Story Name",
              "type": "User Story",
              "description": "User story description"
            }
          ]
        }
      ]
    }
  ]
}
```

## Event Types

The SSE stream emits different event types as items are created:

### Success Events

- **`epic:created`** - Emitted when an epic is successfully created
- **`feature:created`** - Emitted when a feature is successfully created
- **`userstory:created`** - Emitted when a user story is successfully created

### Failure Events

- **`epic:failed`** - Emitted when epic creation fails
- **`feature:failed`** - Emitted when feature creation fails
- **`userstory:failed`** - Emitted when user story creation fails

### Completion Events

- **`sync:complete`** - Emitted when all items have been processed (successfully or with failures)
- **`sync:error`** - Emitted when a critical error occurs that stops the sync process

## Event Data Structure

Each SSE event contains JSON data with the following structure:

### Success Event Data

```json
{
  "type": "epic:created",
  "data": {
    "ardoqId": "epic-123",
    "name": "Epic Name",
    "azureDevOpsId": 12345,
    "azureDevOpsUrl": "https://dev.azure.com/myorg/myproject/_workitems/edit/12345",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

**Fields:**
- `type` - The event type (e.g., "epic:created")
- `data.ardoqId` - The original Ardoq component ID
- `data.name` - The work item name/title
- `data.azureDevOpsId` - The Azure DevOps work item ID (only present on success)
- `data.azureDevOpsUrl` - Direct link to the work item in Azure DevOps (only present on success)
- `data.timestamp` - ISO 8601 timestamp of when the item was created

### Failure Event Data

```json
{
  "type": "epic:failed",
  "data": {
    "ardoqId": "epic-123",
    "name": "Epic Name",
    "error": "Failed to create work item: Invalid field value",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

**Fields:**
- `type` - The event type (e.g., "epic:failed")
- `data.ardoqId` - The original Ardoq component ID
- `data.name` - The work item name/title
- `data.error` - Error message describing why creation failed
- `data.timestamp` - ISO 8601 timestamp of when the error occurred

### Completion Event Data

```json
{
  "type": "sync:complete",
  "data": {
    "summary": {
      "total": 10,
      "created": 8,
      "failed": 2,
      "epics": { "total": 2, "created": 2, "failed": 0 },
      "features": { "total": 3, "created": 3, "failed": 0 },
      "userStories": { "total": 5, "created": 3, "failed": 2 }
    },
    "timestamp": "2024-01-15T10:35:00Z"
  }
}
```

## Frontend Integration

### JavaScript/TypeScript Example

Here's how to consume the SSE stream in your frontend application:

```typescript
async function syncWorkItems(projectId: string, epics: any[], configId?: string) {
  const url = `/api/azure-devops/projects/${projectId}/workitems${configId ? `?configId=${configId}` : ''}`;
  
  const eventSource = new EventSource(url, {
    method: 'POST',
    body: JSON.stringify({ epics }),
    headers: {
      'Content-Type': 'application/json'
    }
  });

  // Handle epic creation
  eventSource.addEventListener('epic:created', (event) => {
    const data = JSON.parse(event.data);
    console.log(`Epic created: ${data.name} (Azure DevOps ID: ${data.azureDevOpsId})`);
    updateUI('epic', data, 'success');
  });

  // Handle feature creation
  eventSource.addEventListener('feature:created', (event) => {
    const data = JSON.parse(event.data);
    console.log(`Feature created: ${data.name} (Azure DevOps ID: ${data.azureDevOpsId})`);
    updateUI('feature', data, 'success');
  });

  // Handle user story creation
  eventSource.addEventListener('userstory:created', (event) => {
    const data = JSON.parse(event.data);
    console.log(`User Story created: ${data.name} (Azure DevOps ID: ${data.azureDevOpsId})`);
    updateUI('userstory', data, 'success');
  });

  // Handle failures
  eventSource.addEventListener('epic:failed', (event) => {
    const data = JSON.parse(event.data);
    console.error(`Epic failed: ${data.name} - ${data.error}`);
    updateUI('epic', data, 'error');
  });

  eventSource.addEventListener('feature:failed', (event) => {
    const data = JSON.parse(event.data);
    console.error(`Feature failed: ${data.name} - ${data.error}`);
    updateUI('feature', data, 'error');
  });

  eventSource.addEventListener('userstory:failed', (event) => {
    const data = JSON.parse(event.data);
    console.error(`User Story failed: ${data.name} - ${data.error}`);
    updateUI('userstory', data, 'error');
  });

  // Handle completion
  eventSource.addEventListener('sync:complete', (event) => {
    const data = JSON.parse(event.data);
    console.log('Sync completed:', data.summary);
    eventSource.close();
    showCompletionSummary(data.summary);
  });

  // Handle critical errors
  eventSource.addEventListener('sync:error', (event) => {
    const data = JSON.parse(event.data);
    console.error('Sync error:', data.error);
    eventSource.close();
    showError(data.error);
  });

  // Handle connection errors
  eventSource.onerror = (error) => {
    console.error('SSE connection error:', error);
    eventSource.close();
    showError('Connection lost. Please try again.');
  };
}
```

**Note:** The standard `EventSource` API only supports GET requests. For POST requests with SSE, you may need to use a library like `eventsource` (Node.js) or implement a custom solution using `fetch` with streaming.

### Alternative: Using Fetch with Streaming

If you need to use POST with SSE, you can use the Fetch API with streaming:

```typescript
async function syncWorkItems(projectId: string, epics: any[], configId?: string) {
  const url = `/api/azure-devops/projects/${projectId}/workitems${configId ? `?configId=${configId}` : ''}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream'
    },
    body: JSON.stringify({ epics })
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error('Response body is not readable');
  }

  while (true) {
    const { done, value } = await reader.read();
    
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('event:')) {
        const eventType = line.substring(6).trim();
        // Handle event type
      } else if (line.startsWith('data:')) {
        const data = JSON.parse(line.substring(5).trim());
        handleEvent(eventType, data);
      }
    }
  }
}
```

## Progress Display Guidelines

### UI Recommendations

1. **Real-time Updates**: Update the UI immediately when each event is received
2. **Visual Indicators**: Use icons or colors to show status:
   - ✅ Green checkmark for successful creation
   - ❌ Red X for failures
   - ⏳ Spinner for in-progress items
3. **Hierarchical Display**: Show items in a tree structure matching the hierarchy
4. **Progress Summary**: Display overall progress (e.g., "3 of 10 items created")

### Example UI Structure

```
Sync Progress
├── Epic: "Customer Portal" ✅ Created (ID: 12345)
│   ├── Feature: "User Authentication" ✅ Created (ID: 12346)
│   │   ├── User Story: "Login" ✅ Created (ID: 12347)
│   │   └── User Story: "Logout" ✅ Created (ID: 12348)
│   └── Feature: "Dashboard" ⏳ Creating...
│       └── User Story: "View Analytics" ⏳ Pending...
└── Epic: "Mobile App" ⏳ Pending...

Summary: 4 of 7 items created
```

### Status Tracking

Track the following states for each item:

- **Pending** - Not yet processed
- **Creating** - Currently being created
- **Created** - Successfully created (with Azure DevOps ID)
- **Failed** - Creation failed (with error message)

## Error Handling

### Partial Failures

The sync process continues even if individual items fail. This means:

- If an Epic fails, its Features and User Stories are skipped
- If a Feature fails, its User Stories are skipped
- If a User Story fails, other User Stories continue to be created

The `sync:complete` event includes a summary of successes and failures.

### Connection Errors

If the SSE connection is lost:

1. The frontend should detect the connection error
2. Display an error message to the user
3. Provide an option to retry the sync
4. Note: Items already created will not be recreated (check for duplicates)

### Retry Logic

When retrying a failed sync:

1. Check which items were successfully created (using Azure DevOps IDs from previous sync)
2. Only sync items that weren't created
3. Handle duplicate detection (Azure DevOps may reject duplicate titles)

## Example: Complete Sync Flow

### Request

```bash
POST /api/azure-devops/projects/myproject/workitems?configId=azdo-config-123
Content-Type: application/json

{
  "epics": [
    {
      "_id": "epic-1",
      "name": "Customer Portal",
      "type": "Epic",
      "description": "Build customer portal",
      "children": [
        {
          "_id": "feature-1",
          "name": "User Authentication",
          "type": "Feature",
          "description": "Implement user authentication",
          "children": [
            {
              "_id": "us-1",
              "name": "User can login",
              "type": "User Story",
              "description": "As a user, I want to login"
            },
            {
              "_id": "us-2",
              "name": "User can logout",
              "type": "User Story",
              "description": "As a user, I want to logout"
            }
          ]
        }
      ]
    }
  ]
}
```

### Streamed Events (in order)

```
event: epic:created
data: {"type":"epic:created","data":{"ardoqId":"epic-1","name":"Customer Portal","azureDevOpsId":12345,"azureDevOpsUrl":"https://dev.azure.com/myorg/myproject/_workitems/edit/12345","timestamp":"2024-01-15T10:30:00Z"}}

event: feature:created
data: {"type":"feature:created","data":{"ardoqId":"feature-1","name":"User Authentication","azureDevOpsId":12346,"azureDevOpsUrl":"https://dev.azure.com/myorg/myproject/_workitems/edit/12346","timestamp":"2024-01-15T10:30:05Z"}}

event: userstory:created
data: {"type":"userstory:created","data":{"ardoqId":"us-1","name":"User can login","azureDevOpsId":12347,"azureDevOpsUrl":"https://dev.azure.com/myorg/myproject/_workitems/edit/12347","timestamp":"2024-01-15T10:30:10Z"}}

event: userstory:created
data: {"type":"userstory:created","data":{"ardoqId":"us-2","name":"User can logout","azureDevOpsId":12348,"azureDevOpsUrl":"https://dev.azure.com/myorg/myproject/_workitems/edit/12348","timestamp":"2024-01-15T10:30:15Z"}}

event: sync:complete
data: {"type":"sync:complete","data":{"summary":{"total":4,"created":4,"failed":0,"epics":{"total":1,"created":1,"failed":0},"features":{"total":1,"created":1,"failed":0},"userStories":{"total":2,"created":2,"failed":0}},"timestamp":"2024-01-15T10:30:20Z"}}
```

## Troubleshooting

### Common Issues

1. **Connection Drops**: If the SSE connection drops, check network stability and server logs
2. **Missing Events**: Ensure the frontend is listening for all event types
3. **Duplicate Items**: Check if items were already created in a previous sync attempt
4. **Permission Errors**: Verify the PAT token has "Work Items (Read, write, & manage)" permissions

### Debugging Tips

1. **Enable Logging**: Log all received events in the frontend console
2. **Check Network Tab**: Inspect the SSE connection in browser DevTools
3. **Verify Data Format**: Ensure the request body matches the expected structure
4. **Test with Small Dataset**: Start with a single Epic to verify the flow

## Related Documentation

- [Azure DevOps Integration Documentation](./azure-devops.md) - Complete Azure DevOps API integration guide
- [Ardoq Integration Documentation](./ardoq.md) - Ardoq API integration guide

