# Ardoq API Integration

This document describes the Ardoq REST API integration implemented in the ArchBridge SyncFlow Server.

## Overview

The server provides a comprehensive integration with the Ardoq REST API, allowing you to:

- Authenticate and connect to your Ardoq instance
- Fetch workspaces, components, and references
- Retrieve hierarchical data structures (Domains → Initiatives → Epics → Features → User Stories)
- Access User Story metadata with all required fields

## Setup

### Prerequisites

1. An Ardoq account with API access
2. An Ardoq API token (see [Generating an API Token](https://developer.ardoq.com/getting-started/generating-an-api-token/))
3. Your organization label (if not using a custom domain)

### Configuration Methods

As a connector, Ardoq API credentials can be configured in two ways:

#### Method 1: Via API (Recommended for Connectors)

Use the create configuration endpoint to configure credentials through the frontend:

```bash
POST /api/ardoq/configurations
```

The connection is automatically tested during creation. See the [Create Configuration](#create-configuration) section below for details.

#### Method 2: Environment Variables (Optional Fallback)

Create a `.env` file in the project root with the following variables:

```env
# Ardoq API Configuration (Optional - can be configured via API)
ARDOQ_API_TOKEN=your_api_token_here
ARDOQ_API_HOST=https://app.ardoq.com
ARDOQ_ORG_LABEL=your_org_label_here
```

**Configuration Details:**

- **ARDOQ_API_TOKEN**: Your Ardoq API token. Get it from the [Ardoq Developer Portal](https://developer.ardoq.com/getting-started/generating-an-api-token/)
- **ARDOQ_API_HOST** (Optional): Your Ardoq API host. Defaults to `https://app.ardoq.com`. If you're using a custom domain, set this to your custom domain (e.g., `https://myorg.ardoq.com`)
- **ARDOQ_ORG_LABEL** (Optional): Your organization label. Find it in the Ardoq app or API token generation page

**Note:** Environment variables serve as a fallback if no active configuration is set via the API. Configurations saved via the API are stored in Supabase and persist across server restarts.

### Configuration Test Status

All configurations have a test status that tracks whether they've been tested and if the test passed:

- **isTested** (boolean): Whether the configuration has been tested
- **testPassed** (boolean): Whether the connection test passed
- **testError** (string | null): Error message if the test failed

**Important Rules:**

- Configurations can be created even if the test fails
- Only configurations with `testPassed: true` can be used for API requests
- Configurations with `testPassed: false` can be updated or deleted, but cannot be activated or used
- You can retest a configuration using `GET /api/ardoq/test-connection?configId=xxx` to update its test status

### Finding Your Configuration Values

1. **API Token**:
   - Log into Ardoq
   - Navigate to Settings → API Tokens
   - Generate a new token or use an existing one

2. **API Host**:
   - Open the Ardoq app and log in
   - Check the URL in your browser's address bar
   - The format should be `https://<something>.ardoq.com`
   - If `<something>` is anything other than `app`, you're using a custom domain

3. **Organization Label**:
   - Found in the API token generation page
   - Or check your organization settings in Ardoq

## API Endpoints

All Ardoq endpoints are prefixed with `/api/ardoq`.

### Connection & Configuration Management

#### Create Configuration

Create a new Ardoq configuration. The connection is automatically tested during creation. Configurations can be saved even if the test fails, but they cannot be used for API requests until they pass the test.

**Endpoint:** `POST /api/ardoq/configurations`

**Request Body:**

```json
{
  "name": "My Ardoq Configuration",     // Required
  "apiToken": "your_api_token_here",   // Required
  "apiHost": "https://app.ardoq.com",  // Optional, defaults to https://app.ardoq.com
  "orgLabel": "your_org_label",         // Optional
  "setActive": false                    // Optional, whether to set as active configuration (only if test passes)
}
```

**Response (Test Passed):**

```json
{
  "success": true,
  "message": "Configuration created and connection test passed",
  "data": {
    "configuration": {
      "id": "config-1234567890-abc123",
      "name": "My Ardoq Configuration",
      "apiHost": "https://app.ardoq.com",
      "orgLabel": "myorg",
      "isActive": false,
      "isTested": true,
      "testPassed": true,
      "testError": null,
      "createdAt": "2024-01-01T12:00:00.000Z"
    },
    "testResult": {
      "success": true,
      "user": {
        "email": "user@example.com"
      },
      "organization": {
        "name": "My Organization",
        "label": "myorg"
      },
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
      "id": "config-1234567890-abc123",
      "name": "My Ardoq Configuration",
      "apiHost": "https://app.ardoq.com",
      "orgLabel": "myorg",
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
- Configurations that haven't passed the test (`testPassed: false`) cannot be used for API requests
- You can test and update the configuration later using the test endpoint

#### Test Connection with Saved Configuration

Test connection using a previously saved configuration and update its test status.

**Endpoint:** `GET /api/ardoq/test-connection?configId=xxx`

**Query Parameters:**

- `configId` (optional): Configuration ID to test. If omitted, uses the active configuration.

**Response:**

```json
{
  "success": true,
  "message": "Ardoq API connection test passed",
  "data": {
    "user": {
      "email": "user@example.com"
    },
    "organization": {
      "name": "My Organization",
      "label": "myorg"
    },
    "timestamp": "2024-01-01T12:00:00.000Z"
  },
  "configuration": {
    "id": "config-1234567890-abc123",
    "name": "My Ardoq Configuration",
    "apiHost": "https://app.ardoq.com",
    "orgLabel": "myorg",
    "isActive": false,
    "isTested": true,
    "testPassed": true,
    "testError": null
  }
}
```

**Note:** This endpoint updates the configuration's test status (`isTested`, `testPassed`, `testError`) in the database.

#### List Configurations

Get all saved Ardoq configurations.

**Endpoint:** `GET /api/ardoq/configurations`

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "config-1234567890-abc123",
      "name": "Production Ardoq",
      "apiHost": "https://app.ardoq.com",
      "orgLabel": "myorg",
      "isActive": true,
      "isTested": true,
      "testPassed": true,
      "testError": null,
      "createdAt": "2024-01-01T12:00:00.000Z",
      "updatedAt": "2024-01-01T12:00:00.000Z"
    },
    {
      "id": "config-0987654321-xyz789",
      "name": "Development Ardoq",
      "apiHost": "https://dev.ardoq.com",
      "orgLabel": "devorg",
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

**Endpoint:** `GET /api/ardoq/configurations/active`

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "config-1234567890-abc123",
    "name": "Production Ardoq",
    "apiHost": "https://app.ardoq.com",
    "orgLabel": "myorg",
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

**Endpoint:** `GET /api/ardoq/configurations/:id`

**Response:** Same format as active configuration

#### Update Configuration

Update an existing configuration.

**Endpoint:** `PUT /api/ardoq/configurations/:id`

**Request Body:**

```json
{
  "name": "Updated Configuration Name",  // Optional
  "apiToken": "new_token",                // Optional - if updated, test status will be reset
  "apiHost": "https://new.ardoq.com",    // Optional
  "orgLabel": "neworg",                  // Optional
  "isActive": true                       // Optional, setting to true will deactivate others (only if test passed)
}
```

**Response:** Updated configuration object with test status fields

**Note:** If `apiToken` is updated, the test status (`isTested`, `testPassed`, `testError`) will be reset. You'll need to test the configuration again before it can be used.

#### Delete Configuration

Delete a saved configuration.

**Endpoint:** `DELETE /api/ardoq/configurations/:id`

**Response:**

```json
{
  "success": true,
  "message": "Configuration deleted successfully"
}
```

#### Activate Configuration

Set a configuration as the active one (will deactivate all others). Only configurations that have passed the test can be activated.

**Endpoint:** `POST /api/ardoq/configurations/:id/activate`

**Response:** Activated configuration object

**Error Response (if test not passed):**

```json
{
  "success": false,
  "error": "Configuration must pass the connection test before it can be activated"
}
```

**Note:**

- All other Ardoq API endpoints now support an optional `configId` query parameter to use a specific saved configuration. If not provided, they will use the active configuration or fall back to environment variables.
- **Important:** Only configurations with `testPassed: true` can be used for API requests. Attempting to use an untested or failed configuration will result in an error.

### Workspace Endpoints

#### List All Workspaces

Get all workspaces available in your Ardoq instance.

**Endpoint:** `GET /api/ardoq/workspaces?configId=<id>`

**Query Parameters:**

- `configId` (optional): Use a specific saved configuration

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "workspace-123",
      "name": "My Workspace",
      ...
    }
  ]
}
```

#### Get Workspace by ID

Get details about a specific workspace.

**Endpoint:** `GET /api/ardoq/workspaces/:id?configId=<id>`

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "workspace-123",
    "name": "My Workspace",
    ...
  }
}
```

#### Get Workspace Context

Get workspace context including component types, reference types, etc.

**Endpoint:** `GET /api/ardoq/workspaces/:id/context?configId=<id>`

**Response:**

```json
{
  "success": true,
  "data": {
    "componentTypes": [...],
    "referenceTypes": [...],
    ...
  }
}
```

### Component Endpoints

#### Get All Components in Workspace

Get all components for a specific workspace. This endpoint fetches all components using the Ardoq API's `/api/v2/components?rootWorkspace=:workspaceId` endpoint.

**Endpoint:** `GET /api/ardoq/workspaces/:workspaceId/components?configId=<id>`

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "component-123",
      "name": "Component Name",
      "type": "Domain",
      "parent": null,
      ...
    },
    ...
  ]
}
```

### Hierarchy Endpoints

The hierarchy endpoints follow a workflow: **Workspace → Domains → Initiatives → Hierarchy**

#### Get Domains

Get all domains in a workspace. Returns minimal data for dropdown usage.

**Endpoint:** `GET /api/ardoq/workspaces/:workspaceId/domains?configId=<id>`

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "domain-1",
      "name": "Domain 1",
      "type": "Domain"
    },
    {
      "id": "domain-2",
      "name": "Domain 2",
      "type": "Domain"
    }
  ]
}
```

#### Get Initiatives for Domain

Get all initiatives under a specific domain. Returns minimal data for dropdown usage.

**Endpoint:** `GET /api/ardoq/workspaces/:workspaceId/domains/:domainId/initiatives?configId=<id>`

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "initiative-1",
      "name": "Initiative 1",
      "type": "Initiative",
      "parent": "domain-1"
    },
    {
      "id": "initiative-2",
      "name": "Initiative 2",
      "type": "Initiative",
      "parent": "domain-1"
    }
  ]
}
```

