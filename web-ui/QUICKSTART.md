# Maester Web UI - Quick Start Guide

Get the Maester Web UI running in under 5 minutes!

> **For detailed Docker deployments:** See [DOCKER-DEPLOYMENT.md](DOCKER-DEPLOYMENT.md) for comprehensive Docker and Azure Container Apps deployment instructions.

## Prerequisites

- Docker and Docker Compose installed
- That's it! 🎉

## Start the Application

1. **Navigate to the web-ui directory:**
   ```bash
   cd web-ui
   ```

2. **Start with Docker Compose:**
   ```bash
   docker-compose up -d
   ```

   Or use the helper script:
   ```bash
   ./scripts/start-local.sh
   ```

3. **Wait for services to start** (about 30 seconds)

4. **Access the application:**
   - Open your browser to: **http://localhost:3001**
   - You should see the Maester Dashboard!

## What's Running?

- **Maester Web UI** (port 3001): The main application
- **Azurite** (port 10000): Azure Storage emulator for storing reports

## Your First Test Run

⚠️ **Important**: Before running tests, you need Microsoft 365 credentials with appropriate permissions.

1. Click the **"Run Tests"** button on the dashboard
2. Select your test options:
   - Include long-running tests (optional)
   - Include preview tests (optional)
3. Click **"Run Tests"** to start
4. The UI will show the test status
5. Once complete, view your report!

### Authentication Note

The first time you run a test, you'll need to authenticate with Microsoft 365. This happens in the PowerShell container. To see the authentication prompt:

```bash
docker-compose logs -f web-ui
```

Look for authentication URLs in the logs.

## Browse Reports

- Click **"Reports"** in the navigation menu
- See all your historical reports
- Click any report to view it
- Click **"Latest Report"** on the dashboard for quick access

## Stop the Application

```bash
docker-compose down
```

To remove all data (including stored reports):
```bash
docker-compose down -v
```

## Troubleshooting

### Can't connect to the UI?

Check if services are running:
```bash
docker-compose ps
```

View logs:
```bash
docker-compose logs -f
```

### Authentication issues?

The application needs to authenticate with Microsoft 365 to run tests. Make sure you have:
- Valid Microsoft 365 credentials
- Appropriate permissions to run security tests
- MFA configured if required

### Azurite connection issues?

Restart Azurite:
```bash
docker-compose restart azurite
```

## Next Steps

- Read [SETUP.md](SETUP.md) for production deployment
- Review [SECURITY.md](SECURITY.md) for security best practices
- Check [README.md](README.md) for detailed documentation

## Need Help?

- Check the logs: `docker-compose logs -f web-ui`
- Visit: [maester.dev](https://maester.dev)
- GitHub Issues: [maester365/maester](https://github.com/maester365/maester/issues)

---

**That's it!** You're now running the Maester Web UI locally. Happy testing! 🔥
