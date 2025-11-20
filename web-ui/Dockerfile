# Multi-stage build for the Maester Web UI
# Production-ready Dockerfile with PowerShell support

# Stage 1: Build the React client
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Build the Node.js server with PowerShell
# Using Ubuntu base for better compatibility (similar to reference Dockerfile)
FROM mcr.microsoft.com/powershell:7.4-ubuntu-22.04

# Set PowerShell as default shell for configuration
SHELL ["pwsh", "-NoLogo", "-NoProfile", "-Command"]

# Speed up gallery installs + avoid prompts
ENV POWERSHELL_TELEMETRY_OPTOUT=1
RUN Set-PSRepository -Name PSGallery -InstallationPolicy Trusted

# Install Node.js 20.x
SHELL ["/bin/bash", "-c"]
RUN apt-get update && \
    apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy server package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy server source
COPY server/ ./server/

# Copy built client from previous stage
COPY --from=client-build /app/client/build ./client/build

# Create temp directory for test results
RUN mkdir -p temp/test-results

# Set PowerShell as shell for module installation
SHELL ["pwsh", "-NoLogo", "-NoProfile", "-Command"]

# Install PowerShell modules non-interactively (AllUsers so they're available at runtime)
RUN Install-Module Pester -SkipPublisherCheck -Force -Scope AllUsers
RUN Install-Module Maester -Force -Scope AllUsers
# Optional extras for Microsoft 365 connectivity
RUN Install-Module Az.Accounts, Microsoft.Graph.Authentication, ExchangeOnlineManagement -Force -Scope AllUsers

# Switch back to bash shell
SHELL ["/bin/bash", "-c"]

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the server
CMD ["node", "server/index.js"]
