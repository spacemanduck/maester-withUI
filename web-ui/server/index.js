const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const storageService = require('./services/storage');
const maesterService = require('./services/maester');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'],
  credentials: true,
};
app.use(cors(corsOptions));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get all reports
app.get('/api/reports', async (req, res) => {
  try {
    const reports = await storageService.listReports();
    res.json({ success: true, reports });
  } catch (error) {
    console.error('Error listing reports:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get latest report
app.get('/api/reports/latest', async (req, res) => {
  try {
    const report = await storageService.getLatestReport();
    if (!report) {
      return res.status(404).json({ success: false, error: 'No reports found' });
    }
    res.json({ success: true, report });
  } catch (error) {
    console.error('Error getting latest report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get specific report
app.get('/api/reports/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const report = await storageService.getReport(reportId);
    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }
    res.json({ success: true, report });
  } catch (error) {
    console.error('Error getting report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Download report HTML
app.get('/api/reports/:reportId/download', async (req, res) => {
  try {
    const { reportId } = req.params;
    const htmlContent = await storageService.downloadReportHtml(reportId);
    if (!htmlContent) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }
    
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `inline; filename="${reportId}.html"`);
    res.send(htmlContent);
  } catch (error) {
    console.error('Error downloading report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Run Maester tests
app.post('/api/run-test', async (req, res) => {
  try {
    const { tags, includeLongRunning, includePreview } = req.body;
    
    // Start the test execution (this will run asynchronously)
    const result = await maesterService.runTests({
      tags,
      includeLongRunning,
      includePreview,
    });
    
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error running tests:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get test status
app.get('/api/test-status/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const status = await maesterService.getTestStatus(jobId);
    res.json({ success: true, status });
  } catch (error) {
    console.error('Error getting test status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Initialize storage service and start server
(async () => {
  try {
    await storageService.initialize();
    app.listen(PORT, () => {
      console.log(`Maester Web UI server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