#### Get Initiative Hierarchy

Get the complete hierarchy for a specific initiative. Returns Epics → Features → User Stories with full component data.

**Endpoint:** `GET /api/ardoq/workspaces/:workspaceId/initiatives/:initiativeId/hierarchy?configId=<id>`

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "initiative-1",
    "name": "Initiative 1",
    "type": "Initiative",
    "parent": "domain-1",
    "children": [
      {
        "_id": "epic-1",
        "name": "Epic 1",
        "type": "Epic",
        "parent": "initiative-1",
        "children": [
          {
            "_id": "feature-1",
            "name": "Feature 1",
            "type": "Feature",
            "parent": "epic-1",
            "children": [
              {
                "_id": "user-story-1",
                "name": "User Story 1",
                "type": "User Story",
                "parent": "feature-1"
              }
            ]
          }
        ]
      }
    ]
  }
}
```

## Workflow

The recommended workflow for accessing Ardoq data is:

1. **Select a Workspace**: Use `GET /api/ardoq/workspaces` to list available workspaces
2. **Get Domains**: Use `GET /api/ardoq/workspaces/:workspaceId/domains` to get all domains
3. **Select a Domain**: User chooses a domain from the list
4. **Get Initiatives**: Use `GET /api/ardoq/workspaces/:workspaceId/domains/:domainId/initiatives` to get initiatives for the selected domain
5. **Select an Initiative**: User chooses an initiative
6. **Get Hierarchy**: Use `GET /api/ardoq/workspaces/:workspaceId/initiatives/:initiativeId/hierarchy` to get the complete hierarchy (Epics → Features → User Stories)

## API Limitations

The Ardoq API has the following limitations that this integration respects:

- **Components**: Can only fetch all components for a workspace using `/api/v2/components?rootWorkspace=:workspaceId`. You cannot query specific component types or individual components by ID.
- **Filtering**: Component filtering by type must be done client-side after fetching all components.
- **CRUD Operations**: The Ardoq API does not support creating, updating, or deleting components through the REST API endpoints used by this integration.

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
- `401` - Unauthorized (invalid or expired API token)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error (server-side error)

**Example Error Response:**

```json
{
  "success": false,
  "error": "workspaceId query parameter is required"
}
```

---

## Usage Examples

### Using cURL

```bash
# Get all workspaces
curl -X GET "http://localhost:3000/api/ardoq/workspaces" \
  -H "Content-Type: application/json"

