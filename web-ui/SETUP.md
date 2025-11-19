# Maester Web UI Setup Guide

This guide will help you get the Maester Web UI up and running in both local development and production environments.

## Quick Start (Docker - Recommended)

The fastest way to get started is using Docker Compose:

```bash
cd web-ui
docker-compose up -d
```

This will start:
- **Azurite** (Azure Storage emulator) on port 10000
- **Maester Web UI** on port 3001

Access the application at: `http://localhost:3001`

### Quick Start Script

Use the provided script for an easier startup:

```bash
cd web-ui
./scripts/start-local.sh
```

## Prerequisites

### For Docker Setup
- Docker Desktop or Docker Engine
- Docker Compose

### For Manual Setup
- Node.js 18 or higher
- npm or yarn
- PowerShell 7+ (`pwsh`)
- Maester PowerShell module

## Detailed Setup Instructions

### 1. Local Development (Manual)

#### Step 1: Install Maester PowerShell Module

```bash
pwsh -Command "Install-Module -Name Maester -Scope CurrentUser -Force"
```

Verify installation:
```bash
pwsh -Command "Get-Module -ListAvailable Maester"
```

#### Step 2: Start Azurite

**Option A: Using Docker**
```bash
docker run -d \
  --name azurite \
  -p 10000:10000 \
  -p 10001:10001 \
  -p 10002:10002 \
  mcr.microsoft.com/azure-storage/azurite
```

**Option B: Using npm**
```bash
npm install -g azurite
azurite --silent --location /tmp/azurite
```

#### Step 3: Install Dependencies

```bash
# Install server dependencies
cd web-ui
npm install

# Install client dependencies
cd client
npm install
cd ..
```

#### Step 4: Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env if needed (defaults work for local development)
```

#### Step 5: Start Development Servers

**Terminal 1 - Backend Server:**
```bash
cd web-ui
npm run dev
```

**Terminal 2 - Frontend Dev Server:**
```bash
cd web-ui/client
npm run dev
```

Access the application:
- Frontend: `http://localhost:3000` (with hot reload)
- Backend API: `http://localhost:3001/api`

### 2. Production Deployment

#### Prerequisites
- Azure subscription
- Azure Storage account
- Hosting service with Managed Identity support (App Service, Container Instance, AKS, etc.)

#### Step 1: Create Azure Resources

```bash
# Set variables
RESOURCE_GROUP="maester-rg"
LOCATION="eastus"
STORAGE_ACCOUNT="maesterreports$(date +%s)"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create storage account
az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS \
  --min-tls-version TLS1_2
```

#### Step 2: Build Docker Image

```bash
cd web-ui
docker build -t maester-web-ui:latest .
```

#### Step 3: Deploy to Azure Container Instances (Example)

```bash
# Create container instance with managed identity
az container create \
  --name maester-web-ui \
  --resource-group $RESOURCE_GROUP \
  --image maester-web-ui:latest \
  --cpu 2 \
  --memory 4 \
  --ip-address Public \
  --ports 3001 \
  --environment-variables \
    NODE_ENV=production \
    USE_AZURITE=false \
    STORAGE_ACCOUNT_NAME=$STORAGE_ACCOUNT \
    STORAGE_CONTAINER_NAME=maester-reports \
  --assign-identity --scope /subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP
```

#### Step 4: Configure Managed Identity Permissions

```bash
# Get the managed identity principal ID
PRINCIPAL_ID=$(az container show \
  --name maester-web-ui \
  --resource-group $RESOURCE_GROUP \
  --query identity.principalId -o tsv)

# Assign Storage Blob Data Contributor role
az role assignment create \
  --assignee $PRINCIPAL_ID \
  --role "Storage Blob Data Contributor" \
  --scope /subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Storage/storageAccounts/$STORAGE_ACCOUNT
```

### 3. Azure App Service Deployment

#### Step 1: Create App Service Plan

```bash
az appservice plan create \
  --name maester-plan \
  --resource-group $RESOURCE_GROUP \
  --is-linux \
  --sku B2
```

#### Step 2: Create Web App

```bash
az webapp create \
  --name maester-web-ui \
  --resource-group $RESOURCE_GROUP \
  --plan maester-plan \
  --deployment-container-image-name maester-web-ui:latest
```

#### Step 3: Enable Managed Identity

```bash
az webapp identity assign \
  --name maester-web-ui \
  --resource-group $RESOURCE_GROUP
```

#### Step 4: Configure App Settings

```bash
az webapp config appsettings set \
  --name maester-web-ui \
  --resource-group $RESOURCE_GROUP \
  --settings \
    NODE_ENV=production \
    USE_AZURITE=false \
    STORAGE_ACCOUNT_NAME=$STORAGE_ACCOUNT \
    STORAGE_CONTAINER_NAME=maester-reports \
    PORT=3001
```

