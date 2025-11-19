# Maester Web UI Architecture

## System Overview

The Maester Web UI is a full-stack web application that wraps the Maester PowerShell CLI tool, providing a user-friendly interface for running security tests and managing test reports.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           User's Browser                             │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    React Frontend (Port 3000)                 │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐    │   │
│  │  │  Dashboard  │  │   Reports   │  │  Report Viewer   │    │   │
│  │  │             │  │   History   │  │   (iframe)       │    │   │
│  │  └─────────────┘  └─────────────┘  └──────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                            │ HTTP/REST API                           │
└────────────────────────────┼────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Express Backend (Port 3001)                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                   Security Middleware                       │    │
│  │  • Helmet.js (Security Headers)                            │    │
│  │  • Rate Limiting (100 req/15min)                           │    │
│  │  • CORS                                                     │    │
│  │  • Input Validation                                         │    │
│  └────────────────────────────────────────────────────────────┘    │
│                             │                                        │
│  ┌─────────────────────────┼────────────────────────────────┐      │
│  │         API Routes       │                                 │      │
│  │  ┌──────────────┐  ┌────┴───────┐  ┌─────────────────┐  │      │
│  │  │ /api/reports │  │ /api/run-  │  │ /api/test-      │  │      │
│  │  │              │  │   test     │  │   status/:id    │  │      │
│  │  └──────────────┘  └────────────┘  └─────────────────┘  │      │
│  └───────┬──────────────────┬─────────────────────┬─────────┘      │
│          │                  │                      │                 │
│  ┌───────▼──────────┐ ┌────▼────────────┐  ┌─────▼──────────────┐ │
│  │  Storage Service │ │ Maester Service │  │  Job Queue (Map)   │ │
│  │  • List Reports  │ │ • Run Tests     │  │  • Track Status    │ │
│  │  • Get Report    │ │ • Build Command │  │  • Store Results   │ │
│  │  • Upload Report │ │ • Execute PS    │  │                    │ │
│  │  • Download HTML │ │ • Monitor Jobs  │  │                    │ │
│  └───────┬──────────┘ └────┬────────────┘  └────────────────────┘ │
│          │                  │                                        │
└──────────┼──────────────────┼────────────────────────────────────────┘
           │                  │
           │                  ▼
           │       ┌─────────────────────────┐
           │       │  PowerShell Core (pwsh) │
           │       │  ┌───────────────────┐  │
           │       │  │ Maester Module    │  │
           │       │  │ • Connect-Maester │  │
           │       │  │ • Invoke-Maester  │  │
           │       │  │ • Run Tests       │  │
           │       │  │ • Generate HTML   │  │
           │       │  └───────────────────┘  │
           │       └────────┬────────────────┘
           │                │
           │                ▼
           │       ┌─────────────────────────┐
           │       │  Microsoft 365          │
           │       │  • Entra ID             │
           │       │  • Security Config      │
           │       │  • Test Targets         │
           │       └─────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│      Azure Blob Storage / Azurite            │
│  ┌────────────────────────────────────────┐ │
│  │      Container: maester-reports         │ │
│  │  ┌──────────────────────────────────┐  │ │
│  │  │  • report-2024-01-01.html        │  │ │
│  │  │  • report-2024-01-02.html        │  │ │
│  │  │  • report-2024-01-03.html        │  │ │
│  │  │  • (metadata for each report)    │  │ │
│  │  └──────────────────────────────────┘  │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  Authentication:                             │
│  • Local: Connection String                 │
│  • Production: Managed Identity             │
└──────────────────────────────────────────────┘
```

## Component Details

### Frontend (React + Vite)

**Technology Stack:**
- React 18
- Vite (build tool)
- React Router (navigation)
- Tailwind CSS (styling)
- Heroicons (icons)
- Axios (HTTP client)

**Pages:**
1. **Dashboard**: Main landing page with quick actions
   - Run new tests
   - View latest report
   - Access report history

2. **Reports**: Browse all historical reports
   - List view with metadata
   - Sort by date
   - Click to view

3. **Report Viewer**: Display individual reports
   - Embed HTML in sandboxed iframe
   - Full report interaction
   - Back navigation

**Key Features:**
- Responsive design
- Real-time test status updates
- Error handling and loading states
- Secure report rendering (sandboxed)

### Backend (Node.js + Express)

**Technology Stack:**
- Node.js 18+
- Express 4.x
- Helmet.js (security)
- Azure SDKs (@azure/storage-blob, @azure/identity)
- Child Process (PowerShell execution)

**Services:**

1. **Storage Service** (`server/services/storage.js`)
   - Azure Blob Storage integration
   - Managed Identity authentication
   - Report CRUD operations
   - Metadata management

2. **Maester Service** (`server/services/maester.js`)
   - PowerShell command builder
   - Test execution manager
   - Job tracking and status
   - Report file handling

**API Endpoints:**
- `GET /api/health` - Health check
- `GET /api/reports` - List all reports
- `GET /api/reports/latest` - Get latest report
- `GET /api/reports/:id` - Get specific report
- `GET /api/reports/:id/download` - Download report HTML
- `POST /api/run-test` - Start test execution
- `GET /api/test-status/:jobId` - Check test status

### Security Layer

**Implemented:**
1. **Helmet.js**: Security headers
   - Content Security Policy
   - X-Frame-Options
   - X-Content-Type-Options
   - HSTS

2. **Rate Limiting**: 100 requests per 15 minutes per IP

3. **CORS**: Configurable allowed origins

4. **Input Validation**: All user inputs sanitized

5. **Sandbox**: Reports rendered in sandboxed iframe

6. **Managed Identity**: No credentials in code

**Recommended for Production:**
- Azure AD authentication
- API key authentication
- Network-level security (Private Link, Front Door)
- SSL/TLS encryption

### Storage Layer

**Local Development:**
- Azurite emulator
- Connection string authentication
- HTTP protocol
- Port 10000

**Production:**
- Azure Blob Storage
- Managed Identity authentication
- HTTPS protocol
- Role-based access control

**Storage Structure:**
```
Container: maester-reports
├── maester-report-2024-01-01T12-00-00.html
├── maester-report-2024-01-02T12-00-00.html
└── ...

