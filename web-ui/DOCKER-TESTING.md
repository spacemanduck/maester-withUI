# Docker Build Testing and Validation

This document provides testing instructions for the Docker configurations.

## Pre-requisites

- Docker installed and running
- Docker Compose v2 (or docker compose)
- For Azure testing: Azure CLI and active subscription

## Local Testing

### Test 1: Validate Docker Compose Configurations

```bash
cd web-ui

# Validate main docker-compose.yml
docker compose -f docker-compose.yml config

# Validate local docker-compose.local.yml
docker compose -f docker-compose.local.yml config
```

**Expected Result:** Both commands should complete without errors.

### Test 2: Build Local Development Image

```bash
cd web-ui

# Using helper script
./scripts/build-docker.sh --type local

# Or manually
docker build -f Dockerfile.local -t maester-web-ui-local:test .
```

**Expected Result:** Build should complete successfully.

**Validation:**
```bash
# Check image was created
docker images | grep maester-web-ui-local

# Check image size (should be ~800MB for local)
docker images maester-web-ui-local:test --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
```

### Test 3: Build Production Image

```bash
cd web-ui

# Using helper script
./scripts/build-docker.sh --type production

# Or manually
docker build -f Dockerfile -t maester-web-ui:test .
```

**Expected Result:** Build should complete successfully.

**Validation:**
```bash
# Check image was created
docker images | grep maester-web-ui

# Check image size (should be ~1.2GB)
docker images maester-web-ui:test --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
```

### Test 4: Build Azure Container Apps Image

```bash
cd web-ui

# Using helper script
./scripts/build-docker.sh --type azure

# Or manually
docker build -f Dockerfile.azure -t maester-web-ui-azure:test .
```

**Expected Result:** Build should complete successfully.

### Test 5: Start Application with Docker Compose

```bash
cd web-ui

# Start services
docker compose up -d

# Check services are running
docker compose ps

# Wait for health checks (30-60 seconds)
sleep 60

# Check health endpoint
curl http://localhost:3001/api/health
```

**Expected Result:**
- All services should be running
- Health endpoint should return `{"status":"ok",...}`

**Validation:**
```bash
# View logs
docker compose logs web-ui

# Check Azurite is running
docker compose logs azurite
```

### Test 6: Test Application Functionality

```bash
# Test health endpoint
curl http://localhost:3001/api/health

# Test reports endpoint (should return empty array initially)
curl http://localhost:3001/api/reports

# Access UI in browser
# Open: http://localhost:3001
```

**Expected Results:**
- Health endpoint returns success
- Reports endpoint returns JSON array
- UI loads successfully in browser

### Test 7: Container Cleanup

```bash
cd web-ui

# Stop and remove containers
docker compose down

# Remove volumes (optional)
docker compose down -v

# Remove test images
docker rmi maester-web-ui-local:test maester-web-ui:test maester-web-ui-azure:test
```

## Production Testing

### Test 8: Run Production Container

```bash
cd web-ui

# Build production image
docker build -t maester-web-ui:prod .

# Run with minimal configuration
docker run -d \
  --name maester-test \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e USE_AZURITE=true \
  -e AZURITE_CONNECTION_STRING="DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://host.docker.internal:10000/devstoreaccount1;" \
  --add-host=host.docker.internal:host-gateway \
  maester-web-ui:prod

# Wait for startup
sleep 30

# Check logs
docker logs maester-test

# Test health
curl http://localhost:3001/api/health

# Cleanup
docker stop maester-test
docker rm maester-test
```

### Test 9: Verify PowerShell Modules

```bash
# Start a temporary container
docker run --rm -it maester-web-ui:prod pwsh

# In PowerShell, run:
Get-Module -ListAvailable | Where-Object {$_.Name -match "Maester|Pester|Az.Accounts|Microsoft.Graph"}

# Exit PowerShell
exit
```

**Expected Result:** Should list Maester, Pester, Az.Accounts, and Microsoft.Graph.Authentication modules.

## Azure Container Apps Testing

### Test 10: Validate Azure Configuration Files

```bash
cd web-ui

# Check containerapp.yaml syntax
cat containerapp.yaml

# Check Bicep template (requires Azure CLI)
az bicep build --file azure-deploy.bicep --stdout
```

**Expected Result:** Files should be syntactically correct.

### Test 11: Deploy to Azure (Integration Test)

**Prerequisites:**
- Azure subscription
- Azure CLI installed and logged in
- Container registry (ACR)

