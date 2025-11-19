const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;
const storageService = require('./storage');

class MaesterService {
  constructor() {
    this.jobs = new Map();
    this.outputDir = process.env.OUTPUT_DIR || path.join(__dirname, '../../temp/test-results');
  }

  async ensureOutputDir() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
    } catch (error) {
      console.error('Error creating output directory:', error);
      throw error;
    }
  }

  async runTests(options = {}) {
    const jobId = uuidv4();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = path.join(this.outputDir, `maester-report-${timestamp}.html`);
    
    await this.ensureOutputDir();

    const job = {
      id: jobId,
      status: 'running',
      startTime: new Date().toISOString(),
      endTime: null,
      outputFile,
      error: null,
      options,
    };

    this.jobs.set(jobId, job);

    // Build PowerShell command
    const psCommand = this.buildPowerShellCommand(options, outputFile);
    
    console.log(`Starting Maester test job ${jobId}`);
    console.log(`Command: ${psCommand}`);

    // Execute PowerShell command
    this.executePowerShell(psCommand, job);

    return {
      jobId,
      status: 'running',
      message: 'Test execution started',
    };
  }

  buildPowerShellCommand(options, outputFile) {
    const { tags, includeLongRunning, includePreview } = options;
    
    let command = 'pwsh -NoProfile -Command "';
    
    // Import Maester module
    command += 'Import-Module Maester -ErrorAction Stop; ';
    
    // Connect to Maester (this assumes credentials are already configured)
    // In production, you'll need to handle authentication properly
    command += 'Connect-Maester -ErrorAction Stop; ';
    
    // Build Invoke-Maester command
    command += 'Invoke-Maester';
    
    if (tags && tags.length > 0) {
      command += ` -Tag ${tags.map(t => `'${t}'`).join(',')}`;
    }
    
    if (includeLongRunning) {
      command += ' -IncludeLongRunning';
    }
    
    if (includePreview) {
      command += ' -IncludePreview';
    }
    
    command += ` -OutputHtmlFile '${outputFile}'`;
    command += ' -NonInteractive';
    
    command += '"';
    
    return command;
  }

  executePowerShell(command, job) {
    const child = spawn('sh', ['-c', command], {
      cwd: this.outputDir,
      env: {
        ...process.env,
        PESTER_VERBOSITY: 'None',
      },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      console.log(`[Job ${job.id}] ${output}`);
    });

    child.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      console.error(`[Job ${job.id}] Error: ${output}`);
    });

    child.on('close', async (code) => {
      job.endTime = new Date().toISOString();
      
      if (code === 0) {
        try {
          // Check if output file exists
          await fs.access(job.outputFile);
          
          // Upload report to storage
          const htmlContent = await fs.readFile(job.outputFile, 'utf-8');
          const reportName = path.basename(job.outputFile, '.html');
          
          await storageService.uploadReport(reportName, htmlContent, {
            jobId: job.id,
            options: JSON.stringify(job.options),
          });
          
          job.status = 'completed';
          job.reportName = reportName;
          console.log(`Job ${job.id} completed successfully`);
          
          // Clean up local file after upload
          await fs.unlink(job.outputFile).catch(err => {
            console.error(`Error deleting local file: ${err.message}`);
          });
          
        } catch (error) {
          job.status = 'failed';
          job.error = `Failed to process report: ${error.message}`;
          console.error(`Job ${job.id} failed:`, error);
        }
      } else {
        job.status = 'failed';
        job.error = `PowerShell process exited with code ${code}\nStderr: ${stderr}`;
        console.error(`Job ${job.id} failed with exit code ${code}`);
      }
      
      // Keep job in memory for status checks (cleanup after 1 hour)
      setTimeout(() => {
        this.jobs.delete(job.id);
      }, 60 * 60 * 1000);
    });

    child.on('error', (error) => {
      job.status = 'failed';
      job.error = `Failed to start PowerShell: ${error.message}`;
      job.endTime = new Date().toISOString();
      console.error(`Job ${job.id} error:`, error);
    });
  }

  getTestStatus(jobId) {
    const job = this.jobs.get(jobId);
    
    if (!job) {
      return {
        found: false,
        error: 'Job not found or expired',
      };
    }
    
    return {
      found: true,
      jobId: job.id,
      status: job.status,
      startTime: job.startTime,
      endTime: job.endTime,
      reportName: job.reportName,
      error: job.error,
    };
  }

  getAllJobs() {
    return Array.from(this.jobs.values()).map(job => ({
      jobId: job.id,
      status: job.status,
      startTime: job.startTime,
      endTime: job.endTime,
      reportName: job.reportName,
    }));
  }
}

module.exports = new MaesterService();
