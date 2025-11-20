# Multi-stage build for the Maester Web UI
# Production-ready Dockerfile with PowerShell support

# Stage 1: Build the React client
FROM node:20-slim AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Build the Node.js server with PowerShell
# Using Ubuntu base for better compatibility (similar to reference Dockerfile)
FROM mcr.microsoft.com/powershell:7.4-ubuntu-22.04

# Copy Node.js from the client-build stage
COPY --from=client-build /usr/local/bin/node /usr/local/bin/node
COPY --from=client-build /usr/local/lib/node_modules /usr/local/lib/node_modules
# Create symlinks for npm, npx
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm && \
    ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

# Set PowerShell as default shell for configuration
SHELL ["pwsh", "-NoLogo", "-NoProfile", "-Command"]

# Speed up gallery installs + avoid prompts
ENV POWERSHELL_TELEMETRY_OPTOUT=1
RUN if (-not (Get-PSRepository -Name PSGallery -ErrorAction SilentlyContinue)) { Register-PSRepository -Default -InstallationPolicy Trusted } else { Set-PSRepository -Name PSGallery -InstallationPolicy Trusted }

# Switch back to bash shell
SHELL ["/bin/bash", "-c"]

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
