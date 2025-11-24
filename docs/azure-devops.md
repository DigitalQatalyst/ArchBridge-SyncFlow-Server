# Azure DevOps API Integration

This document describes the Azure DevOps REST API integration implemented in the ArchBridge SyncFlow Server.

## Overview

The server provides integration with the Azure DevOps REST API, allowing you to:

- Authenticate and connect to your Azure DevOps organization using Personal Access Tokens (PAT)
- Manage multiple Azure DevOps configurations
- Test connections by listing projects
- List all projects in your organization
- Check if a project has existing work items
- Create work items (Epics, Features, User Stories) from Ardoq hierarchy data
- Overwrite existing work items by deleting and recreating them

## Setup

### Prerequisites

1. An Azure DevOps account
2. A Personal Access Token (PAT) with appropriate permissions
3. Your Azure DevOps organization name

### Configuration Methods

As a connector, Azure DevOps credentials can be configured via API:

#### Via API (Recommended for Connectors)

Use the create configuration endpoint to configure credentials through the frontend:

```bash
POST /api/azure-devops/configurations
```

The connection is automatically tested during creation. See the [Create Configuration](#create-configuration) section below for details.

### Creating a Personal Access Token (PAT)

1. **Access User Settings:**
   - Sign in to your Azure DevOps account
   - Click on your user icon in the top-right corner
   - Select "Personal access tokens"

2. **Generate a New Token:**
   - Click on "New Token"
   - Provide a descriptive name for the token
   - Set the expiration date as per your security requirements
   - Under "Scopes," select the necessary permissions:
     - **Project and Team (Read)**: Required for connection testing
     - **Work Items (Read, write, & manage)**: If you need to access work items
     - **Project and Team (Read, write, & manage)**: If you need to access projects
     - **Token Administration (Read & manage)**: For token management
     - **Member Entitlement Management (Read)**: For user management
   - Click "Create" to generate the token

3. **Store the Token Securely:**
   - Copy the generated token immediately, as it will not be displayed again
   - Securely store the token in a password manager or a secure location

### Configuration Test Status

All configurations have a test status that tracks whether they've been tested and if the test passed:

- **isTested** (boolean): Whether the configuration has been tested
- **testPassed** (boolean): Whether the connection test passed
- **testError** (string | null): Error message if the test failed

**Important Rules:**

- Configurations can be created even if the test fails
- Only configurations with `testPassed: true` can be activated
- Configurations with `testPassed: false` can be updated or deleted, but cannot be activated or used
- You can retest a configuration using `GET /api/azure-devops/test-connection?configId=xxx` to update its test status

### Finding Your Configuration Values

1. **Token Name:**
   - The name you assigned when creating the PAT
   - Used for identification purposes

2. **Organization:**
   - Your Azure DevOps organization name
   - Found in your Azure DevOps URL: `https://dev.azure.com/{organization}`
   - Example: If your URL is `https://dev.azure.com/mycompany`, your organization is `mycompany`

3. **PAT Token:**
   - The actual Personal Access Token value
   - Generated when you create a new token
   - Only shown once, so save it securely

## API Endpoints

All Azure DevOps endpoints are prefixed with `/api/azure-devops`.

### Connection & Configuration Management

#### Create Configuration

Create a new Azure DevOps configuration. The connection is automatically tested during creation by listing projects. Configurations can be saved even if the test fails, but they cannot be activated until they pass the test.

**Endpoint:** `POST /api/azure-devops/configurations`

**Request Body:**

```json
{
  "name": "My Azure DevOps Configuration",  // Required - token name
  "organization": "mycompany",              // Required - Azure DevOps organization
  "patToken": "your_pat_token_here",       // Required - Personal Access Token
  "setActive": false                        // Optional, whether to set as active configuration (only if test passes)
}
```

**Response (Test Passed):**

```json
{
  "success": true,
  "message": "Configuration created and connection test passed",
  "data": {
    "configuration": {
      "id": "azdo-config-1234567890-abc123",
      "name": "My Azure DevOps Configuration",
      "organization": "mycompany",
      "isActive": false,
      "isTested": true,
      "testPassed": true,
      "testError": null,
      "createdAt": "2024-01-01T12:00:00.000Z"
    },
    "testResult": {
      "success": true,
      "projects": [
        {
          "id": "project-id-1",
          "name": "My Project",
          "description": "Project description",
          "state": "wellFormed"
        }
      ],
      "projectCount": 1,
      "timestamp": "2024-01-01T12:00:00.000Z"
    }
  }
}
```

**Response (Test Failed - Configuration Still Saved):**

```json
{
  "success": true,
  "message": "Configuration created but connection test failed",
  "data": {
    "configuration": {
      "id": "azdo-config-1234567890-abc123",
      "name": "My Azure DevOps Configuration",
      "organization": "mycompany",
      "isActive": false,
      "isTested": true,
      "testPassed": false,
      "testError": "HTTP 401: Unauthorized",
      "createdAt": "2024-01-01T12:00:00.000Z"
    },
    "testResult": {
      "success": false,
      "error": "HTTP 401: Unauthorized",
      "timestamp": "2024-01-01T12:00:00.000Z"
    }
  }
}
```

**Important Notes:**

- Configuration is always saved, even if the test fails
- If `setActive: true` is provided but the test fails, the configuration will NOT be set as active
- Configurations that haven't passed the test (`testPassed: false`) cannot be activated
- You can test and update the configuration later using the test endpoint

#### Test Connection with Saved Configuration

Test connection using a previously saved configuration and update its test status. The test queries the Azure DevOps projects API to verify the PAT token is valid and has access to the organization.

**Endpoint:** `GET /api/azure-devops/test-connection?configId=xxx`

**Query Parameters:**

- `configId` (optional): Configuration ID to test. If omitted, uses the active configuration.

**Response:**

```json
{
  "success": true,
  "message": "Azure DevOps API connection test passed",
  "data": {
    "projects": [
      {
        "id": "project-id-1",
        "name": "My Project",
        "description": "Project description",
        "state": "wellFormed"
      }
    ],
    "projectCount": 1,
    "timestamp": "2024-01-01T12:00:00.000Z"
  },
  "configuration": {
    "id": "azdo-config-1234567890-abc123",
    "name": "My Azure DevOps Configuration",
    "organization": "mycompany",
    "isActive": false,
    "isTested": true,
    "testPassed": true,
    "testError": null
  }
}
```

**Note:** This endpoint updates the configuration's test status (`isTested`, `testPassed`, `testError`) in the database.

#### List Configurations

Get all saved Azure DevOps configurations.

**Endpoint:** `GET /api/azure-devops/configurations`

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "azdo-config-1234567890-abc123",
      "name": "Production Azure DevOps",
      "organization": "mycompany",
      "isActive": true,
      "isTested": true,
      "testPassed": true,
      "testError": null,
      "createdAt": "2024-01-01T12:00:00.000Z",
      "updatedAt": "2024-01-01T12:00:00.000Z"
    },
    {
      "id": "azdo-config-0987654321-xyz789",
      "name": "Development Azure DevOps",
      "organization": "devcompany",
      "isActive": false,
      "isTested": true,
      "testPassed": false,
      "testError": "HTTP 401: Unauthorized",
      "createdAt": "2024-01-02T12:00:00.000Z",
      "updatedAt": "2024-01-02T12:00:00.000Z"
    }
  ],
  "count": 2
}
```

#### Get Active Configuration

Get the currently active configuration.

**Endpoint:** `GET /api/azure-devops/configurations/active`

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "azdo-config-1234567890-abc123",
    "name": "Production Azure DevOps",
    "organization": "mycompany",
    "isActive": true,
    "isTested": true,
    "testPassed": true,
    "testError": null,
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

#### Get Configuration by ID

Get a specific configuration by its ID.

**Endpoint:** `GET /api/azure-devops/configurations/:id`

**Response:** Same format as active configuration

#### Update Configuration

Update an existing configuration.

**Endpoint:** `PUT /api/azure-devops/configurations/:id`

**Request Body:**

```json
{
  "name": "Updated Configuration Name",  // Optional
  "organization": "newcompany",          // Optional
  "patToken": "new_token",               // Optional - if updated, test status will be reset
  "isActive": true                       // Optional, setting to true will deactivate others (only if test passed)
}
```

**Response:** Updated configuration object with test status fields

**Note:** If `patToken` is updated, the test status (`isTested`, `testPassed`, `testError`) will be reset. You'll need to test the configuration again before it can be activated.

#### Delete Configuration

Delete a saved configuration.

**Endpoint:** `DELETE /api/azure-devops/configurations/:id`

**Response:**

```json
{
  "success": true,
  "message": "Configuration deleted successfully"
}
```

#### Activate Configuration

Set a configuration as the active one (will deactivate all others). Only configurations that have passed the test can be activated.

**Endpoint:** `POST /api/azure-devops/configurations/:id/activate`

**Response:** Activated configuration object

**Error Response (if test not passed):**

```json
{
  "success": false,
  "error": "Configuration must pass the connection test before it can be activated"
}
```

**Note:**

- **Important:** Only configurations with `testPassed: true` can be activated. Attempting to activate an untested or failed configuration will result in an error.

### Process Templates

#### List Process Templates

Get all available process templates for the organization. This allows the frontend to display available templates for user selection.

**Endpoint:** `GET /api/azure-devops/processes?configId=xxx`

**Query Parameters:**

- `configId` (optional): Use a specific saved configuration. If omitted, uses the active configuration.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "typeId": "adcc42ab-9882-485e-a3ed-7676785c7e0f",
      "name": "Agile",
      "description": "Agile process template",
      "isDefault": false,
      "isEnabled": true
    },
    {
      "typeId": "6b724908-ef14-45cf-84f8-768b5384da45",
      "name": "Scrum",
      "description": "Scrum process template",
      "isDefault": false,
      "isEnabled": true
    },
    {
      "typeId": "27450541-8e31-4150-9947-d59beef0d2ce",
      "name": "Basic",
      "description": "Basic process template",
      "isDefault": false,
      "isEnabled": true
    }
  ],
  "count": 3
}
```