Each blob has metadata:
- uploadedat: ISO timestamp
- reportname: Report identifier
- jobid: Execution job ID
- options: JSON test options
```

## Data Flow

### Test Execution Flow

```
User → Frontend → Backend API → Maester Service → PowerShell
                                         ↓
                                   Create Job ID
                                         ↓
                                 Execute pwsh command
                                         ↓
                                  Connect-Maester
                                         ↓
                                  Invoke-Maester
                                         ↓
                              Generate HTML Report
                                         ↓
                              Storage Service
                                         ↓
                              Upload to Azure/Azurite
                                         ↓
                              Update Job Status
                                         ↓
                              Frontend Polls Status
                                         ↓
                              Display Completion
```

### Report Viewing Flow

```
User → Frontend → Backend API → Storage Service
                      ↓
                List Reports
                      ↓
                Display List
                      ↓
        User Clicks Report
                      ↓
        Download HTML Content
                      ↓
        Return to Frontend
                      ↓
    Render in Sandboxed iframe
```

## Deployment Patterns

### Local Development
```
Docker Compose
├── Azurite Container (Storage)
└── Web UI Container (App + PowerShell)
    ├── Node.js Server
    ├── React Frontend (built)
    └── PowerShell Core
```

### Production - Container Instance
```
Azure Container Instance
├── Web UI Container
│   ├── Managed Identity
│   └── Environment Variables
└── Azure Blob Storage
    └── RBAC (Storage Blob Data Contributor)
```

### Production - App Service
```
Azure App Service (Linux)
├── Custom Docker Image
├── Managed Identity
├── App Settings
└── Azure Blob Storage
    └── RBAC
```

## Scalability Considerations

1. **Concurrent Test Execution**: 
   - Currently sequential per instance
   - Can scale horizontally with multiple containers
   - Job queue could be moved to Redis for distributed setup

2. **Storage**: 
   - Azure Blob Storage scales automatically
   - Consider lifecycle policies for old reports

3. **Caching**: 
   - Add Redis for job status caching
   - Cache report metadata

4. **Load Balancing**: 
   - Use Azure Front Door or Application Gateway
   - Multiple backend instances

## Monitoring & Observability

**Recommended Tools:**
1. Azure Application Insights
2. Azure Monitor
3. Container health checks
4. Custom metrics (test execution time, success rate)

**Key Metrics:**
- Test execution success rate
- Average test duration
- Report storage size
- API response times
- Error rates

## Security Architecture

```
┌─────────────────────────────────────┐
│     Security Boundaries              │
├─────────────────────────────────────┤
│  1. TLS/HTTPS (Transport)           │
│  2. Authentication (Identity)        │
│  3. Authorization (Access Control)   │
│  4. Rate Limiting (DoS Prevention)   │
│  5. Input Validation (Injection)     │
│  6. CSP Headers (XSS Prevention)     │
│  7. Sandboxed iframe (Report XSS)   │
│  8. Managed Identity (No Creds)     │
└─────────────────────────────────────┘
```

## Future Enhancements

1. **Authentication**: Azure AD integration
2. **Multi-tenancy**: Support multiple Microsoft 365 tenants
3. **Scheduling**: Automated test scheduling
4. **Notifications**: Email/Teams alerts on test completion
5. **Report Comparison**: Compare reports over time
6. **Custom Tests**: Upload custom Pester tests
7. **API Keys**: REST API access with keys
8. **Webhooks**: Integration with external systems
9. **Audit Logging**: Comprehensive audit trail
10. **Role-Based Access**: Different user permission levels

## Technology Choices Rationale

- **React**: Modern, component-based, large ecosystem
- **Vite**: Fast builds, excellent DX
- **Express**: Mature, well-documented, flexible
- **Tailwind CSS**: Utility-first, rapid development
- **Azure Blob Storage**: Scalable, secure, managed
- **Docker**: Portable, consistent environments
- **PowerShell Core**: Cross-platform, required for Maester
- **Node.js**: JavaScript full-stack, async I/O

## Conclusion

The Maester Web UI provides a secure, scalable, and user-friendly interface for running Maester security tests and managing reports. The architecture supports both local development and production deployment with minimal configuration changes.
