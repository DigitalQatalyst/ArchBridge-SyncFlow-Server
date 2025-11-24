# ArchBridge SyncFlow Server

A server application providing integrations with various enterprise tools and platforms, including Ardoq and Azure DevOps.

## Overview

The ArchBridge SyncFlow Server provides REST API endpoints for integrating with external services. Currently supported integrations:

- **Ardoq**: Enterprise architecture management platform integration
- **Azure DevOps**: Microsoft Azure DevOps integration with Personal Access Token (PAT) authentication

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account and project
- Environment variables configured (see below)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/DigitalQatalyst/ArchBridge-SyncFlow-Server.git
cd ArchBridge-SyncFlow-Server
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the project root:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Optional: Environment variable fallbacks for integrations
# These are only used if no active configuration is set via API
ARDOQ_API_TOKEN=your_ardoq_token
ARDOQ_API_HOST=https://app.ardoq.com
ARDOQ_ORG_LABEL=your_org_label

AZURE_DEVOPS_PAT_TOKEN=your_pat_token
AZURE_DEVOPS_ORGANIZATION=your_organization
```

4. Set up the database:

   - Run the SQL migration files in your Supabase SQL Editor:
     - `supabase-migration.sql` - Creates Ardoq configurations table
     - `supabase-azure-devops-migration.sql` - Creates Azure DevOps configurations table

5. Start the development server:

```bash
npm run dev
```

The server will start on `http://localhost:3000` (or the port specified in your environment).

## API Documentation

### Base URL

All API endpoints are prefixed with `/api`.

### Available Integrations

#### Ardoq Integration

Comprehensive integration with the Ardoq REST API for managing workspaces, components, and hierarchical data structures.

**Documentation**: See [docs/ardoq.md](./docs/ardoq.md) for complete documentation.

**Key Features:**
- Configuration management with connection testing
- Workspace and component access
- Hierarchical data retrieval (Domains → Initiatives → Epics → Features → User Stories)

**Quick Example:**

```bash
# Create an Ardoq configuration
curl -X POST http://localhost:3000/api/ardoq/configurations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Ardoq Config",
    "apiToken": "your_token",
      "apiHost": "https://app.ardoq.com",
    "orgLabel": "your_org"
  }'
```

#### Azure DevOps Integration

Integration with Azure DevOps REST API using Personal Access Token (PAT) authentication.

**Documentation**: See [docs/azure-devops.md](./docs/azure-devops.md) for complete documentation.

**Key Features:**
- PAT-based authentication
- Configuration management with connection testing
- User profile verification

**Quick Example:**

```bash
# Create an Azure DevOps configuration
curl -X POST http://localhost:3000/api/azure-devops/configurations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Azure DevOps Config",
    "organization": "mycompany",
    "patToken": "your_pat_token"
  }'
```

### API Endpoints Overview

Visit `http://localhost:3000/api` for a complete list of available endpoints.

## Configuration Management

Both integrations support configuration management through the API:

1. **Create Configuration**: POST to `/api/{integration}/configurations`
   - Automatically tests the connection during creation
   - Configurations can be saved even if the test fails
   - Only configurations with `testPassed: true` can be activated

2. **Test Connection**: GET `/api/{integration}/test-connection?configId=xxx`
   - Tests an existing configuration
   - Updates test status in the database

3. **List Configurations**: GET `/api/{integration}/configurations`
   - Returns all saved configurations (tokens are never exposed)

4. **Activate Configuration**: POST `/api/{integration}/configurations/:id/activate`
   - Sets a configuration as active (only if test passed)
   - Only one active configuration per integration at a time

## Project Structure

```
ArchBridge-SyncFlow-Server/
├── src/
│   ├── controllers/          # Request handlers
│   │   ├── ardoq/           # Ardoq controllers
│   │   └── azureDevOps/     # Azure DevOps controllers
│   ├── services/            # Business logic and API clients
│   ├── routes/              # Express route definitions
│   ├── types/               # TypeScript type definitions
│   ├── db/                  # Database configuration
│   └── middleware/          # Express middleware
├── docs/                    # Documentation
│   ├── ardoq.md            # Ardoq integration documentation
│   ├── azure-devops.md     # Azure DevOps integration documentation
│   └── syncing-progress.md # Work items syncing progress documentation
├── supabase-migration.sql   # Ardoq database migration
├── supabase-azure-devops-migration.sql  # Azure DevOps database migration
└── README.md               # This file
```

## Development

### Running the Server

```bash
# Development mode with hot reload
npm run dev

# Production mode
npm start

# Build TypeScript
npm run build
```

### Environment Variables

Required environment variables:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

Optional environment variables (used as fallback if no active configuration is set):

- `ARDOQ_API_TOKEN`: Ardoq API token
- `ARDOQ_API_HOST`: Ardoq API host (defaults to https://app.ardoq.com)
- `ARDOQ_ORG_LABEL`: Ardoq organization label
- `AZURE_DEVOPS_PAT_TOKEN`: Azure DevOps PAT token
- `AZURE_DEVOPS_ORGANIZATION`: Azure DevOps organization name

## Database Setup

The application uses Supabase (PostgreSQL) for storing configuration data. Run the following SQL migration files in your Supabase SQL Editor:

1. `supabase-migration.sql` - Creates the `ardoq_configurations` table
2. `supabase-azure-devops-migration.sql` - Creates the `azure_devops_configurations` table

Both tables include:
- Configuration storage with encrypted token fields
- Test status tracking
- Active configuration management
- Automatic timestamp updates

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message description"
}
```

Common HTTP status codes:
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `409` - Conflict (duplicate configuration)
- `500` - Internal Server Error

## Security

- **Token Storage**: API tokens and PAT tokens are stored securely in Supabase
- **Token Exposure**: Tokens are never exposed in API responses
- **Authentication**: All integrations use secure authentication methods (Bearer tokens, Basic auth with PAT)
- **Validation**: All inputs are validated before processing

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

[Add your license information here]

## Support

For detailed documentation on each integration:

- [Ardoq Integration Documentation](./docs/ardoq.md)
- [Azure DevOps Integration Documentation](./docs/azure-devops.md)
- [Syncing Progress Documentation](./docs/syncing-progress.md) - How work items syncing works with real-time progress updates

For issues or questions, please check the troubleshooting sections in the respective documentation files or open an issue on GitHub.
