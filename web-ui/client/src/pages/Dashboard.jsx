import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayIcon, DocumentTextIcon, ClockIcon } from '@heroicons/react/24/outline';
import { runTest, getTestStatus, getLatestReport } from '../services/api';

function Dashboard() {
  const navigate = useNavigate();
  const [isRunning, setIsRunning] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [latestReport, setLatestReport] = useState(null);
  const [options, setOptions] = useState({
    tags: [],
    includeLongRunning: false,
    includePreview: false,
  });

  useEffect(() => {
    loadLatestReport();
  }, []);

  useEffect(() => {
    if (jobId && isRunning) {
      const interval = setInterval(async () => {
        try {
          const result = await getTestStatus(jobId);
          if (result.success && result.status.found) {
            setStatus(result.status);
            
            if (result.status.status === 'completed') {
              setIsRunning(false);
              clearInterval(interval);
              // Refresh latest report
              loadLatestReport();
            } else if (result.status.status === 'failed') {
              setIsRunning(false);
              clearInterval(interval);
              setError(result.status.error);
            }
          }
        } catch (err) {
          console.error('Error checking status:', err);
        }
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [jobId, isRunning]);

  const loadLatestReport = async () => {
    try {
      const result = await getLatestReport();
      if (result.success) {
        setLatestReport(result.report);
      }
    } catch (err) {
      console.error('Error loading latest report:', err);
    }
  };

  const handleRunTest = async () => {
    setError(null);
    setIsRunning(true);
    setStatus(null);

    try {
      const result = await runTest(options);
      if (result.success) {
        setJobId(result.result.jobId);
      } else {
        setError(result.error || 'Failed to start test');
        setIsRunning(false);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setIsRunning(false);
    }
  };

  const handleViewLatest = () => {
    if (latestReport) {
      navigate(`/reports/${latestReport.id}`);
    }
  };

  return (
    <div className="px-4 sm:px-0">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-semibold leading-6 text-gray-900">
            Maester Security Testing Dashboard
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Run security tests on your Microsoft 365 environment and view results
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <PlayIcon className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-medium text-gray-900">Run New Test</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Execute Maester security tests
                </p>
              </div>
            </div>
          </div>
        </div>

        <div 
          className="overflow-hidden rounded-lg bg-white shadow cursor-pointer hover:shadow-lg transition-shadow"
          onClick={handleViewLatest}
        >
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DocumentTextIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-medium text-gray-900">Latest Report</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {latestReport 
                    ? `View report from ${new Date(latestReport.uploadedAt).toLocaleDateString()}`
                    : 'No reports available'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        <div 
          className="overflow-hidden rounded-lg bg-white shadow cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/reports')}
        >
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-medium text-gray-900">Report History</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Browse all past reports
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Run Test Section */}
      <div className="mt-8">
        <div className="overflow-hidden bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Run Maester Tests
            </h3>
            <div className="mt-5 space-y-4">
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    checked={options.includeLongRunning}
                    onChange={(e) => setOptions({ ...options, includeLongRunning: e.target.checked })}
                    disabled={isRunning}
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Include long-running tests
                  </span>
                </label>
              </div>
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    checked={options.includePreview}
                    onChange={(e) => setOptions({ ...options, includePreview: e.target.checked })}
                    disabled={isRunning}
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Include preview tests
                  </span>
                </label>
              </div>
              
              <div className="mt-5">
                <button
                  type="button"
                  onClick={handleRunTest}
                  disabled={isRunning}
                  className="inline-flex items-center rounded-md bg-orange-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PlayIcon className="mr-2 h-5 w-5" />
                  {isRunning ? 'Running Tests...' : 'Run Tests'}
                </button>
              </div>

              {/* Status Display */}
              {isRunning && status && (
                <div className="mt-4 rounded-md bg-blue-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <ClockIcon className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">
                        Test Status: {status.status}
                      </h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <p>Job ID: {status.jobId}</p>
                        <p>Started: {new Date(status.startTime).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {status?.status === 'completed' && (
                <div className="mt-4 rounded-md bg-green-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <DocumentTextIcon className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">
                        Test completed successfully!
                      </h3>
                      <div className="mt-2 text-sm text-green-700">
                        <p>Report has been saved to storage.</p>
                        <button
                          onClick={() => navigate(`/reports/${status.reportName}`)}
                          className="mt-2 font-medium text-green-800 underline hover:text-green-900"
                        >
                          View Report
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Error</h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>{error}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
