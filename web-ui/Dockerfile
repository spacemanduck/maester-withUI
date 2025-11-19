# Multi-stage build for the web UI

# Stage 1: Build the React client
FROM node:18-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Build the Node.js server with PowerShell
FROM mcr.microsoft.com/powershell:lts-alpine-3.17

# Install Node.js and npm
RUN apk add --no-cache nodejs npm

# Create app directory
WORKDIR /app

# Copy server package files
COPY package*.json ./
RUN npm ci --only=production

# Copy server source
COPY server/ ./server/
COPY .env.example ./.env

# Copy built client from previous stage
COPY --from=client-build /app/client/build ./client/build

# Create temp directory for test results
RUN mkdir -p temp/test-results

# Install Maester PowerShell module
RUN pwsh -Command "Set-PSRepository -Name PSGallery -InstallationPolicy Trusted; Install-Module -Name Maester -Scope CurrentUser -Force"

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the server
CMD ["node", "server/index.js"]
