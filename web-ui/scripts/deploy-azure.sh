#!/bin/bash
# Script to deploy Maester Web UI to Azure Container Apps

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print colored message
print_message() {
    color=$1
    message=$2
    echo -e "${color}${message}${NC}"
}

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    print_message "$RED" "Error: Azure CLI is not installed"
    echo "Install from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Default values
RESOURCE_GROUP=""
LOCATION="eastus"
APP_NAME="maester-web-ui"
ENVIRONMENT_NAME="maester-env"
STORAGE_ACCOUNT=""
CONTAINER_IMAGE=""
REGISTRY=""
DEPLOY_METHOD="cli"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --resource-group)
            RESOURCE_GROUP="$2"
            shift 2
            ;;
        --location)
            LOCATION="$2"
            shift 2
            ;;
        --app-name)
            APP_NAME="$2"
            shift 2
            ;;
        --image)
            CONTAINER_IMAGE="$2"
            shift 2
            ;;
        --registry)
            REGISTRY="$2"
            shift 2
            ;;
        --storage-account)
            STORAGE_ACCOUNT="$2"
            shift 2
            ;;
        --method)
            DEPLOY_METHOD="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Required Options:"
            echo "  --resource-group RG    Azure resource group name"
            echo "  --image IMAGE          Container image (e.g., myregistry.azurecr.io/maester-web-ui:latest)"
            echo ""
            echo "Optional Options:"
            echo "  --location LOC         Azure region (default: eastus)"
            echo "  --app-name NAME        Container app name (default: maester-web-ui)"
            echo "  --storage-account SA   Storage account name (auto-generated if not provided)"
            echo "  --registry REG         Container registry (e.g., myregistry.azurecr.io)"
            echo "  --method METHOD        Deployment method: cli or bicep (default: cli)"
            echo "  --help                 Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 --resource-group maester-rg --image myregistry.azurecr.io/maester-web-ui:latest"
            echo "  $0 --resource-group maester-rg --image myregistry.azurecr.io/maester-web-ui:v1 --method bicep"
            exit 0
            ;;
        *)
            print_message "$RED" "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Validate required parameters
if [ -z "$RESOURCE_GROUP" ]; then
    print_message "$RED" "Error: --resource-group is required"
    exit 1
fi

if [ -z "$CONTAINER_IMAGE" ]; then
    print_message "$RED" "Error: --image is required"
    exit 1
fi

# Generate storage account name if not provided
if [ -z "$STORAGE_ACCOUNT" ]; then
    STORAGE_ACCOUNT="maesterstore$(date +%s)"
fi

print_message "$GREEN" "====================================="
print_message "$GREEN" "Deploying Maester Web UI to Azure"
print_message "$GREEN" "====================================="
echo ""
print_message "$YELLOW" "Configuration:"
print_message "$YELLOW" "  Resource Group: $RESOURCE_GROUP"
print_message "$YELLOW" "  Location:       $LOCATION"
print_message "$YELLOW" "  App Name:       $APP_NAME"
print_message "$YELLOW" "  Image:          $CONTAINER_IMAGE"
print_message "$YELLOW" "  Storage:        $STORAGE_ACCOUNT"
print_message "$YELLOW" "  Method:         $DEPLOY_METHOD"
echo ""

# Check if logged in to Azure
print_message "$GREEN" "Checking Azure authentication..."
if ! az account show &> /dev/null; then
    print_message "$RED" "Not logged in to Azure"
    print_message "$YELLOW" "Running: az login"
    az login
fi

print_message "$GREEN" "✓ Authenticated to Azure"
SUBSCRIPTION=$(az account show --query name -o tsv)
print_message "$YELLOW" "  Subscription: $SUBSCRIPTION"
echo ""

# Create resource group if it doesn't exist
print_message "$GREEN" "Checking resource group..."
if ! az group show --name "$RESOURCE_GROUP" &> /dev/null; then
    print_message "$YELLOW" "Creating resource group: $RESOURCE_GROUP"
    az group create --name "$RESOURCE_GROUP" --location "$LOCATION"
    print_message "$GREEN" "✓ Resource group created"
else
    print_message "$GREEN" "✓ Resource group exists"
fi
echo ""

