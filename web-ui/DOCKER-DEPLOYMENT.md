# Docker Deployment Guide for Maester Web UI

This guide covers deploying the Maester Web UI using Docker in various environments: local development, production, and Azure Container Apps.

## Overview

The Maester Web UI provides three Docker configurations:

1. **`Dockerfile`** - Production-ready build with Ubuntu base and all PowerShell modules
2. **`Dockerfile.local`** - Optimized for local development with Alpine base
3. **`Dockerfile.azure`** - Optimized for Azure Container Apps with enhanced security

## Quick Start - Local Development

### Using Docker Compose (Recommended)

```bash
# Navigate to web-ui directory
cd web-ui

# Start all services (Azurite + Web UI)
docker-compose up -d

# Or use the local development configuration
docker-compose -f docker-compose.local.yml up -d

# View logs
docker-compose logs -f web-ui

# Stop services
docker-compose down
```

Access the application at: `http://localhost:3001`

### Using Docker CLI

```bash
cd web-ui

# Build the image
docker build -f Dockerfile.local -t maester-web-ui:local .

# Run Azurite (Azure Storage Emulator)
docker run -d --name azurite \
  -p 10000:10000 -p 10001:10001 -p 10002:10002 \
  mcr.microsoft.com/azure-storage/azurite

# Run the Web UI
docker run -d --name maester-web-ui \
  -p 3001:3001 \
  -e USE_AZURITE=true \
  -e AZURITE_CONNECTION_STRING="DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://host.docker.internal:10000/devstoreaccount1;" \
  --add-host=host.docker.internal:host-gateway \
  maester-web-ui:local
```

## Production Deployment

### Building Production Image

```bash
cd web-ui

# Build the production image
docker build -t maester-web-ui:latest .

# Or build with a specific tag
docker build -t myregistry.azurecr.io/maester-web-ui:v1.0.0 .
```

### Running Production Container

```bash
docker run -d --name maester-web-ui \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e USE_AZURITE=false \
  -e STORAGE_ACCOUNT_NAME=<your-storage-account> \
  -e STORAGE_CONTAINER_NAME=maester-reports \
  -e ALLOWED_ORIGINS=https://yourdomain.com \
  --restart unless-stopped \
  maester-web-ui:latest
```

**Important:** For production, ensure:
- Use Managed Identity or proper authentication for Azure Storage
- Set appropriate CORS origins
- Enable HTTPS
- Implement authentication (not included by default)

## Azure Container Apps Deployment

Azure Container Apps provides a managed container hosting service with built-in scaling, ingress, and monitoring.

### Prerequisites

1. Azure CLI installed and logged in
2. Azure Container Registry (ACR) or other container registry
3. Azure Storage Account
4. Azure Container Apps Environment

### Step 1: Build and Push Image

```bash
# Login to Azure Container Registry
az acr login --name <your-registry-name>

# Build for Azure Container Apps
cd web-ui
docker build -f Dockerfile.azure -t <your-registry>.azurecr.io/maester-web-ui:latest .

# Push to registry
docker push <your-registry>.azurecr.io/maester-web-ui:latest
```

### Step 2: Create Azure Resources

```bash
# Set variables
RESOURCE_GROUP="maester-rg"
LOCATION="eastus"
STORAGE_ACCOUNT="maesterstore$(date +%s)"
CONTAINER_ENV="maester-env"
APP_NAME="maester-web-ui"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create storage account
az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS \
  --min-tls-version TLS1_2

# Create container apps environment
az containerapp env create \
  --name $CONTAINER_ENV \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION
```

### Step 3: Deploy Container App

**Option A: Using Azure CLI**

```bash
az containerapp create \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --environment $CONTAINER_ENV \
  --image <your-registry>.azurecr.io/maester-web-ui:latest \
  --target-port 3001 \
  --ingress external \
  --cpu 1.0 \
  --memory 2Gi \
  --min-replicas 1 \
  --max-replicas 3 \
  --env-vars \
    NODE_ENV=production \
    USE_AZURITE=false \
    STORAGE_ACCOUNT_NAME=$STORAGE_ACCOUNT \
    STORAGE_CONTAINER_NAME=maester-reports \
    PORT=3001 \
  --registry-server <your-registry>.azurecr.io \
  --system-assigned
```

**Option B: Using YAML Configuration**

```bash
# Edit containerapp.yaml with your values
# Then deploy:
az containerapp create \
  --resource-group $RESOURCE_GROUP \
  --yaml containerapp.yaml
```

### Step 4: Configure Managed Identity

```bash
# Get the Container App's Managed Identity Principal ID
PRINCIPAL_ID=$(az containerapp show \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query identity.principalId -o tsv)

# Get Storage Account ID
STORAGE_ID=$(az storage account show \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --query id -o tsv)

# Assign Storage Blob Data Contributor role
az role assignment create \
  --assignee $PRINCIPAL_ID \
  --role "Storage Blob Data Contributor" \
  --scope $STORAGE_ID
```

### Step 5: Verify Deployment