# Get all domains in a workspace
curl -X GET "http://localhost:3000/api/ardoq/workspaces/workspace-123/domains" \
  -H "Content-Type: application/json"

# Get initiatives for a domain
curl -X GET "http://localhost:3000/api/ardoq/workspaces/workspace-123/domains/domain-1/initiatives" \
  -H "Content-Type: application/json"

# Get initiative hierarchy
curl -X GET "http://localhost:3000/api/ardoq/workspaces/workspace-123/initiatives/initiative-1/hierarchy" \
  -H "Content-Type: application/json"
```

### Using JavaScript/TypeScript

```typescript
// Create a configuration
const createResponse = await fetch('http://localhost:3000/api/ardoq/configurations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'My Ardoq Config',
    apiToken: 'your_token',
    apiHost: 'https://app.ardoq.com',
    orgLabel: 'your_org'
  })
});
const { data: config } = await createResponse.json();

// Test a configuration
const testResponse = await fetch(
  `http://localhost:3000/api/ardoq/test-connection?configId=${config.configuration.id}`
);
const testResult = await testResponse.json();

// Fetch all domains
const domainsResponse = await fetch('http://localhost:3000/api/ardoq/workspaces/workspace-123/domains');
const { data: domains } = await domainsResponse.json();

// Fetch initiatives for a domain
const initiativesResponse = await fetch(
  'http://localhost:3000/api/ardoq/workspaces/workspace-123/domains/domain-1/initiatives'
);
const { data: initiatives } = await initiativesResponse.json();