**Common Process Templates:**

- **Agile**: Supports Epic, Feature, User Story, Task, and Bug work item types
- **Scrum**: Supports Epic, Feature, Product Backlog Item, Task, and Bug work item types
- **Basic**: Supports Epic, Issue, and Task work item types
- **CMMI**: Supports Epic, Feature, Requirement, Task, Change Request, Review, Risk, and Bug work item types

**Error Response:**

```json
{
  "success": false,
  "error": "Failed to fetch process templates",
  "details": "HTTP 401: Unauthorized"
}
```

### Project Management

#### Create Project

Create a new Azure DevOps project in the organization. The project creation is queued and returns an operation reference that can be used to check the status of the project creation.

**Endpoint:** `POST /api/azure-devops/projects?configId=xxx`

**Query Parameters:**

- `configId` (optional): Use a specific saved configuration. If omitted, uses the active configuration.

**Request Body:**

```json
{
  "name": "My New Project",                    // Required - Project name
  "description": "Project description",        // Optional - Project description
  "visibility": "private",                     // Optional - "private" or "public" (default: private)
  "capabilities": {                            // Optional - Project capabilities (defaults to Agile + Git if not provided)
    "processTemplate": {
      "templateTypeId": "adcc42ab-9882-485e-a3ed-7676785c7e0f"  // Process template ID (defaults to Agile if not provided)
    },
    "versioncontrol": {
      "sourceControlType": "Git"               // "Git" or "Tfvc" (defaults to Git if not provided)
    }
  }
}
```

