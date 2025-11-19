import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { downloadReport } from '../services/api';

function ReportViewer() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportHtml, setReportHtml] = useState('');

  useEffect(() => {
    loadReport();
  }, [reportId]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const html = await downloadReport(reportId);
      setReportHtml(html);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 sm:px-0">
      <div className="mb-4">
        <button
          onClick={() => navigate('/reports')}
          className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Back to Reports
        </button>
      </div>

      {loading && (
        <div className="mt-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
          <p className="mt-2 text-sm text-gray-500">Loading report...</p>
        </div>
      )}

      {error && (
        <div className="mt-8 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading report</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && reportHtml && (
        <div className="mt-4 bg-white shadow sm:rounded-lg overflow-hidden">
          <div 
            className="report-viewer"
            style={{ minHeight: '600px' }}
          >
            <iframe
              srcDoc={reportHtml}
              title="Maester Report"
              style={{
                width: '100%',
                height: '85vh',
                border: 'none',
              }}
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default ReportViewer;
