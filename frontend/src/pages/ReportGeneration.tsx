import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { Case, Report } from '../types';

const ReportGeneration: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const [generating, setGenerating] = useState(false);

  const { data: caseData } = useQuery<Case>({
    queryKey: ['case', caseId],
    queryFn: async () => {
      const response = await apiClient.getCase(Number(caseId));
      return response.data;
    },
  });

  const { data: reports } = useQuery<Report[]>({
    queryKey: ['reports', caseId],
    queryFn: async () => {
      const response = await apiClient.getReports(Number(caseId));
      return response.data.results || response.data;
    },
  });

  const generateMutation = useMutation({
    mutationFn: () => apiClient.generateReport(Number(caseId)),
    onSuccess: () => {
      setGenerating(false);
      alert('Report generated successfully!');
    },
    onError: (error: any) => {
      setGenerating(false);
      alert(`Error: ${error.response?.data?.detail || error.message}`);
    },
  });

  const handleGenerate = () => {
    setGenerating(true);
    generateMutation.mutate();
  };

  const latestReport = reports?.[0];

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-2 text-sm text-gray-400 mb-2">
          <Link to="/" className="hover:text-gray-300">
            Dashboard
          </Link>
          <span>→</span>
          <Link to="/cases" className="hover:text-gray-300">
            Investigations
          </Link>
          <span>→</span>
          <Link to={`/cases/${caseId}`} className="hover:text-gray-300">
            {caseData?.name}
          </Link>
          <span>→</span>
          <span className="text-white">Report</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">📄 Investigation Report</h1>
        <p className="text-gray-400">
          Generate comprehensive PDF/CSV reports with executive summary, timeline, and evidence
        </p>
      </div>

      {/* Report Generation Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Generate Report Card */}
        <div className="bg-gradient-to-br from-blue-900/30 to-indigo-900/30 border border-blue-700/50 rounded-lg p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-2xl font-bold text-white mb-3">Generate New Report</h2>
            <p className="text-gray-300 mb-6">
              Create a comprehensive investigation report including all findings, timeline, and evidence
            </p>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-4 rounded-lg font-semibold shadow-lg transition text-lg"
            >
              {generating ? (
                <>
                  <span className="animate-spin inline-block mr-2">⚙️</span>
                  Generating...
                </>
              ) : (
                '✨ Generate Report'
              )}
            </button>
          </div>
        </div>

        {/* Report Preview Card */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Report Contents</h2>
          <ul className="space-y-3">
            <li className="flex items-start">
              <span className="text-green-400 mr-3">✓</span>
              <div>
                <p className="text-white font-semibold">Executive Summary</p>
                <p className="text-sm text-gray-400">High-level overview of findings</p>
              </div>
            </li>
            <li className="flex items-start">
              <span className="text-green-400 mr-3">✓</span>
              <div>
                <p className="text-white font-semibold">Attack Timeline</p>
                <p className="text-sm text-gray-400">Chronological sequence of events</p>
              </div>
            </li>
            <li className="flex items-start">
              <span className="text-green-400 mr-3">✓</span>
              <div>
                <p className="text-white font-semibold">Evidence Table</p>
                <p className="text-sm text-gray-400">Detailed event logs and artifacts</p>
              </div>
            </li>
            <li className="flex items-start">
              <span className="text-green-400 mr-3">✓</span>
              <div>
                <p className="text-white font-semibold">AI Analysis</p>
                <p className="text-sm text-gray-400">Machine learning insights and patterns</p>
              </div>
            </li>
            <li className="flex items-start">
              <span className="text-green-400 mr-3">✓</span>
              <div>
                <p className="text-white font-semibold">Recommendations</p>
                <p className="text-sm text-gray-400">Remediation and prevention steps</p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* Previous Reports */}
      {latestReport && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Latest Report</h2>
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">
                  {latestReport.title || 'Investigation Report'}
                </h3>
                <p className="text-sm text-gray-400">
                  Generated on {new Date(latestReport.created_at || latestReport.generated_at).toLocaleString()}
                </p>
              </div>
              <span className="px-3 py-1 bg-green-900/50 text-green-400 border border-green-700 rounded text-sm font-semibold">
                Ready
              </span>
            </div>

            {/* Report Preview */}
            <div className="bg-black/30 rounded p-4 mb-4 max-h-64 overflow-y-auto">
              <pre className="text-sm text-gray-300 whitespace-pre-wrap">
                {latestReport.content || 'Report content not available'}
              </pre>
            </div>

            {/* Download Buttons */}
            <div className="flex space-x-3">
              <a
                href={latestReport.file_path || '#'}
                download
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold text-center transition"
              >
                📥 Download PDF
              </a>
              <button
                onClick={() => {
                  // Export as CSV
                  const csv = latestReport.content || '';
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `report-${caseId}.csv`;
                  a.click();
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg font-semibold transition"
              >
                📊 Export CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No Reports Message */}
      {(!reports || reports.length === 0) && !generating && (
        <div className="text-center py-12 bg-gray-800/50 border border-gray-700 rounded-lg">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-semibold text-gray-300 mb-2">
            No Reports Generated Yet
          </h3>
          <p className="text-gray-500 mb-6">
            Generate your first report to get a comprehensive analysis of this investigation
          </p>
        </div>
      )}

      {/* Back to Investigation */}
      <div className="mt-8 text-center">
        <Link
          to={`/cases/${caseId}`}
          className="text-blue-400 hover:text-blue-300 font-semibold"
        >
          ← Back to Investigation
        </Link>
      </div>
    </div>
  );
};

export default ReportGeneration;