**Note:** If `capabilities` is not provided, the project will default to:

- **Process Template**: Agile - The Agile process template ID is automatically fetched from your organization using the Processes API (`GET /_apis/work/processes?api-version=7.1`). Supports Epic, Feature, User Story, Task, and Bug work item types.
- **Version Control**: Git

If `capabilities` is provided but `processTemplate` or `versioncontrol` is missing, those will also default to Agile and Git respectively.

**Important:** The Agile process template must be available in your Azure DevOps organization. If it's not found, the project creation will fail with an error message. You can specify a different process template ID in the request if needed.

**Response:**

```json
{
  "success": true,
  "message": "Project creation queued successfully",
  "data": {
    "id": "operation-id-123",
    "status": "queued",
    "url": "https://dev.azure.com/mycompany/_apis/operations/operation-id-123",
    "_links": {
      "self": {
        "href": "https://dev.azure.com/mycompany/_apis/operations/operation-id-123"
      }
    }
  }
}
```

**Important Notes:**

- Project creation is asynchronous and returns an operation reference
- Use the operation reference to check the status of project creation
- The configuration must have passed the connection test (`testPassed: true`) to create projects
- If no `configId` is provided, the active configuration will be used

**Error Response (if configuration not tested):**

```json
{
  "success": false,
  "error": "Configuration \"My Config\" has not passed the connection test. Please test and update the configuration before using it."
}
```

