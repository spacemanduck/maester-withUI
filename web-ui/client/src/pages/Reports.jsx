import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { getReports } from '../services/api';
import { formatDistanceToNow } from 'date-fns';

function Reports() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const result = await getReports();
      if (result.success) {
        setReports(result.reports);
      } else {
        setError(result.error || 'Failed to load reports');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="px-4 sm:px-0">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-semibold leading-6 text-gray-900">
            Report History
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Browse and view all your Maester security test reports
          </p>
        </div>
      </div>

      {loading && (
        <div className="mt-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
          <p className="mt-2 text-sm text-gray-500">Loading reports...</p>
        </div>
      )}

      {error && (
        <div className="mt-8 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading reports</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && reports.length === 0 && (
        <div className="mt-8 text-center">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No reports</h3>
          <p className="mt-1 text-sm text-gray-500">
            Run your first test to generate a report.
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center rounded-md bg-orange-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-500"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}

      {!loading && !error && reports.length > 0 && (
        <div className="mt-8">
          <div className="overflow-hidden bg-white shadow sm:rounded-md">
            <ul role="list" className="divide-y divide-gray-200">
              {reports.map((report) => (
                <li
                  key={report.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/reports/${report.id}`)}
                >
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <DocumentTextIcon className="h-6 w-6 text-orange-600 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-orange-600 truncate">
                            {report.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {report.id}
                          </p>
                        </div>
                      </div>
                      <div className="ml-2 flex flex-shrink-0 items-center space-x-4">
                        <p className="text-sm text-gray-500">
                          {formatBytes(report.size)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDistanceToNow(new Date(report.uploadedAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    {report.metadata && Object.keys(report.metadata).length > 0 && (
                      <div className="mt-2">
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(report.metadata).map(([key, value]) => (
                            key !== 'uploadedat' && key !== 'reportname' && (
                              <span
                                key={key}
                                className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10"
                              >
                                {key}: {value}
                              </span>
                            )
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reports;