// Fetch initiative hierarchy
const hierarchyResponse = await fetch(
  'http://localhost:3000/api/ardoq/workspaces/workspace-123/initiatives/initiative-1/hierarchy'
);
const { data: hierarchy } = await hierarchyResponse.json();
```

### Using Axios

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api/ardoq',
});

// Create a configuration
const { data: config } = await api.post('/configurations', {
  name: 'My Ardoq Config',
  apiToken: 'your_token',
  apiHost: 'https://app.ardoq.com',
  orgLabel: 'your_org'
});

// Test a configuration
const { data: testResult } = await api.get('/test-connection', {
  params: { configId: config.data.configuration.id }
});

// Get domains
const { data: domains } = await api.get('/workspaces/workspace-123/domains');

// Get initiatives
const { data: initiatives } = await api.get(
  '/workspaces/workspace-123/domains/domain-1/initiatives'
);

// Get hierarchy
const { data: hierarchy } = await api.get(
  '/workspaces/workspace-123/initiatives/initiative-1/hierarchy'
);
```

---

## Implementation Details

### Parent-Child Relationship Detection

The hierarchy endpoints use a two-step approach to detect parent-child relationships:

1. **Direct Field Check**: Checks if components have a `parentId` field directly
2. **Reference Check**: Analyzes Ardoq references to find parent-child relationships
   - Supports common reference types: "contains", "parent", "child"
   - Checks for references where `source` is the parent and `target` is the child