```bash
# Get the application URL
APP_URL=$(az containerapp show \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query properties.configuration.ingress.fqdn -o tsv)

echo "Application URL: https://$APP_URL"

# Test health endpoint
curl https://$APP_URL/api/health
```

### Updating the Container App

```bash
# Build and push new image
docker build -f Dockerfile.azure -t <your-registry>.azurecr.io/maester-web-ui:v2 .
docker push <your-registry>.azurecr.io/maester-web-ui:v2

# Update container app
az containerapp update \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --image <your-registry>.azurecr.io/maester-web-ui:v2
```

## Docker Image Comparison

| Feature | Dockerfile | Dockerfile.local | Dockerfile.azure |
|---------|-----------|------------------|------------------|
| Base OS | Ubuntu 22.04 | Alpine 3.17 | Ubuntu 22.04 |
| Image Size | ~1.2 GB | ~800 MB | ~1.2 GB |
| PowerShell | 7.4 | LTS | 7.4 |
| Node.js | 18.x | 18.x | 18.x |
| Security | Standard | Standard | Enhanced (non-root) |
| Use Case | Production | Local Dev | Azure Container Apps |
| ARM64 Support | Yes | Limited | Yes |

## Environment Variables

### Required for All Deployments

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment | `production` or `development` |

### Storage Configuration (Production)

| Variable | Description | Example |
|----------|-------------|---------|
| `USE_AZURITE` | Use local emulator | `false` |
| `STORAGE_ACCOUNT_NAME` | Azure Storage account | `maesterstore123` |
| `STORAGE_CONTAINER_NAME` | Container name | `maester-reports` |

### Storage Configuration (Local)

| Variable | Description | Example |
|----------|-------------|---------|
| `USE_AZURITE` | Use local emulator | `true` |
| `AZURITE_CONNECTION_STRING` | Connection string | See `.env.example` |

### Optional Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `OUTPUT_DIR` | Temp directory | `./temp/test-results` |
| `ALLOWED_ORIGINS` | CORS origins | `http://localhost:3000` |

## Advanced Configuration

### Using Azure Container Registry with Managed Identity

```bash
# Enable admin user (for initial setup)
az acr update --name <registry-name> --admin-enabled true

# Get credentials
az acr credential show --name <registry-name>

# Configure Container App to use ACR with managed identity
az containerapp registry set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --server <registry-name>.azurecr.io \
  --identity system
```

### Custom Domain and HTTPS

```bash
# Add custom domain
az containerapp hostname add \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --hostname maester.yourdomain.com

# Bind certificate
az containerapp hostname bind \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --hostname maester.yourdomain.com \
  --certificate <cert-name>
```

### Scaling Configuration

```bash
# Configure autoscaling
az containerapp update \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --min-replicas 1 \
  --max-replicas 10 \
  --scale-rule-name http-rule \
  --scale-rule-type http \
  --scale-rule-http-concurrency 20
```

## Monitoring and Troubleshooting

### View Logs

```bash
# Docker Compose
docker-compose logs -f web-ui

# Docker
docker logs -f maester-web-ui

# Azure Container Apps
az containerapp logs show \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --follow
```

### Execute Commands in Container

```bash
# Docker
docker exec -it maester-web-ui /bin/bash

# Azure Container Apps
az containerapp exec \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --command /bin/bash
```

### Health Checks

```bash
# Local
curl http://localhost:3001/api/health

# Azure
curl https://$APP_URL/api/health
```

### Common Issues

#### Issue: Cannot connect to Azurite
**Solution:**
```bash
# Check if Azurite is running
docker ps | grep azurite

# Restart Azurite
docker restart azurite
```

#### Issue: PowerShell module not found
**Solution:** Rebuild the image - modules are installed during build
```bash
docker build --no-cache -t maester-web-ui:latest .
```

#### Issue: Container Apps deployment fails
**Solution:** Check logs and ensure:
- Image is pushed to ACR
- Managed Identity is configured
- Storage account permissions are set
- Environment variables are correct

## Security Best Practices

1. **Never commit secrets** - Use environment variables or Azure Key Vault
2. **Use Managed Identity** in Azure for authentication
3. **Enable HTTPS** for production deployments
4. **Implement authentication** - The app doesn't include auth by default
5. **Regular updates** - Keep base images and modules updated
6. **Network isolation** - Use Azure Virtual Networks for production
7. **Monitor access** - Enable Azure Monitor and Application Insights

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Deploy to Azure Container Apps

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Login to Azure
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      
      - name: Build and push image
        run: |
          az acr build \
            --registry ${{ secrets.ACR_NAME }} \
            --image maester-web-ui:${{ github.sha }} \
            --image maester-web-ui:latest \
            --file web-ui/Dockerfile.azure \
            web-ui
      
      - name: Deploy to Container Apps
        run: |
          az containerapp update \
            --name maester-web-ui \
            --resource-group ${{ secrets.RESOURCE_GROUP }} \
            --image ${{ secrets.ACR_NAME }}.azurecr.io/maester-web-ui:${{ github.sha }}
```

## Support

For issues and questions:
- GitHub Issues: [maester365/maester](https://github.com/maester365/maester/issues)
- Documentation: [maester.dev](https://maester.dev)
