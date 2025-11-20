#!/bin/bash
# Script to build Docker images for Maester Web UI

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

# Default values
BUILD_TYPE="local"
TAG="latest"
REGISTRY=""
PUSH=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --type)
            BUILD_TYPE="$2"
            shift 2
            ;;
        --tag)
            TAG="$2"
            shift 2
            ;;
        --registry)
            REGISTRY="$2"
            shift 2
            ;;
        --push)
            PUSH=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --type TYPE        Build type: local, production, or azure (default: local)"
            echo "  --tag TAG          Image tag (default: latest)"
            echo "  --registry REG     Container registry (e.g., myregistry.azurecr.io)"
            echo "  --push             Push image to registry after build"
            echo "  --help             Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 --type local"
            echo "  $0 --type azure --registry myregistry.azurecr.io --tag v1.0.0 --push"
            exit 0
            ;;
        *)
            print_message "$RED" "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Determine Dockerfile and image name
case $BUILD_TYPE in
    local)
        DOCKERFILE="Dockerfile.local"
        IMAGE_NAME="maester-web-ui-local"
        ;;
    production)
        DOCKERFILE="Dockerfile"
        IMAGE_NAME="maester-web-ui"
        ;;
    azure)
        DOCKERFILE="Dockerfile.azure"
        IMAGE_NAME="maester-web-ui"
        ;;
    *)
        print_message "$RED" "Invalid build type: $BUILD_TYPE"
        echo "Valid types: local, production, azure"
        exit 1
        ;;
esac

# Build full image name
if [ -n "$REGISTRY" ]; then
    FULL_IMAGE_NAME="$REGISTRY/$IMAGE_NAME:$TAG"
else
    FULL_IMAGE_NAME="$IMAGE_NAME:$TAG"
fi

# Navigate to web-ui directory (script should be run from scripts folder)
cd "$(dirname "$0")/.."

print_message "$GREEN" "====================================="
print_message "$GREEN" "Building Maester Web UI Docker Image"
print_message "$GREEN" "====================================="
echo ""
print_message "$YELLOW" "Build Type:  $BUILD_TYPE"
print_message "$YELLOW" "Dockerfile:  $DOCKERFILE"
print_message "$YELLOW" "Image Name:  $FULL_IMAGE_NAME"
echo ""

# Build the image
print_message "$GREEN" "Building image..."
docker build -f "$DOCKERFILE" -t "$FULL_IMAGE_NAME" .

if [ $? -eq 0 ]; then
    print_message "$GREEN" "✓ Build successful!"
    
    # Show image info
    print_message "$YELLOW" "\nImage details:"
    docker images "$FULL_IMAGE_NAME"
    
    # Push if requested
    if [ "$PUSH" = true ]; then
        if [ -z "$REGISTRY" ]; then
            print_message "$RED" "Error: --registry must be specified when using --push"
            exit 1
        fi
        
        print_message "$GREEN" "\nPushing image to registry..."
        docker push "$FULL_IMAGE_NAME"
        
        if [ $? -eq 0 ]; then
            print_message "$GREEN" "✓ Push successful!"
        else
            print_message "$RED" "✗ Push failed!"
            exit 1
        fi
    fi
    
    print_message "$GREEN" "\n====================================="
    print_message "$GREEN" "Build Complete!"
    print_message "$GREEN" "====================================="
    echo ""
    print_message "$YELLOW" "To run the image:"
    echo "  docker run -d -p 3001:3001 --name maester-web-ui $FULL_IMAGE_NAME"
    echo ""
    print_message "$YELLOW" "To view logs:"
    echo "  docker logs -f maester-web-ui"
    echo ""
    
else
    print_message "$RED" "✗ Build failed!"
    exit 1
fi
