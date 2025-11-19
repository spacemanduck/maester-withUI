import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Health check
export const checkHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};

// Reports
export const getReports = async () => {
  const response = await api.get('/reports');
  return response.data;
};

export const getLatestReport = async () => {
  const response = await api.get('/reports/latest');
  return response.data;
};

export const getReport = async (reportId) => {
  const response = await api.get(`/reports/${reportId}`);
  return response.data;
};

export const downloadReport = async (reportId) => {
  const response = await api.get(`/reports/${reportId}/download`, {
    responseType: 'text',
  });
  return response.data;
};

// Test execution
export const runTest = async (options = {}) => {
  const response = await api.post('/run-test', options);
  return response.data;
};

export const getTestStatus = async (jobId) => {
  const response = await api.get(`/test-status/${jobId}`);
  return response.data;
};

export default api;