#### List Projects

List all projects in the Azure DevOps organization.

**Endpoint:** `GET /api/azure-devops/projects?configId=xxx`

**Query Parameters:**

- `configId` (optional): Use a specific saved configuration. If omitted, uses the active configuration.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "project-id-1",
      "name": "My Project",
      "description": "Project description",
      "state": "wellFormed",
      "visibility": "private",
      "lastUpdateTime": "2024-01-01T12:00:00.000Z"
    },
    {
      "id": "project-id-2",
      "name": "Another Project",
      "description": "Another project description",
      "state": "wellFormed",
      "visibility": "private",
      "lastUpdateTime": "2024-01-02T12:00:00.000Z"
    }
  ],
  "count": 2
}
```

**Error Response:**

```json
{
  "success": false,
  "error": "Failed to list projects",
  "details": "HTTP 401: Unauthorized"
}
```

**Important Notes:**

- The configuration must have passed the connection test (`testPassed: true`) to list projects
- If no `configId` is provided, the active configuration will be used
- Returns all projects accessible to the authenticated user

### Work Items Management

Create work items (Epics, Features, User Stories) in Azure DevOps from Ardoq hierarchy data. The syncing process uses Server-Sent Events (SSE) to stream real-time progress updates.

**Documentation**: See [Syncing Progress Documentation](./syncing-progress.md) for complete details on:

- How the syncing process works
- Real-time progress streaming with SSE
- Event types and data structures
- Frontend integration examples
- Progress display guidelines

**Key Features:**

- Sequential creation of Epics → Features → User Stories
- Parent-child relationship establishment
- Real-time progress updates via SSE
- Error handling for partial failures
- Check for existing work items before creation
- Overwrite mode to delete and recreate all work items

#### Check Work Items

Check if a project has existing work items and get the count.

**Endpoint:** `GET /api/azure-devops/projects/:project/workitems/check?configId=xxx`

**Path Parameters:**

- `project` - Azure DevOps project ID or project name

**Query Parameters:**

- `configId` (optional): Use a specific saved configuration. If omitted, uses the active configuration.

**Response:**

```json
{
  "success": true,
  "data": {
    "hasWorkItems": true,
    "count": 15,
    "workItemIds": [12345, 12346, 12347, 12348, 12349, 12350, 12351, 12352, 12353, 12354, 12355, 12356, 12357, 12358, 12359]
  }
}
```

**Response (No Work Items):**

```json
{
  "success": true,
  "data": {
    "hasWorkItems": false,
    "count": 0,
    "workItemIds": []
  }
}
```

**Error Response:**

```json
{
  "success": false,
  "error": "Failed to check work items",
  "details": "HTTP 404: Project not found"
}
```

**Important Notes:**

- Uses WIQL (Work Item Query Language) to query all work items in the project
- Returns all work item IDs found in the project
- The configuration must have passed the connection test (`testPassed: true`)
- If no `configId` is provided, the active configuration will be used

Create work items (Epics, Features, User Stories) in Azure DevOps from Ardoq hierarchy data. The syncing process uses Server-Sent Events (SSE) to stream real-time progress updates.

**Documentation**: See [Syncing Progress Documentation](./syncing-progress.md) for complete details on:

- How the syncing process works
- Real-time progress streaming with SSE
- Event types and data structures
- Frontend integration examples
- Progress display guidelines

**Key Features:**

- Sequential creation of Epics → Features → User Stories
- Parent-child relationship establishment
- Real-time progress updates via SSE
- Error handling for partial failures

#### Create Work Items

Create work items from Ardoq hierarchy data. This endpoint streams progress updates using Server-Sent Events (SSE).

**Endpoint:** `POST /api/azure-devops/projects/:project/workitems?configId=xxx&overwrite=true`

**Path Parameters:**

- `project` - Azure DevOps project ID or project name

**Query Parameters:**

- `configId` (optional): Use a specific saved configuration. If omitted, uses the active configuration.
- `overwrite` (optional): If set to `true`, deletes all existing work items in the project before creating new ones. Defaults to `false`.

**Request Body (application/json):**

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

**Response (text/event-stream):**

The response is a Server-Sent Events (SSE) stream that emits events as work items are created. When `overwrite=true`, additional events are emitted for the overwrite operation:

```text
event: overwrite:started
data: {"type":"overwrite:started","data":{"message":"Overwrite mode enabled. Checking for existing work items...","timestamp":"2024-01-15T10:29:50Z"}}

