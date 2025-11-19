# Maester Web UI

A persistent web UI wrapper for the Maester PowerShell CLI tool. This application provides a user-friendly interface to run Maester security tests on Microsoft 365 environments and manage report history stored in Azure Blob Storage.

## Features

- **Run Security Tests**: Execute Maester tests through a web interface with configurable options
- **Report History**: Browse and access all previous test reports
- **Latest Report**: Quick access to the most recent test report
- **Azure Storage Integration**: Reports are stored in Azure Blob Storage with support for:
  - Managed Identity authentication for production
  - Azurite emulator for local development
- **Security-First Design**:
  - Helmet.js for security headers
  - Rate limiting to prevent abuse
  - CORS configuration
  - Input validation and sanitization
  - Managed Identity for secure Azure access

## Architecture

### Backend (Node.js/Express)
- **Express Server**: RESTful API for managing tests and reports
- **Storage Service**: Azure Blob Storage integration with Managed Identity
- **Maester Service**: PowerShell execution wrapper for running tests

### Frontend (React)
- **Dashboard**: Run new tests and quick access to latest report
- **Reports Page**: Browse all report history
- **Report Viewer**: Embedded HTML report viewer

## Prerequisites

- Node.js 18 or higher
- PowerShell 7+ (pwsh)
- Maester PowerShell module
- Docker and Docker Compose (for containerized deployment)
- Azure Storage account (for production) or Azurite (for local dev)

## Local Development Setup

### Option 1: Using Docker Compose (Recommended)

1. Clone the repository and navigate to the web-ui directory:
```bash
cd web-ui
```

2. Start the services:
```bash
docker-compose up -d
```

This will start:
- Azurite (Azure Storage emulator) on port 10000
- Maester Web UI on port 3001

3. Access the application at `http://localhost:3001`

### Option 2: Manual Setup

1. Install dependencies:
```bash
# Install server dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

2. Start Azurite (Azure Storage Emulator):
```bash
# Using Docker
docker run -p 10000:10000 -p 10001:10001 -p 10002:10002 \
  mcr.microsoft.com/azure-storage/azurite

# Or install globally with npm
npm install -g azurite
azurite --silent --location /tmp/azurite --debug /tmp/azurite/debug.log
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env as needed
```

4. Install Maester PowerShell module:
```bash
pwsh -Command "Install-Module -Name Maester -Scope CurrentUser -Force"
```

5. Start the development servers:
```bash
# Terminal 1: Start backend server
npm run dev

# Terminal 2: Start frontend development server
npm run client
```

6. Access the application:
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:3001/api`

## Production Deployment

### Azure Configuration

1. **Create Azure Storage Account**:
```bash
az storage account create \
  --name <storage-account-name> \
  --resource-group <resource-group> \
  --location <location> \
  --sku Standard_LRS
```

2. **Enable Managed Identity** on your hosting service (App Service, Container Instance, etc.):
```bash
az webapp identity assign \
  --name <app-name> \
  --resource-group <resource-group>
```

3. **Grant Storage Permissions**:
```bash
# Get the principal ID from managed identity
PRINCIPAL_ID=$(az webapp identity show \
  --name <app-name> \
  --resource-group <resource-group> \
  --query principalId -o tsv)

# Assign Storage Blob Data Contributor role
az role assignment create \
  --assignee $PRINCIPAL_ID \
  --role "Storage Blob Data Contributor" \
  --scope /subscriptions/<subscription-id>/resourceGroups/<resource-group>/providers/Microsoft.Storage/storageAccounts/<storage-account-name>
```

4. **Configure Environment Variables**:
```bash
USE_AZURITE=false
STORAGE_ACCOUNT_NAME=<your-storage-account-name>
STORAGE_CONTAINER_NAME=maester-reports
NODE_ENV=production
```

### Docker Deployment

1. Build the Docker image:
```bash
docker build -t maester-web-ui .
```

2. Run the container:
```bash
docker run -d \
  -p 3001:3001 \
  -e USE_AZURITE=false \
  -e STORAGE_ACCOUNT_NAME=<your-storage-account-name> \
  -e NODE_ENV=production \
  --name maester-web-ui \
  maester-web-ui
```

## API Endpoints

### Health
- `GET /api/health` - Health check endpoint

### Reports
- `GET /api/reports` - List all reports
- `GET /api/reports/latest` - Get latest report metadata
- `GET /api/reports/:reportId` - Get specific report metadata
- `GET /api/reports/:reportId/download` - Download report HTML

### Test Execution
- `POST /api/run-test` - Start a new test run
  ```json
  {
    "tags": ["CA", "App"],
    "includeLongRunning": false,
    "includePreview": false
  }
  ```
- `GET /api/test-status/:jobId` - Check test execution status

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | `3001` | No |
| `NODE_ENV` | Environment | `development` | No |
| `USE_AZURITE` | Use local Azurite | `true` | No |
| `AZURITE_CONNECTION_STRING` | Azurite connection string | See .env.example | Yes (local) |
| `STORAGE_ACCOUNT_NAME` | Azure Storage account name | - | Yes (prod) |
| `STORAGE_CONTAINER_NAME` | Container name | `maester-reports` | No |
| `OUTPUT_DIR` | Temp directory for reports | `./temp/test-results` | No |
| `ALLOWED_ORIGINS` | CORS allowed origins | `http://localhost:3000` | No |

## Security Considerations

1. **Authentication**: The current implementation does not include authentication. For production use, consider implementing:
   - Azure AD authentication
   - API keys or tokens
   - IP whitelisting

2. **Managed Identity**: Always use Managed Identity in production to avoid storing credentials

3. **Rate Limiting**: Configured to allow 100 requests per 15 minutes per IP

4. **Security Headers**: Helmet.js is configured with strict CSP and other security headers

5. **Input Validation**: All user inputs are validated and sanitized

6. **CORS**: Configure `ALLOWED_ORIGINS` to restrict access to trusted domains

## Troubleshooting

### PowerShell Module Issues
```bash
# Verify Maester is installed
pwsh -Command "Get-Module -ListAvailable Maester"

# Reinstall if needed
pwsh -Command "Install-Module -Name Maester -Scope CurrentUser -Force"
```

### Azure Storage Connection Issues
```bash
# Test Azurite connection
curl http://localhost:10000/devstoreaccount1?restype=account&comp=properties

# Check container exists
az storage container show \
  --name maester-reports \
  --account-name <storage-account-name>
```

### Docker Issues
```bash
# View logs
docker-compose logs -f web-ui

# Restart services
docker-compose restart

# Rebuild containers
docker-compose up -d --build
```

## Development

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Building for Production
```bash
# Build client
cd client
npm run build

# The server will serve the built files from client/build
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: [maester365/maester](https://github.com/maester365/maester/issues)
- Documentation: [maester.dev](https://maester.dev)
