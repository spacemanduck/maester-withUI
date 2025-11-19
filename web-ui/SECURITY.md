# Security Guidelines for Maester Web UI

## Overview

The Maester Web UI implements multiple security layers to protect against common web vulnerabilities and ensure secure access to sensitive security test data.

## Security Features

### 1. Authentication & Authorization

**Current State**: The application does not include built-in authentication.

**Recommended Production Implementation**:

#### Option A: Azure AD Authentication
```javascript
// Add to server/index.js
const { OIDCStrategy } = require('passport-azure-ad');

const strategy = new OIDCStrategy({
  identityMetadata: `https://login.microsoftonline.com/${tenantId}/v2.0/.well-known/openid-configuration`,
  clientID: process.env.AZURE_CLIENT_ID,
  redirectUrl: process.env.REDIRECT_URL,
  allowHttpForRedirectUrl: false,
  clientSecret: process.env.AZURE_CLIENT_SECRET,
  validateIssuer: true,
  passReqToCallback: false,
  scope: ['openid', 'profile', 'email']
}, (iss, sub, profile, accessToken, refreshToken, done) => {
  return done(null, profile);
});
```

#### Option B: API Key Authentication
```javascript
// Middleware for API key validation
const apiKeyAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Apply to protected routes
app.use('/api/run-test', apiKeyAuth);
```

### 2. Managed Identity for Azure Storage

**Production Configuration**:
- Always use Managed Identity to access Azure Storage
- Never store storage account keys in code or configuration
- Grant minimal required permissions (Storage Blob Data Contributor)

**Setup**:
```bash
# Enable managed identity
az webapp identity assign --name <app-name> --resource-group <rg>

# Assign role
az role assignment create \
  --assignee <principal-id> \
  --role "Storage Blob Data Contributor" \
  --scope <storage-account-resource-id>
```

### 3. Security Headers (Helmet.js)

The application uses Helmet.js to set secure HTTP headers:

- **Content-Security-Policy**: Restricts resource loading
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **X-Frame-Options**: Prevents clickjacking
- **X-XSS-Protection**: Enables browser XSS protection
- **Strict-Transport-Security**: Forces HTTPS connections

### 4. Rate Limiting

**Configuration** (server/index.js):
- 100 requests per 15 minutes per IP address
- Prevents brute force and DoS attacks

**Customization**:
```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // Adjust based on usage patterns
  standardHeaders: true,
  legacyHeaders: false,
});
```

### 5. CORS Configuration

**Default**: Only allows requests from configured origins

**Production Setup**:
```bash
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

### 6. Input Validation & Sanitization

All user inputs are validated:
- Test options are validated before execution
- Report IDs are sanitized to prevent path traversal
- PowerShell commands are constructed safely without user input injection

### 7. Sandbox Environment

Report HTML is displayed in an iframe with sandbox restrictions:
```html
<iframe sandbox="allow-scripts allow-same-origin" />
```

This prevents malicious scripts in reports from accessing the parent window.

## Security Best Practices

### Deployment

1. **Use HTTPS in Production**
   - Never deploy without TLS/SSL
   - Use Let's Encrypt or Azure-managed certificates
   - Configure HSTS headers

2. **Environment Variables**
   - Never commit `.env` files
   - Use Azure Key Vault for secrets in production
   - Rotate credentials regularly

3. **Network Security**
   - Place application behind Azure Front Door or Application Gateway
   - Use Azure Private Link for storage access
   - Implement network security groups (NSGs)

4. **Logging & Monitoring**
   - Enable Azure Application Insights
   - Log all authentication attempts
   - Monitor for suspicious activity
   - Set up alerts for unusual patterns

5. **Container Security**
   - Use official base images
   - Scan images for vulnerabilities
   - Keep dependencies updated
   - Run containers as non-root user

### Code Security

1. **Dependency Management**
   ```bash
   # Audit dependencies regularly
   npm audit
   
   # Update vulnerable packages
   npm audit fix
   ```

2. **Secure PowerShell Execution**
   - Never pass unsanitized user input to PowerShell
   - Use parameter binding instead of string concatenation
   - Limit PowerShell execution scope

3. **Error Handling**
   - Don't expose internal errors to users
   - Log detailed errors server-side
   - Return generic error messages to clients

## Compliance Considerations

### Data Handling

1. **Report Data**
   - Reports may contain sensitive security information
   - Implement retention policies
   - Consider encryption at rest and in transit

2. **Audit Logs**
   - Log all test executions
   - Log report access
   - Retain logs per compliance requirements

3. **Access Control**
   - Implement role-based access control (RBAC)
   - Use principle of least privilege
   - Regular access reviews

## Incident Response

### Security Incident Handling

1. **Detection**
   - Monitor logs for suspicious activity
   - Set up automated alerts
   - Regular security reviews

2. **Response**
   - Isolate affected systems
   - Rotate credentials
   - Investigate root cause

3. **Recovery**
   - Apply patches/fixes
   - Restore from clean backups
   - Document lessons learned

## Regular Security Tasks

### Daily
- [ ] Monitor logs for errors and suspicious activity
- [ ] Check application health and performance

### Weekly
- [ ] Review access logs
- [ ] Check for security updates

### Monthly
- [ ] Run npm audit and update dependencies
- [ ] Review and update firewall rules
- [ ] Check Azure Security Center recommendations

### Quarterly
- [ ] Security architecture review
- [ ] Penetration testing
- [ ] Disaster recovery drill
- [ ] Access control review

## Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** open a public issue
2. Email security details to: [security contact]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Azure Security Best Practices](https://docs.microsoft.com/en-us/azure/security/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