event: overwrite:deleting
data: {"type":"overwrite:deleting","data":{"message":"Found 15 existing work items. Deleting...","count":15,"timestamp":"2024-01-15T10:29:51Z"}}

event: overwrite:deleted
data: {"type":"overwrite:deleted","data":{"message":"Successfully deleted 15 existing work items","count":15,"timestamp":"2024-01-15T10:29:55Z"}}

event: epic:created
data: {"type":"epic:created","data":{"ardoqId":"epic-123","name":"Epic Name","azureDevOpsId":12345,"azureDevOpsUrl":"https://dev.azure.com/org/project/_workitems/edit/12345","timestamp":"2024-01-15T10:30:00Z"}}

event: feature:created
data: {"type":"feature:created","data":{"ardoqId":"feature-456","name":"Feature Name","azureDevOpsId":12346,"azureDevOpsUrl":"https://dev.azure.com/org/project/_workitems/edit/12346","timestamp":"2024-01-15T10:30:05Z"}}

event: userstory:created
data: {"type":"userstory:created","data":{"ardoqId":"userstory-789","name":"User Story Name","azureDevOpsId":12347,"azureDevOpsUrl":"https://dev.azure.com/org/project/_workitems/edit/12347","timestamp":"2024-01-15T10:30:10Z"}}

event: sync:complete
data: {"type":"sync:complete","data":{"summary":{"total":3,"created":3,"failed":0,"epics":{"total":1,"created":1,"failed":0},"features":{"total":1,"created":1,"failed":0},"userStories":{"total":1,"created":1,"failed":0}},"timestamp":"2024-01-15T10:30:15Z"}}
```

**Event Types:**

**Overwrite Events (only when `overwrite=true`):**

- `overwrite:started` - Overwrite operation started, checking for existing work items
- `overwrite:deleting` - Found existing work items, deletion in progress
- `overwrite:deleted` - Successfully deleted existing work items
- `overwrite:no-items` - No existing work items found, proceeding with creation
- `overwrite:error` - Overwrite operation failed, work item creation aborted

**Work Item Events:**

- `epic:created` - Epic successfully created
- `feature:created` - Feature successfully created
- `userstory:created` - User Story successfully created
- `epic:failed` - Epic creation failed
- `feature:failed` - Feature creation failed
- `userstory:failed` - User Story creation failed
- `sync:complete` - All items processed (with summary)
- `sync:error` - Critical error occurred

**Important Notes:**

- The endpoint uses Server-Sent Events (SSE) for real-time progress updates
- Items are created sequentially: Epic → Features → User Stories
- Parent-child relationships are automatically established
- The process continues even if individual items fail
- The configuration must have passed the connection test (`testPassed: true`)
- See [Syncing Progress Documentation](./syncing-progress.md) for detailed frontend integration examples

**Overwrite Mode:**

When `overwrite=true` is specified:

1. The endpoint first queries all existing work items in the project using WIQL
2. If work items are found, they are permanently deleted (destroyed, not moved to recycle bin)
3. After deletion completes, new work items are created as normal
4. Overwrite events are streamed via SSE to track the deletion progress
5. If the overwrite operation fails, work item creation is aborted and an error event is sent

**Warning:** Overwrite mode permanently deletes all work items in the project. This action cannot be undone. Use with caution.

**Example with Overwrite:**

```bash
POST /api/azure-devops/projects/MyProject/workitems?configId=xxx&overwrite=true
```

**Error Response (if configuration not tested):**

```json
{
  "success": false,
  "error": "Configuration \"My Config\" has not passed the connection test. Please test and update the configuration before using it."
}
```

---

## Error Handling

All endpoints return consistent error responses:

**Error Response Format:**

```json
{
  "success": false,
  "error": "Error message description"
}
```

**Common HTTP Status Codes:**

- `400` - Bad Request (missing required parameters)
- `401` - Unauthorized (invalid or expired PAT token)
- `404` - Not Found (resource doesn't exist)
- `409` - Conflict (duplicate configuration)
- `500` - Internal Server Error (server-side error)

**Example Error Response:**

```json
{
  "success": false,
  "error": "patToken is required and must be a non-empty string"
}
```

---

## Usage Examples

### Using cURL

```bash
# Create a configuration
curl -X POST "http://localhost:3000/api/azure-devops/configurations" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Azure DevOps Config",
    "organization": "mycompany",
    "patToken": "your_pat_token_here"
  }'

