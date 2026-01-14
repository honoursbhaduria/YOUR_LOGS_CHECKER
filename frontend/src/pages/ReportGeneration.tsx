import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { Case, Report } from '../types';
import LaTeXEditor from '../components/LaTeXEditor';

const ReportGeneration: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const [generating, setGenerating] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [reportFormat, setReportFormat] = useState<'PDF_LATEX' | 'CSV'>('PDF_LATEX');
  const [downloadingCombined, setDownloadingCombined] = useState(false);
  const [showLatexEditor, setShowLatexEditor] = useState(false);
  const [latexSource, setLatexSource] = useState('');
  const [loadingLatex, setLoadingLatex] = useState(false);
  const [compilingLatex, setCompilingLatex] = useState(false);

  const { data: caseData } = useQuery<Case>({
    queryKey: ['case', caseId],
    queryFn: async () => {
      const response = await apiClient.getCase(Number(caseId));
      return response.data;
    },
  });

  const { data: reports, refetch } = useQuery<Report[]>({
    queryKey: ['reports', caseId],
    queryFn: async () => {
      const response = await apiClient.getReports(Number(caseId));
      return response.data.results || response.data;
    },
  });

  const generateMutation = useMutation({
    mutationFn: (format: string) => apiClient.generateReport(Number(caseId), format),
    onSuccess: () => {
      setGenerating(false);
      setSuccessMessage(`${reportFormat === 'PDF_LATEX' ? 'LaTeX PDF' : 'CSV'} report generated successfully!`);
      setErrorMessage('');
      setTimeout(() => setSuccessMessage(''), 5000);
      refetch();
    },
    onError: (error: any) => {
      setGenerating(false);
      setErrorMessage(error.response?.data?.detail || error.message || 'Failed to generate report');
      setSuccessMessage('');
    },
  });

  const handleGenerate = () => {
    setGenerating(true);
    generateMutation.mutate(reportFormat);
  };

  const handleDownload = async (reportId: number, filename: string) => {
    try {
      const response = await apiClient.downloadReport(reportId);
      
      // Create blob and download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSuccessMessage('Download started successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      setErrorMessage('Failed to download report: ' + (error.message || 'Unknown error'));
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  const handleDownloadCombined = async () => {
    setDownloadingCombined(true);
    try {
      const response = await apiClient.generateCombinedReport(Number(caseId));
      
      // Create blob and download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_case_${caseId}_combined.zip`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSuccessMessage('Combined report (PDF + CSV) downloaded successfully!');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error: any) {
      setErrorMessage('Failed to download combined report: ' + (error.message || 'Unknown error'));
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setDownloadingCombined(false);
    }
  };

  const handlePreviewLatex = async () => {
    setLoadingLatex(true);
    try {
      const response = await apiClient.previewLatex(Number(caseId));
      setLatexSource(response.data.latex_source);
      setShowLatexEditor(true);
      setSuccessMessage('LaTeX source loaded successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      setErrorMessage('Failed to load LaTeX preview: ' + (error.message || 'Unknown error'));
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setLoadingLatex(false);
    }
  };

  const handleCompileLatex = async (customLatexSource: string, download: boolean): Promise<Blob | null> => {
    setCompilingLatex(true);
    try {
      const response = await apiClient.compileCustomLatex(
        customLatexSource,
        `report_case_${caseId}_custom.pdf`
      );
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      
      if (download) {
        // Create blob and download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `report_case_${caseId}_custom.pdf`);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        setSuccessMessage('Custom LaTeX compiled and downloaded successfully!');
        setTimeout(() => setSuccessMessage(''), 5000);
      }
      
      return blob;
    } catch (error: any) {
      setErrorMessage('Failed to compile LaTeX: ' + (error.message || 'Unknown error'));
      setTimeout(() => setErrorMessage(''), 5000);
      return null;
    } finally {
      setCompilingLatex(false);
    }
  };

  const latestReport = reports?.[0];

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Toast Notifications - Top Right Corner */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 animate-slideInRight">
          <div className="bg-emerald-950 text-emerald-100 border border-emerald-900 px-6 py-4 rounded-lg flex items-center space-x-3 min-w-[300px] max-w-md">
            <div className="flex-1">
              <p className="font-medium text-sm">{successMessage}</p>
            </div>
          </div>
        </div>
      )}
      {errorMessage && (
        <div className="fixed top-4 right-4 z-50 animate-slideInRight">
          <div className="bg-red-950 text-red-100 border border-red-900 px-6 py-4 rounded-lg flex items-center space-x-3 min-w-[300px] max-w-md">
            <div className="flex-1">
              <p className="font-medium text-sm">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-2 text-sm text-zinc-500 mb-3">
          <Link to="/" className="hover:text-zinc-100 transition-colors">
            Dashboard
          </Link>
          <span>→</span>
          <Link to="/cases" className="hover:text-zinc-100 transition-colors">
            Investigations
          </Link>
          <span>→</span>
          <Link to={`/cases/${caseId}`} className="hover:text-zinc-100 transition-colors">
            {caseData?.name}
          </Link>
          <span>→</span>
          <span className="text-zinc-400">Report</span>
        </div>
        <h1 className="text-2xl font-semibold text-zinc-100 mb-2">Investigation Report</h1>
        <p className="text-zinc-500 text-sm">
          Generate comprehensive PDF/CSV reports with executive summary, timeline, and evidence
        </p>
      </div>

      {/* Report Generation Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Generate Report Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8">
          <div className="text-center">
            <h2 className="text-lg font-medium text-zinc-100 mb-3">Generate New Report</h2>
            <p className="text-zinc-500 text-sm mb-6">
              Create a professional forensic report with LaTeX formatting or export to CSV
            </p>
            
            {/* Format Selector */}
            <div className="mb-6">
              <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-3">Report Format</label>
              <div className="flex space-x-3 justify-center">
                <button
                  onClick={() => setReportFormat('PDF_LATEX')}
                  className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    reportFormat === 'PDF_LATEX'
                      ? 'bg-zinc-100 text-zinc-900'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  LaTeX PDF
                </button>
                <button
                  onClick={() => setReportFormat('CSV')}
                  className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    reportFormat === 'CSV'
                      ? 'bg-zinc-100 text-zinc-900'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  CSV Export
                </button>
              </div>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="btn-primary w-full"
              >
                {generating ? 'Generating...' : `Generate ${reportFormat === 'PDF_LATEX' ? 'LaTeX PDF' : 'CSV'}`}
              </button>
              
              <button
                onClick={handlePreviewLatex}
                disabled={loadingLatex}
                className="btn-secondary w-full"
              >
                {loadingLatex ? 'Loading...' : 'Preview & Edit LaTeX'}
              </button>
              
              <button
                onClick={handleDownloadCombined}
                disabled={downloadingCombined}
                className="btn-secondary w-full"
              >
                {downloadingCombined ? 'Preparing...' : 'Download Combined (PDF + CSV)'}
              </button>
            </div>
            
            <p className="mt-4 text-xs text-zinc-600">
              Preview & Edit: Customize LaTeX before generating PDF • Combined: ZIP with PDF + CSV
            </p>
          </div>
        </div>

        {/* Report Preview Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-base font-medium text-zinc-100 mb-4">Report Contents</h2>
          <ul className="space-y-3">
            <li className="flex items-start">
              <span className="text-emerald-400 mr-3 mt-0.5">✓</span>
              <div>
                <p className="text-zinc-100 font-medium text-sm">Nested Structure (LaTeX PDF)</p>
                <p className="text-xs text-zinc-500 mt-1">Hierarchical sections with subsections and tables</p>
              </div>
            </li>
            <li className="flex items-start">
              <span className="text-emerald-400 mr-3 mt-0.5">✓</span>
              <div>
                <p className="text-zinc-100 font-medium text-sm">Executive Summary</p>
                <p className="text-xs text-zinc-500 mt-1">High-level overview with attack stories</p>
              </div>
            </li>
            <li className="flex items-start">
              <span className="text-emerald-400 mr-3 mt-0.5">✓</span>
              <div>
                <p className="text-zinc-100 font-medium text-sm">Event Analysis by Risk Level</p>
                <p className="text-xs text-zinc-500 mt-1">Events categorized by confidence level</p>
              </div>
            </li>
            <li className="flex items-start">
              <span className="text-emerald-400 mr-3 mt-0.5">✓</span>
              <div>
                <p className="text-zinc-100 font-medium text-sm">Chain of Custody</p>
                <p className="text-xs text-zinc-500 mt-1">Evidence tracking and file hashes</p>
              </div>
            </li>
            <li className="flex items-start">
              <span className="text-emerald-400 mr-3 mt-0.5">✓</span>
              <div>
                <p className="text-zinc-100 font-medium text-sm">CSV Data Export</p>
                <p className="text-xs text-zinc-500 mt-1">Structured data for analysis tools</p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* Previous Reports */}
      {latestReport && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-base font-medium text-zinc-100 mb-4">Latest Report</h2>
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-medium text-zinc-100 mb-1">
                  {latestReport.format === 'PDF_LATEX' ? 'LaTeX PDF Report' : 
                   latestReport.format === 'CSV' ? 'CSV Export' : 'PDF Report'}
                </h3>
                <p className="text-sm text-zinc-500">
                  Version {latestReport.version} • Generated on {new Date(latestReport.created_at || latestReport.generated_at).toLocaleString()}
                </p>
              </div>
              <span className={`px-2 py-1 border rounded-lg text-xs font-medium ${
                latestReport.format === 'PDF_LATEX' ? 'bg-indigo-950 text-indigo-400 border-indigo-900' :
                latestReport.format === 'CSV' ? 'bg-emerald-950 text-emerald-400 border-emerald-900' :
                'bg-zinc-800 text-zinc-400 border-zinc-700'
              }`}>
                {latestReport.format}
              </span>
            </div>

            {/* Report Info */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-zinc-600">Format:</span>
                  <span className="text-zinc-300 ml-2">{latestReport.format}</span>
                </div>
                <div>
                  <span className="text-zinc-600">Version:</span>
                  <span className="text-zinc-300 ml-2">v{latestReport.version}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-zinc-600">Hash:</span>
                  <span className="text-zinc-400 ml-2 text-xs font-mono">{latestReport.file_hash?.substring(0, 32)}...</span>
                </div>
              </div>
            </div>

            {/* Download Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  const ext = latestReport.format === 'CSV' ? 'csv' : 
                             latestReport.format === 'JSON' ? 'json' : 'pdf';
                  handleDownload(latestReport.id, `report_case_${caseData?.id}_v${latestReport.version}.${ext}`);
                }}
                className="btn-primary flex-1"
              >
                Download {latestReport.format === 'CSV' ? 'CSV' : latestReport.format === 'JSON' ? 'JSON' : 'PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No Reports Message */}
      {(!reports || reports.length === 0) && !generating && (
        <div className="text-center py-12 bg-zinc-900 border border-zinc-800 rounded-lg">
          <h3 className="text-base font-medium text-zinc-300 mb-2">
            No Reports Generated Yet
          </h3>
          <p className="text-zinc-500 text-sm mb-6">
            Generate your first report to get a comprehensive analysis of this investigation
          </p>
        </div>
      )}

      {/* Back to Investigation */}
      <div className="mt-8 text-center">
        <Link
          to={`/cases/${caseId}`}
          className="text-zinc-400 hover:text-zinc-100 text-sm transition-colors"
        >
          ← Back to Investigation
        </Link>
      </div>

      {/* LaTeX Editor Modal */}
      {showLatexEditor && latexSource && (
        <LaTeXEditor
          initialLatex={latexSource}
          caseName={caseData?.name || 'Report'}
          onCompile={handleCompileLatex}
          onClose={() => setShowLatexEditor(false)}
          isCompiling={compilingLatex}
        />
      )}
    </div>
  );
};

export default ReportGeneration;
