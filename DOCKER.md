# Docker Deployment for Maester

This repository includes comprehensive Docker support for the Maester Web UI, enabling easy deployment in local, production, and Azure Container Apps environments.

## Quick Start

### Local Development

```bash
cd web-ui
docker compose up -d
```

Access the application at: `http://localhost:3001`

### Production Deployment

```bash
cd web-ui
docker build -t maester-web-ui:latest .
docker run -d -p 3001:3001 \
  -e NODE_ENV=production \
  -e STORAGE_ACCOUNT_NAME=<your-storage-account> \
  maester-web-ui:latest
```

### Azure Container Apps

```bash
cd web-ui
./scripts/deploy-azure.sh \
  --resource-group maester-rg \
  --image <registry>.azurecr.io/maester-web-ui:latest
```

## Documentation

All Docker deployment documentation is located in the `web-ui/` directory:

- **[DOCKER-DEPLOYMENT.md](web-ui/DOCKER-DEPLOYMENT.md)** - Comprehensive deployment guide
  - Local development setup
  - Production deployment
  - Azure Container Apps deployment
  - Environment configuration
  - Troubleshooting

- **[DOCKER-TESTING.md](web-ui/DOCKER-TESTING.md)** - Testing and validation guide
  - Build testing
  - Container testing
  - Azure integration testing
  - Performance benchmarks

## Docker Files

The repository includes three Docker configurations:

| File | Purpose | Base Image | Size |
|------|---------|------------|------|
| `Dockerfile` | Production deployment | Ubuntu 22.04 | ~1.2 GB |
| `Dockerfile.local` | Local development | Alpine 3.17 | ~800 MB |
| `Dockerfile.azure` | Azure Container Apps | Ubuntu 22.04 | ~1.2 GB |

All Dockerfiles include:
- PowerShell 7.4
- Node.js 18.x
- Maester PowerShell module
- Pester testing framework
- Azure and Microsoft Graph modules

## Infrastructure as Code

- **`azure-deploy.bicep`** - Complete Bicep template for Azure deployment
  - Storage account
  - Container Apps environment
  - Container App with managed identity
  - Role assignments

- **`containerapp.yaml`** - Azure Container Apps YAML configuration

## Helper Scripts

- **`scripts/build-docker.sh`** - Build Docker images
- **`scripts/deploy-azure.sh`** - Deploy to Azure Container Apps

## Docker Compose Configurations

- **`docker-compose.yml`** - Standard local development
- **`docker-compose.local.yml`** - Enhanced local development with networking

## Web UI Overview

The Maester Web UI is a modern web application that provides:
- Interactive dashboard for running Maester security tests
- Report history management
- Azure Blob Storage integration
- Managed Identity authentication support

For more details, see [web-ui/README.md](web-ui/README.md)

## Architecture

```
┌─────────────────────────────────────┐
│         Docker Container            │
│  ┌───────────────────────────────┐  │
│  │     Node.js Express Server    │  │
│  │  (Port 3001)                  │  │
│  └───────────────┬───────────────┘  │
│                  │                   │
│  ┌───────────────┴───────────────┐  │
│  │   PowerShell 7.4              │  │
│  │   - Maester Module            │  │
│  │   - Pester                    │  │
│  │   - Az.Accounts               │  │
│  │   - Microsoft.Graph.Auth      │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │   React Web UI (built)        │  │
│  │   Served from /client/build   │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
           │
           ↓
┌─────────────────────────────────────┐
│    Azure Blob Storage               │
│    (or Azurite for local dev)       │
└─────────────────────────────────────┘
```

## System Requirements

### Local Development
- Docker Desktop or Docker Engine
- Docker Compose v2
- 4 GB RAM minimum
- 10 GB disk space

### Production
- Docker-compatible container host
- Azure Storage Account (or equivalent)
- 2 GB RAM minimum per container
- Managed Identity support (recommended)

## Getting Started

1. **Read the documentation:**
   - Start with [web-ui/QUICKSTART.md](web-ui/QUICKSTART.md)
   - Review [web-ui/DOCKER-DEPLOYMENT.md](web-ui/DOCKER-DEPLOYMENT.md)

2. **Choose your deployment method:**
   - Local: Use docker-compose
   - Production: Build and run Docker container
   - Azure: Use helper scripts or Bicep templates

3. **Follow the deployment guide** for your chosen method

4. **Test the deployment** using [web-ui/DOCKER-TESTING.md](web-ui/DOCKER-TESTING.md)

## Support

- **Documentation:** [maester.dev](https://maester.dev)
- **Issues:** [GitHub Issues](https://github.com/maester365/maester/issues)
- **Docker-specific issues:** Check [web-ui/DOCKER-DEPLOYMENT.md](web-ui/DOCKER-DEPLOYMENT.md) troubleshooting section

## Contributing

When contributing Docker-related changes:
1. Test all three Dockerfile configurations
2. Validate docker-compose files
3. Update documentation as needed
4. Run the test suite in DOCKER-TESTING.md

## License

MIT License - see LICENSE file for details