# Test a configuration
curl "http://localhost:3000/api/azure-devops/test-connection?configId=azdo-config-xxx"

# List all configurations
curl "http://localhost:3000/api/azure-devops/configurations"

# Get active configuration
curl "http://localhost:3000/api/azure-devops/configurations/active"

# Activate a configuration
curl -X POST "http://localhost:3000/api/azure-devops/configurations/azdo-config-xxx/activate"

# List available process templates
curl "http://localhost:3000/api/azure-devops/processes?configId=azdo-config-xxx"

# List all projects
curl "http://localhost:3000/api/azure-devops/projects?configId=azdo-config-xxx"

# Create a project
curl -X POST "http://localhost:3000/api/azure-devops/projects?configId=azdo-config-xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My New Project",
    "description": "Project description",
    "visibility": "private"
  }'

# Check if a project has work items
curl "http://localhost:3000/api/azure-devops/projects/MyProject/workitems/check?configId=azdo-config-xxx"

# Create work items with overwrite mode
curl -X POST "http://localhost:3000/api/azure-devops/projects/MyProject/workitems?configId=azdo-config-xxx&overwrite=true" \
  -H "Content-Type: application/json" \
  -d '{
    "epics": [...]
  }'
```

### Using JavaScript/TypeScript

```typescript
// Create a configuration
const createResponse = await fetch('http://localhost:3000/api/azure-devops/configurations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'My Azure DevOps Config',
    organization: 'mycompany',
    patToken: 'your_pat_token_here'
  })
});
const { data: config } = await createResponse.json();

// Test a configuration
const testResponse = await fetch(
  `http://localhost:3000/api/azure-devops/test-connection?configId=${config.configuration.id}`
);
const testResult = await testResponse.json();

// List all configurations
const listResponse = await fetch('http://localhost:3000/api/azure-devops/configurations');
const { data: configs } = await listResponse.json();

// Activate a configuration
const activateResponse = await fetch(
  `http://localhost:3000/api/azure-devops/configurations/${config.configuration.id}/activate`,
  { method: 'POST' }
);
const activated = await activateResponse.json();

// List available process templates
const processesResponse = await fetch(
  `http://localhost:3000/api/azure-devops/processes?configId=${config.configuration.id}`
);
const { data: templates } = await processesResponse.json();

// List all projects
const listProjectsResponse = await fetch(
  `http://localhost:3000/api/azure-devops/projects?configId=${config.configuration.id}`
);
const { data: projects } = await listProjectsResponse.json();

// Create a project
const createProjectResponse = await fetch(
  `http://localhost:3000/api/azure-devops/projects?configId=${config.configuration.id}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'My New Project',
      description: 'Project description',
      visibility: 'private'
    })
  }
);
const projectOperation = await createProjectResponse.json();

// Check if a project has work items
const checkWorkItemsResponse = await fetch(
  `http://localhost:3000/api/azure-devops/projects/MyProject/workitems/check?configId=${config.configuration.id}`
);
const { data: workItemsCheck } = await checkWorkItemsResponse.json();
console.log(`Project has ${workItemsCheck.count} work items`);