# Deploy based on method
if [ "$DEPLOY_METHOD" = "bicep" ]; then
    print_message "$GREEN" "Deploying using Bicep template..."
    
    # Navigate to web-ui directory
    cd "$(dirname "$0")/.."
    
    DEPLOYMENT_NAME="maester-deployment-$(date +%s)"
    
    az deployment group create \
        --name "$DEPLOYMENT_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --template-file azure-deploy.bicep \
        --parameters \
            containerAppName="$APP_NAME" \
            location="$LOCATION" \
            storageAccountName="$STORAGE_ACCOUNT" \
            containerImage="$CONTAINER_IMAGE" \
            registryServer="$REGISTRY"
    
    # Get outputs
    APP_URL=$(az deployment group show \
        --name "$DEPLOYMENT_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --query properties.outputs.containerAppUrl.value -o tsv)
    
else
    print_message "$GREEN" "Deploying using Azure CLI..."
    
    # Create storage account
    print_message "$YELLOW" "Creating storage account..."
    az storage account create \
        --name "$STORAGE_ACCOUNT" \
        --resource-group "$RESOURCE_GROUP" \
        --location "$LOCATION" \
        --sku Standard_LRS \
        --min-tls-version TLS1_2
    print_message "$GREEN" "✓ Storage account created"
    echo ""
    
    # Create container apps environment
    print_message "$YELLOW" "Creating Container Apps environment..."
    if ! az containerapp env show --name "$ENVIRONMENT_NAME" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
        az containerapp env create \
            --name "$ENVIRONMENT_NAME" \
            --resource-group "$RESOURCE_GROUP" \
            --location "$LOCATION"
        print_message "$GREEN" "✓ Environment created"
    else
        print_message "$GREEN" "✓ Environment exists"
    fi
    echo ""
    
    # Create or update container app
    print_message "$YELLOW" "Deploying container app..."
    
    REGISTRY_ARGS=""
    if [ -n "$REGISTRY" ]; then
        REGISTRY_ARGS="--registry-server $REGISTRY"
    fi
    
    az containerapp create \
        --name "$APP_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --environment "$ENVIRONMENT_NAME" \
        --image "$CONTAINER_IMAGE" \
        --target-port 3001 \
        --ingress external \
        --cpu 1.0 \
        --memory 2Gi \
        --min-replicas 1 \
        --max-replicas 3 \
        --env-vars \
            NODE_ENV=production \
            USE_AZURITE=false \
            STORAGE_ACCOUNT_NAME="$STORAGE_ACCOUNT" \
            STORAGE_CONTAINER_NAME=maester-reports \
            PORT=3001 \
        $REGISTRY_ARGS \
        --system-assigned \
        2>/dev/null || \
    az containerapp update \
        --name "$APP_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --image "$CONTAINER_IMAGE"
    
    print_message "$GREEN" "✓ Container app deployed"
    echo ""
    
    # Configure managed identity
    print_message "$YELLOW" "Configuring managed identity..."
    PRINCIPAL_ID=$(az containerapp show \
        --name "$APP_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --query identity.principalId -o tsv)
    
    STORAGE_ID=$(az storage account show \
        --name "$STORAGE_ACCOUNT" \
        --resource-group "$RESOURCE_GROUP" \
        --query id -o tsv)
    
    az role assignment create \
        --assignee "$PRINCIPAL_ID" \
        --role "Storage Blob Data Contributor" \
        --scope "$STORAGE_ID" \
        2>/dev/null || print_message "$YELLOW" "Role assignment already exists"
    
    print_message "$GREEN" "✓ Managed identity configured"
    echo ""
    
    # Get app URL
    APP_URL=$(az containerapp show \
        --name "$APP_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --query properties.configuration.ingress.fqdn -o tsv)
    APP_URL="https://$APP_URL"
fi

print_message "$GREEN" "====================================="
print_message "$GREEN" "Deployment Complete!"
print_message "$GREEN" "====================================="
echo ""
print_message "$YELLOW" "Application URL: $APP_URL"
echo ""
print_message "$YELLOW" "Next steps:"
echo "  1. Test health endpoint: curl $APP_URL/api/health"
echo "  2. Access the application: $APP_URL"
echo "  3. View logs: az containerapp logs show --name $APP_NAME --resource-group $RESOURCE_GROUP --follow"
echo ""