```bash
cd web-ui

# Set variables
RESOURCE_GROUP="maester-test-rg"
LOCATION="eastus"
REGISTRY_NAME="maestertestacr$(date +%s)"
IMAGE_NAME="$REGISTRY_NAME.azurecr.io/maester-web-ui:test"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create container registry
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $REGISTRY_NAME \
  --sku Basic

# Build and push image
az acr build \
  --registry $REGISTRY_NAME \
  --image maester-web-ui:test \
  --file Dockerfile.azure \
  .

# Deploy using helper script
./scripts/deploy-azure.sh \
  --resource-group $RESOURCE_GROUP \
  --image $IMAGE_NAME \
  --app-name maester-test

# Get app URL
APP_URL=$(az containerapp show \
  --name maester-test \
  --resource-group $RESOURCE_GROUP \
  --query properties.configuration.ingress.fqdn -o tsv)

echo "App URL: https://$APP_URL"

# Test health endpoint
curl https://$APP_URL/api/health

# Cleanup (when done testing)
az group delete --name $RESOURCE_GROUP --yes --no-wait
```

### Test 12: Deploy with Bicep

```bash
cd web-ui

# Set variables
RESOURCE_GROUP="maester-bicep-test"
LOCATION="eastus"
REGISTRY_NAME="maestertestacr$(date +%s)"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create and push to ACR (same as Test 11)
# ...

# Deploy with Bicep
az deployment group create \
  --resource-group $RESOURCE_GROUP \
  --template-file azure-deploy.bicep \
  --parameters \
    containerAppName=maester-bicep-test \
    location=$LOCATION \
    containerImage=$REGISTRY_NAME.azurecr.io/maester-web-ui:test \
    registryServer=$REGISTRY_NAME.azurecr.io

# Get outputs
az deployment group show \
  --name <deployment-name> \
  --resource-group $RESOURCE_GROUP \
  --query properties.outputs

# Cleanup
az group delete --name $RESOURCE_GROUP --yes --no-wait
```

## Troubleshooting Test Failures

### Build Fails

**Symptoms:** Docker build command fails

**Checks:**
```bash
# Check Docker is running
docker info

# Check disk space
df -h

# Try building with --no-cache
docker build --no-cache -f Dockerfile -t test .
```

### Container Won't Start

**Symptoms:** Container exits immediately

**Checks:**
```bash
# View container logs
docker logs <container-name>

# Check environment variables
docker inspect <container-name> | grep -A 20 Env

# Try running interactively
docker run --rm -it maester-web-ui:test /bin/bash
```

### Health Check Fails

**Symptoms:** Health endpoint returns error or timeout

**Checks:**
```bash
# Check if port is accessible
curl -v http://localhost:3001/api/health

# Check container logs
docker logs <container-name>

# Check if Node.js process is running
docker exec <container-name> ps aux | grep node

# Test from inside container
docker exec <container-name> curl http://localhost:3001/api/health
```

### PowerShell Modules Missing

**Symptoms:** Tests fail with module not found

**Checks:**
```bash
# Check if modules are installed
docker exec <container-name> pwsh -Command "Get-Module -ListAvailable"

# Try reinstalling modules
docker exec <container-name> pwsh -Command "Install-Module Maester -Force"

# Rebuild image with --no-cache
docker build --no-cache -f Dockerfile -t test .
```

## Performance Benchmarks

Expected build times (approximate):
- **Dockerfile.local**: 5-8 minutes (first build), 2-3 minutes (cached)
- **Dockerfile**: 8-12 minutes (first build), 3-5 minutes (cached)
- **Dockerfile.azure**: 8-12 minutes (first build), 3-5 minutes (cached)

Expected image sizes:
- **Dockerfile.local**: ~800 MB
- **Dockerfile**: ~1.2 GB
- **Dockerfile.azure**: ~1.2 GB

Expected startup times:
- **Local development**: 20-30 seconds
- **Production**: 30-45 seconds
- **Azure Container Apps**: 45-60 seconds (first start)

## Continuous Integration Testing

Example GitHub Actions workflow:

```yaml
name: Docker Build Test

on: [push, pull_request]

jobs:
  test-docker-builds:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Test Local Build
        run: |
          cd web-ui
          docker build -f Dockerfile.local -t test-local .
      
      - name: Test Production Build
        run: |
          cd web-ui
          docker build -f Dockerfile -t test-prod .
      
      - name: Test Azure Build
        run: |
          cd web-ui
          docker build -f Dockerfile.azure -t test-azure .
      
      - name: Validate Compose Files
        run: |
          cd web-ui
          docker compose -f docker-compose.yml config
          docker compose -f docker-compose.local.yml config
```

## Test Checklist

Before considering the Docker setup complete:

- [ ] All three Dockerfiles build successfully
- [ ] Docker Compose configurations are valid
- [ ] Local development setup works (docker compose up)
- [ ] Application starts and serves health endpoint
- [ ] PowerShell modules are properly installed
- [ ] Helper scripts work correctly
- [ ] Documentation is clear and accurate
- [ ] Azure deployment configurations are valid
- [ ] (Optional) Successful deployment to Azure Container Apps

## Support

If tests fail or you encounter issues:
1. Check the troubleshooting section above
2. Review logs carefully
3. Consult DOCKER-DEPLOYMENT.md for additional guidance
4. Open an issue on GitHub with test results and logs