#### Step 5: Assign Storage Permissions

```bash
PRINCIPAL_ID=$(az webapp identity show \
  --name maester-web-ui \
  --resource-group $RESOURCE_GROUP \
  --query principalId -o tsv)

az role assignment create \
  --assignee $PRINCIPAL_ID \
  --role "Storage Blob Data Contributor" \
  --scope /subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Storage/storageAccounts/$STORAGE_ACCOUNT
```

## Authentication Setup (Optional but Recommended)

The Web UI does not include authentication by default. For production use, implement authentication:

### Option 1: Azure AD Authentication

1. Register an Azure AD application
2. Add authentication middleware to the server
3. Configure redirect URIs

See [SECURITY.md](SECURITY.md) for implementation details.

### Option 2: API Key Authentication

1. Generate a secure API key
2. Store in Azure Key Vault
3. Implement API key validation middleware

### Option 3: Network-Level Security

- Use Azure Private Link
- Deploy behind Azure Front Door
- Configure IP restrictions

## Connecting to Microsoft 365

Before running tests, you need to authenticate with Microsoft 365:

### Interactive Authentication (Development)

The application will prompt for authentication when running tests. Make sure you have:

1. Appropriate Microsoft 365 permissions
2. MFA configured if required
3. Conditional Access policies allow the connection

### Service Principal Authentication (Production)

For automated testing in production:

1. Create a service principal with required permissions
2. Configure certificate or secret authentication
3. Update the Maester service to use non-interactive authentication

Example PowerShell configuration:
```powershell
Connect-MgGraph -ClientId $clientId -TenantId $tenantId -CertificateThumbprint $thumbprint
```

## Verification

### Health Check

```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Test Report Storage

1. Access the dashboard at `http://localhost:3001`
2. Click "Run Tests" (note: requires Microsoft 365 authentication)
3. Monitor test progress
4. View the generated report
5. Check report appears in "Report History"

### Verify Azure Storage

```bash
# List blobs in container
az storage blob list \
  --account-name $STORAGE_ACCOUNT \
  --container-name maester-reports \
  --output table
```

## Troubleshooting

### Issue: "Cannot connect to Azurite"

**Solution:**
```bash
# Check if Azurite is running
docker ps | grep azurite

# Restart Azurite
docker restart azurite

# Or start with docker-compose
docker-compose up -d azurite
```

### Issue: "PowerShell module not found"

**Solution:**
```bash
# Install Maester module
pwsh -Command "Install-Module -Name Maester -Scope CurrentUser -Force"

# Verify installation
pwsh -Command "Get-Module -ListAvailable Maester"
```

### Issue: "Authentication failed when running tests"

**Solution:**
1. Ensure you have Microsoft 365 credentials
2. Check conditional access policies
3. Verify MFA is properly configured
4. Try running Maester directly first:
   ```bash
   pwsh -Command "Connect-Maester; Invoke-Maester"
   ```

### Issue: "Cannot upload to Azure Storage"

**Solution:**
1. Verify managed identity is assigned
2. Check role assignment:
   ```bash
   az role assignment list --assignee $PRINCIPAL_ID
   ```
3. Ensure "Storage Blob Data Contributor" role is assigned
4. Check storage account firewall rules

### Issue: "Docker build fails"

**Solution:**
```bash
# Clean Docker cache
docker builder prune -a

# Rebuild with no cache
docker build --no-cache -t maester-web-ui:latest .
```

## Monitoring

### View Logs

**Docker Compose:**
```bash
docker-compose logs -f web-ui
```

**Docker Container:**
```bash
docker logs -f maester-web-ui
```

**Azure Container Instance:**
```bash
az container logs --name maester-web-ui --resource-group $RESOURCE_GROUP --follow
```

### Application Insights (Recommended for Production)

Add Application Insights for comprehensive monitoring:

1. Create Application Insights resource
2. Add instrumentation key to environment variables
3. Install `applicationinsights` npm package
4. Configure in `server/index.js`

## Updating

### Update PowerShell Module

```bash
pwsh -Command "Update-Module -Name Maester -Force"
```

### Update Dependencies

```bash
cd web-ui
npm update

cd client
npm update
```

### Update Docker Image

```bash
cd web-ui
docker-compose down
docker-compose pull
docker-compose up -d
```

## Support

For issues and questions:
- GitHub Issues: [maester365/maester](https://github.com/maester365/maester/issues)
- Documentation: [maester.dev](https://maester.dev)

## Next Steps

1. Review [SECURITY.md](SECURITY.md) for security best practices
2. Configure authentication for production use
3. Set up monitoring and alerting
4. Configure backup and disaster recovery
5. Implement custom branding (optional)