### Component Type Assumptions

The implementation assumes the following component types in your Ardoq workspace:

- `Domain` - Top-level domain components
- `Initiative` - Initiatives under domains
- `Epic` - Epics under initiatives
- `Feature` - Features under epics
- `User Story` - User stories under features

If your Ardoq setup uses different type names, you may need to adjust the type filters in the controller code.

### Data Structure

The hierarchy endpoint returns a nested tree structure:

```
Initiative
  └── Epics[]
      └── Features[]
          └── User Stories[]
              └── (with all User Story fields)
```

Each node includes:

- `id` - Component ID
- `name` - Component name
- `type` - Component type (epic, feature, user_story)
- `parentId` - Parent component ID (for tree reconstruction)
- `children` - Array of child nodes (if any)
- Additional fields for User Stories (as listed above)

---

## Testing

### Test Configuration Management

1. Start the server:

   ```bash
   npm run dev
   ```

2. Create a configuration:

   ```bash
   curl -X POST http://localhost:3000/api/ardoq/configurations \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test Configuration",
       "apiToken": "your_token_here",
       "apiHost": "https://app.ardoq.com",
       "orgLabel": "your_org"
     }'
   ```

3. Test an existing configuration:

   ```bash
   curl "http://localhost:3000/api/ardoq/test-connection?configId=config-xxx"
   ```

### Test Hierarchy Endpoints

1. Get your workspace ID from Ardoq
2. Test domains endpoint:

   ```bash
   curl "http://localhost:3000/api/ardoq/workspaces/YOUR_WORKSPACE_ID/domains"
   ```

3. Test initiatives endpoint with a domain ID:

   ```bash
   curl "http://localhost:3000/api/ardoq/workspaces/YOUR_WORKSPACE_ID/domains/YOUR_DOMAIN_ID/initiatives"
   ```

4. Test hierarchy endpoint with an initiative ID:

   ```bash
   curl "http://localhost:3000/api/ardoq/workspaces/YOUR_WORKSPACE_ID/initiatives/YOUR_INITIATIVE_ID/hierarchy"
   ```

---

## Troubleshooting

### Common Issues

**401 Unauthorized Error:**

- Check that `ARDOQ_API_TOKEN` is set correctly
- Verify the token hasn't expired
- Ensure the token has the necessary permissions

**404 Not Found:**

- Verify the workspace ID exists
- Check that component IDs are correct
- Ensure you have access to the workspace

**Empty Results:**

- Verify component types match exactly (case-sensitive)
- Check that parent-child relationships are properly configured in Ardoq
- Ensure references exist between components

**Missing Fields:**

- Verify that User Story fields exist in your Ardoq metamodel
- Check field names match exactly (case-sensitive)

### Debug Mode

Enable debug logging by setting `NODE_ENV=development` in your `.env` file. This will log all Ardoq API requests to the console.

---

## References

- [Ardoq Developer Portal](https://developer.ardoq.com/)
- [Making a Request](https://developer.ardoq.com/getting-started/making_a_simple_request/)
- [Generating an API Token](https://developer.ardoq.com/getting-started/generating-an-api-token/)
- [Components API](https://developer.ardoq.com/api-guides/components-api/)
- [References API](https://developer.ardoq.com/api-guides/references-api/)

---

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review the Ardoq API documentation
3. Verify your Ardoq workspace configuration
4. Check server logs for detailed error messages
