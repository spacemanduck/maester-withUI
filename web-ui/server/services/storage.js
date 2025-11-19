const { BlobServiceClient } = require('@azure/storage-blob');
const { DefaultAzureCredential } = require('@azure/identity');

class StorageService {
  constructor() {
    this.containerName = process.env.STORAGE_CONTAINER_NAME || 'maester-reports';
    this.blobServiceClient = null;
    this.containerClient = null;
  }

  async initialize() {
    try {
      const storageAccount = process.env.STORAGE_ACCOUNT_NAME;
      const useAzurite = process.env.USE_AZURITE === 'true';
      
      if (useAzurite) {
        // Local development with Azurite
        const connectionString = process.env.AZURITE_CONNECTION_STRING || 
          'DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;';
        
        this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        console.log('Connected to Azurite for local development');
      } else {
        // Production with Managed Identity
        if (!storageAccount) {
          throw new Error('STORAGE_ACCOUNT_NAME environment variable is required');
        }
        
        const accountUrl = `https://${storageAccount}.blob.core.windows.net`;
        const credential = new DefaultAzureCredential();
        
        this.blobServiceClient = new BlobServiceClient(accountUrl, credential);
        console.log(`Connected to Azure Storage account: ${storageAccount}`);
      }
      
      // Get container client and create if it doesn't exist
      this.containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      
      // Create container if it doesn't exist
      const exists = await this.containerClient.exists();
      if (!exists) {
        await this.containerClient.create();
        console.log(`Created container: ${this.containerName}`);
      } else {
        console.log(`Container already exists: ${this.containerName}`);
      }
      
    } catch (error) {
      console.error('Error initializing storage service:', error);
      throw error;
    }
  }

  async uploadReport(reportName, htmlContent, metadata = {}) {
    try {
      const blobName = `${reportName}.html`;
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      
      // Add timestamp to metadata
      const fullMetadata = {
        ...metadata,
        uploadedAt: new Date().toISOString(),
        reportName,
      };
      
      await blockBlobClient.upload(htmlContent, Buffer.byteLength(htmlContent), {
        blobHTTPHeaders: {
          blobContentType: 'text/html',
        },
        metadata: fullMetadata,
      });
      
      console.log(`Report uploaded: ${blobName}`);
      return {
        name: blobName,
        url: blockBlobClient.url,
        metadata: fullMetadata,
      };
    } catch (error) {
      console.error('Error uploading report:', error);
      throw error;
    }
  }

  async listReports(maxResults = 100) {
    try {
      const reports = [];
      
      for await (const blob of this.containerClient.listBlobsFlat({
        includeMetadata: true,
      })) {
        if (blob.name.endsWith('.html')) {
          reports.push({
            id: blob.name.replace('.html', ''),
            name: blob.name,
            uploadedAt: blob.metadata?.uploadedat || blob.properties.createdOn,
            size: blob.properties.contentLength,
            metadata: blob.metadata || {},
          });
        }
        
        if (reports.length >= maxResults) {
          break;
        }
      }
      
      // Sort by upload date, newest first
      reports.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
      
      return reports;
    } catch (error) {
      console.error('Error listing reports:', error);
      throw error;
    }
  }

  async getLatestReport() {
    try {
      const reports = await this.listReports(1);
      return reports.length > 0 ? reports[0] : null;
    } catch (error) {
      console.error('Error getting latest report:', error);
      throw error;
    }
  }

  async getReport(reportId) {
    try {
      const blobName = reportId.endsWith('.html') ? reportId : `${reportId}.html`;
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      
      const exists = await blockBlobClient.exists();
      if (!exists) {
        return null;
      }
      
      const properties = await blockBlobClient.getProperties();
      
      return {
        id: reportId,
        name: blobName,
        uploadedAt: properties.metadata?.uploadedat || properties.createdOn,
        size: properties.contentLength,
        metadata: properties.metadata || {},
        url: blockBlobClient.url,
      };
    } catch (error) {
      console.error('Error getting report:', error);
      throw error;
    }
  }

  async downloadReportHtml(reportId) {
    try {
      const blobName = reportId.endsWith('.html') ? reportId : `${reportId}.html`;
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      
      const exists = await blockBlobClient.exists();
      if (!exists) {
        return null;
      }
      
      const downloadResponse = await blockBlobClient.download();
      const chunks = [];
      
      for await (const chunk of downloadResponse.readableStreamBody) {
        chunks.push(chunk);
      }
      
      return Buffer.concat(chunks).toString('utf-8');
    } catch (error) {
      console.error('Error downloading report:', error);
      throw error;
    }
  }

  async deleteReport(reportId) {
    try {
      const blobName = reportId.endsWith('.html') ? reportId : `${reportId}.html`;
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      
      await blockBlobClient.deleteIfExists();
      console.log(`Report deleted: ${blobName}`);
      return true;
    } catch (error) {
      console.error('Error deleting report:', error);
      throw error;
    }
  }
}

module.exports = new StorageService();
