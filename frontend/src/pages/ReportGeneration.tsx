import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { Case, Report } from '../types';
import LaTeXEditor from '../components/LaTeXEditor';

interface ReportCapabilities {
  pdf_compilation: boolean;
  latex_preview: boolean;
  csv_export: boolean;
  message: string;
}

interface AIAnalysis {
  summary: string;
  risk_assessment: string;
  key_findings: string[];
  recommendations: string[];
  risk_counts: { CRITICAL: number; HIGH: number; MEDIUM: number; LOW: number };
  event_count: number;
  case_name: string;
  generated_by: string;
  error?: string;
}

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
  const [capabilities, setCapabilities] = useState<ReportCapabilities | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  // Check server capabilities on mount
  useEffect(() => {
    const checkCapabilities = async () => {
      try {
        const response = await apiClient.getReportCapabilities();
        setCapabilities(response.data);
      } catch (error) {
        console.error('Failed to check report capabilities:', error);
      }
    };
    checkCapabilities();
  }, []);

  // Fetch AI analysis on mount
  const fetchAIAnalysis = async () => {
    setLoadingAI(true);
    try {
      const response = await apiClient.getAIAnalysis(Number(caseId));
      setAiAnalysis(response.data);
    } catch (error: any) {
      console.error('Failed to get AI analysis:', error);
      setErrorMessage('Failed to load AI analysis: ' + (error.message || 'Unknown error'));
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setLoadingAI(false);
    }
  };

  useEffect(() => {
    if (caseId) {
      fetchAIAnalysis();
    }
  }, [caseId]);

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
      
      setSuccessMessage('Report downloaded! Contains PDF + CSV data.');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error: any) {
      setErrorMessage('Failed to download report: ' + (error.message || 'Unknown error'));
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
      // Always set fallback_to_tex=true for downloads, false for preview
      const response = await apiClient.compileCustomLatex(
        customLatexSource,
        `report_case_${caseId}_custom.pdf`,
        download // fallback_to_tex - enabled for download, disabled for preview
      );
      
      // Check content type to determine if we got PDF or TEX
      const contentType = response.headers['content-type'] || '';
      const isPdf = contentType.includes('pdf');
      const isTex = contentType.includes('tex') || contentType.includes('text/x-tex');
      
      if (download) {
        const blob = new Blob([response.data], { 
          type: isPdf ? 'application/pdf' : 'text/x-tex' 
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Use appropriate extension
        const extension = isPdf ? '.pdf' : '.tex';
        link.setAttribute('download', `report_case_${caseId}_custom${extension}`);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        if (isTex) {
          setSuccessMessage('LaTeX source (.tex) downloaded! PDF compilation not available on server. Use Overleaf or local LaTeX to compile.');
        } else {
          setSuccessMessage('PDF report compiled and downloaded successfully!');
        }
        setTimeout(() => setSuccessMessage(''), 7000);
        return blob;
      } else {
        // For preview, we need PDF - if we got .tex, return null
        if (isTex) {
          setErrorMessage('PDF preview not available. Use "Compile & Download" to get the .tex file.');
          setTimeout(() => setErrorMessage(''), 5000);
          return null;
        }
        return new Blob([response.data], { type: 'application/pdf' });
      }
    } catch (error: any) {
      setErrorMessage('Failed to compile: ' + (error.response?.data?.error || error.message || 'Unknown error'));
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

      {/* AI Analysis Section */}
      <div className="bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-800 rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🤖</span>
            <div>
              <h2 className="text-lg font-medium text-zinc-100">AI-Powered Analysis</h2>
              <p className="text-xs text-zinc-500">Powered by Gemini AI</p>
            </div>
          </div>
          <button
            onClick={fetchAIAnalysis}
            disabled={loadingAI}
            className="btn-secondary text-sm"
          >
            {loadingAI ? 'Analyzing...' : '🔄 Refresh Analysis'}
          </button>
        </div>

        {loadingAI ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-zinc-500 border-t-emerald-500 rounded-full"></div>
            <span className="ml-3 text-zinc-400">Analyzing logs with Gemini AI...</span>
          </div>
        ) : aiAnalysis ? (
          <div className="space-y-6">
            {/* Executive Summary */}
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-zinc-300 mb-2">📋 Executive Summary</h3>
              <p className="text-zinc-100">{aiAnalysis.summary}</p>
            </div>

            {/* Risk Overview */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-zinc-100">{aiAnalysis.event_count}</p>
                <p className="text-xs text-zinc-500">Total Events</p>
              </div>
              <div className="bg-red-950/50 border border-red-900/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-red-400">{aiAnalysis.risk_counts?.CRITICAL || 0}</p>
                <p className="text-xs text-red-400">Critical</p>
              </div>
              <div className="bg-orange-950/50 border border-orange-900/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-orange-400">{aiAnalysis.risk_counts?.HIGH || 0}</p>
                <p className="text-xs text-orange-400">High</p>
              </div>
              <div className="bg-yellow-950/50 border border-yellow-900/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-yellow-400">{aiAnalysis.risk_counts?.MEDIUM || 0}</p>
                <p className="text-xs text-yellow-400">Medium</p>
              </div>
              <div className="bg-emerald-950/50 border border-emerald-900/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-emerald-400">{aiAnalysis.risk_counts?.LOW || 0}</p>
                <p className="text-xs text-emerald-400">Low</p>
              </div>
            </div>

            {/* Risk Assessment */}
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-zinc-300 mb-2">⚠️ Risk Assessment</h3>
              <p className="text-zinc-100">{aiAnalysis.risk_assessment}</p>
            </div>

            {/* Key Findings & Recommendations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Key Findings */}
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-zinc-300 mb-3">🔍 Key Findings</h3>
                <ul className="space-y-2">
                  {aiAnalysis.key_findings?.length > 0 ? (
                    aiAnalysis.key_findings.map((finding, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <span className="text-emerald-500 mt-1">•</span>
                        <span className="text-zinc-300 text-sm">{finding}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-zinc-500 text-sm">No specific findings identified</li>
                  )}
                </ul>
              </div>

              {/* Recommendations */}
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-zinc-300 mb-3">✅ Recommendations</h3>
                <ul className="space-y-2">
                  {aiAnalysis.recommendations?.length > 0 ? (
                    aiAnalysis.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <span className="text-blue-500 mt-1">{idx + 1}.</span>
                        <span className="text-zinc-300 text-sm">{rec}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-zinc-500 text-sm">No recommendations available</li>
                  )}
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="text-xs text-zinc-600 text-center pt-2 border-t border-zinc-800">
              Generated by {aiAnalysis.generated_by} • Case: {aiAnalysis.case_name}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-zinc-500">
            <p>No analysis available. Click "Refresh Analysis" to generate.</p>
          </div>
        )}
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