// Create work items with overwrite mode
const createWorkItemsResponse = await fetch(
  `http://localhost:3000/api/azure-devops/projects/MyProject/workitems?configId=${config.configuration.id}&overwrite=true`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      epics: [...]
    })
  }
);
// Handle SSE stream for work items creation
```

### Using Axios

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api/azure-devops',
});

// Create a configuration
const { data: config } = await api.post('/configurations', {
  name: 'My Azure DevOps Config',
  organization: 'mycompany',
  patToken: 'your_pat_token_here'
});

// Test a configuration
const { data: testResult } = await api.get('/test-connection', {
  params: { configId: config.data.configuration.id }
});

// List all configurations
const { data: configs } = await api.get('/configurations');

// Activate a configuration
const { data: activated } = await api.post(`/configurations/${config.data.configuration.id}/activate`);

// List all projects
const { data: projects } = await api.get('/projects', {
  params: { configId: config.data.configuration.id }
});

// Create a project
const { data: projectOperation } = await api.post('/projects', {
  name: 'My New Project',
  description: 'Project description',
  visibility: 'private'
}, {
  params: { configId: config.data.configuration.id }
});

// Check if a project has work items
const { data: workItemsCheck } = await api.get('/projects/MyProject/workitems/check', {
  params: { configId: config.data.configuration.id }
});

// Create work items with overwrite mode
const createWorkItemsResponse = await api.post('/projects/MyProject/workitems', {
  epics: [...]
}, {
  params: { 
    configId: config.data.configuration.id,
    overwrite: true
  }
});
// Handle SSE stream for work items creation
```

---

## Implementation Details

### Authentication

Azure DevOps uses Personal Access Token (PAT) authentication with Basic authentication:

- **Format**: `Authorization: Basic {base64(':PAT_TOKEN')}`
- The PAT token is base64 encoded with a colon prefix (`:PAT_TOKEN`)
- Base URL: `https://dev.azure.com/{organization}`

### Connection Testing

The connection test queries the Azure DevOps projects API:

- **Endpoint**: `GET https://dev.azure.com/{organization}/_apis/projects?api-version=7.1`
- On success, returns a list of projects in the organization
- Updates the configuration's test status in the database

### Security Best Practices

- **Limit Permissions**: Assign only the necessary scopes to the PAT to adhere to the principle of least privilege
- **Set Expiration Dates**: Define an appropriate expiration date for the PAT to enhance security
- **Secure Storage**: PAT tokens are stored securely in Supabase and never exposed in API responses
- **Regular Rotation**: Periodically regenerate and update the PAT to maintain security

---

## Testing

### Test Configuration Management

1. Start the server:

   ```bash
   npm run dev
   ```

2. Create a configuration:

   ```bash
   curl -X POST http://localhost:3000/api/azure-devops/configurations \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test Configuration",
       "organization": "mycompany",
       "patToken": "your_pat_token_here"
     }'
   ```

3. Test an existing configuration:

   ```bash
   curl "http://localhost:3000/api/azure-devops/test-connection?configId=azdo-config-xxx"
   ```

4. List all configurations:

   ```bash
   curl "http://localhost:3000/api/azure-devops/configurations"
   ```

---

## Troubleshooting

### Common Issues

**401 Unauthorized Error:**

- Check that the PAT token is correct and hasn't expired
- Verify the token has the necessary permissions (at minimum, Project and Team Read)
- Ensure the organization name is correct

**404 Not Found:**

- Verify the configuration ID exists
- Check that the organization name matches your Azure DevOps organization

**Connection Test Fails:**

- Verify the PAT token is valid and not expired
- Check that the organization name is correct
- Ensure the token has "Project and Team (Read)" scope enabled
- Verify network connectivity to `dev.azure.com`
- Confirm you have access to at least one project in the organization

**Cannot Activate Configuration:**

- Ensure the configuration has passed the connection test (`testPassed: true`)
- Test the configuration again using the test endpoint
- Check the `testError` field for details about why the test failed

### Debug Mode

Enable debug logging by setting `NODE_ENV=development` in your `.env` file. This will log all Azure DevOps API requests to the console.

---

## References

- [Azure DevOps REST API Documentation](https://docs.microsoft.com/en-us/rest/api/azure/devops/)
- [Personal Access Tokens Documentation](https://docs.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate)
- [Projects API](https://docs.microsoft.com/en-us/rest/api/azure/devops/core/projects/list)

---

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review the Azure DevOps API documentation
3. Verify your PAT token permissions and expiration
4. Check server logs for detailed error messages
