import React, { useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { apiClient } from '../api/client';
import type { Case, EvidenceFile } from '../types';

const CaseDetail: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const queryClient = useQueryClient();

  const { data: caseData } = useQuery<Case>({
    queryKey: ['case', caseId],
    queryFn: async () => {
      const response = await apiClient.getCase(Number(caseId));
      return response.data;
    },
  });

  const { data: summary } = useQuery({
    queryKey: ['case-summary', caseId],
    queryFn: async () => {
      const response = await apiClient.getCaseSummary(Number(caseId));
      return response.data;
    },
  });

  const { data: evidenceFiles } = useQuery<EvidenceFile[]>({
    queryKey: ['evidence', caseId],
    queryFn: async () => {
      const response = await apiClient.getEvidenceFiles(Number(caseId));
      return response.data.results || response.data;
    },
    refetchInterval: (query) => {
      // Auto-refresh every 5 seconds if any files are still processing
      const files = query.state.data;
      if (!files || !Array.isArray(files)) return false;
      const hasProcessing = files.some((file: EvidenceFile) => !file.is_parsed);
      return hasProcessing ? 5000 : false;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => apiClient.uploadEvidence(Number(caseId), file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence', caseId] });
      queryClient.invalidateQueries({ queryKey: ['case-summary', caseId] });
      // Auto-dismiss success message after 3 seconds
      setTimeout(() => {
        uploadMutation.reset();
      }, 3000);
    },
    onError: (error: any) => {
      console.error('Upload error:', error);
      const errorMsg = error.response?.data?.detail || error.message || 'Unknown error';
      alert(`[ERROR] Upload failed: ${errorMsg}`);
    },
  });

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      acceptedFiles.forEach((file) => {
        uploadMutation.mutate(file);
      });
    },
    [uploadMutation]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'text/plain': ['.log', '.txt'],
      'application/json': ['.json'],
    },
  });

  return (
    <div className="px-4 sm:px-0">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-2 text-sm text-zinc-500 mb-3">
          <Link to="/cases" className="hover:text-zinc-100 transition-colors">
            Cases
          </Link>
          <span>→</span>
          <span className="text-zinc-400">{caseData?.name}</span>
        </div>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-100">{caseData?.name}</h1>
            <p className="text-zinc-500 text-sm mt-2">{caseData?.description}</p>
          </div>
          <span
            className={`px-3 py-1 text-xs font-medium rounded-lg ${
              caseData?.status === 'OPEN'
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-900'
                : caseData?.status === 'IN_PROGRESS'
                ? 'bg-indigo-950 text-indigo-400 border border-indigo-900'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
            }`}
          >
            {caseData?.status}
          </span>
        </div>
      </div>

      {/* Processing Status Banner */}
      {evidenceFiles && evidenceFiles.some(f => !f.is_parsed) && (
        <div className="mb-6 bg-amber-950 border border-amber-900 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="text-amber-400 text-sm font-medium">Processing</div>
            <div className="flex-1">
              <div className="text-amber-300 text-sm">
                {evidenceFiles.filter(f => !f.is_parsed).length} file(s) being parsed
              </div>
              <div className="text-amber-400/70 text-xs mt-1">
                Page refreshes every 5 seconds
              </div>
            </div>
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-lg hover:border-zinc-700 transition-colors">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Evidence Files</div>
          <div className="text-2xl font-semibold text-zinc-100">
            {summary?.evidence_count || 0}
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-lg hover:border-zinc-700 transition-colors">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Total Events</div>
          <div className="text-2xl font-semibold text-zinc-100">
            {summary?.total_events || 0}
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-lg hover:border-zinc-700 transition-colors">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">High Risk</div>
          <div className="text-2xl font-semibold text-zinc-100">
            {summary?.high_risk_events || 0}
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-lg hover:border-zinc-700 transition-colors">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Critical</div>
          <div className="text-2xl font-semibold text-zinc-100">
            {summary?.critical_events || 0}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Link
          to={`/cases/${caseId}/evidence`}
          className="block bg-zinc-900 border border-zinc-800 p-6 rounded-lg hover:border-zinc-700 transition-colors"
        >
          <div className="text-sm text-zinc-500 mb-2">Evidence Table</div>
          <div className="text-base font-medium text-zinc-100">View all events</div>
        </Link>
        <Link
          to={`/cases/${caseId}/story`}
          className="block bg-zinc-900 border border-zinc-800 p-6 rounded-lg hover:border-zinc-700 transition-colors"
        >
          <div className="text-sm text-zinc-500 mb-2">Story View</div>
          <div className="text-base font-medium text-zinc-100">Attack narratives</div>
        </Link>
        <Link
          to={`/cases/${caseId}/report`}
          className="block bg-zinc-900 border border-zinc-800 p-6 rounded-lg hover:border-zinc-700 transition-colors"
        >
          <div className="text-sm text-zinc-500 mb-2">Generate Report</div>
          <div className="text-base font-medium text-zinc-100">PDF export</div>
        </Link>
      </div>

      {/* Upload Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-8">
        <h2 className="text-base font-medium text-zinc-100 mb-4">
          Upload Evidence
        </h2>
        
        {uploadMutation.isPending && (
          <div className="mb-4 p-3 bg-indigo-950 border border-indigo-900 rounded-lg text-indigo-400 text-sm">
            Uploading file...
          </div>
        )}
        
        {uploadMutation.isSuccess && (
          <div className="mb-4 p-3 bg-emerald-950 border border-emerald-900 rounded-lg text-emerald-400 text-sm">
            File uploaded successfully
          </div>
        )}
        
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-zinc-600 bg-zinc-800'
              : 'border-zinc-700 hover:border-zinc-600'
          }`}
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <p className="text-zinc-400 text-sm">Drop the files here...</p>
          ) : (
            <>
              <p className="text-zinc-300 font-medium mb-2">
                Drag & drop log files here, or click to select
              </p>
              <p className="text-xs text-zinc-600">
                Supports: CSV, Syslog, JSON, TXT
              </p>
            </>
          )}
        </div>
      </div>

      {/* Evidence Files List */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
        <div className="px-6 py-4 border-b border-zinc-800">
          <h2 className="text-base font-medium text-zinc-100">Evidence Files</h2>
          <div className="text-sm text-zinc-500 mt-1">
            {evidenceFiles?.length || 0} file{evidenceFiles?.length !== 1 ? 's' : ''} uploaded
          </div>
        </div>
        <div className="divide-y divide-zinc-800">
          {!evidenceFiles || evidenceFiles.length === 0 ? (
            <div className="px-6 py-12 text-center text-zinc-600 text-sm">
              No evidence files uploaded yet
            </div>
          ) : (
            evidenceFiles.map((file) => (
              <div key={file.id} className="px-6 py-4 hover:bg-zinc-800/50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="font-medium text-zinc-100 text-base">{file.filename}</div>
                    <div className="text-sm text-zinc-500 mt-1">
                      {file.log_type} • {(file.file_size / 1024).toFixed(2)} KB •{' '}
                      {file.event_count} events parsed
                    </div>
                    <div className="text-xs text-zinc-600 mt-1">
                      {new Date(file.uploaded_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="ml-4">
                    {file.is_parsed ? (
                      <span className="px-2 py-1 text-xs font-medium bg-emerald-950 text-emerald-400 border border-emerald-900 rounded-lg">
                        Complete
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium bg-amber-950 text-amber-400 border border-amber-900 rounded-lg">
                        Processing
                      </span>
                    )}
                  </div>
                </div>

                {/* Processing Pipeline Status */}
                <div className="mt-3 bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                  <div className="text-xs text-zinc-600 mb-2">Processing Pipeline</div>
                  <div className="space-y-2">
                    {/* Step 1: Upload */}
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-emerald-400">✓</span>
                      <span className="text-zinc-400">File Upload</span>
                      <span className="text-zinc-600">Completed</span>
                    </div>

                    {/* Step 2: Hash Calculation */}
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-emerald-400">✓</span>
                      <span className="text-zinc-400">Hash Calculation</span>
                      <span className="text-zinc-600">SHA-256 verified</span>
                    </div>

                    {/* Step 3: Log Parsing */}
                    <div className="flex items-center space-x-2 text-xs">
                      {file.is_parsed ? (
                        <>
                          <span className="text-emerald-400">✓</span>
                          <span className="text-zinc-400">Log Parsing</span>
                          <span className="text-zinc-600">{file.event_count} events extracted</span>
                        </>
                      ) : (
                        <>
                          <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-zinc-400">Log Parsing</span>
                          <span className="text-amber-400">In progress (1-3 min)</span>
                        </>
                      )}
                    </div>

                    {/* Step 4: ML Scoring */}
                    <div className="flex items-center space-x-2 text-xs">
                      {file.is_parsed && file.event_count > 0 ? (
                        <>
                          <span className="text-emerald-400">✓</span>
                          <span className="text-zinc-400">ML Scoring</span>
                          <span className="text-zinc-600">Ready for analysis</span>
                        </>
                      ) : !file.is_parsed ? (
                        <>
                          <span className="text-zinc-600">○</span>
                          <span className="text-zinc-600">ML Scoring</span>
                          <span className="text-zinc-700">Waiting</span>
                        </>
                      ) : (
                        <>
                          <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-zinc-400">ML Scoring</span>
                          <span className="text-amber-400">Processing</span>
                        </>
                      )}
                    </div>

                    {/* Step 5: Story Generation */}
                    <div className="flex items-center space-x-2 text-xs">
                      {file.is_parsed && file.event_count > 0 ? (
                        <>
                          <span className="text-indigo-400">→</span>
                          <span className="text-zinc-400">Story Generation</span>
                          <span className="text-indigo-400">Navigate to Story tab</span>
                        </>
                      ) : (
                        <>
                          <span className="text-zinc-600">○</span>
                          <span className="text-zinc-600">Story Generation</span>
                          <span className="text-zinc-700">Pending</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Processing Info */}
                  {!file.is_parsed && (
                    <div className="mt-3 pt-3 border-t border-zinc-800">
                      <div className="text-xs text-amber-400 font-medium mb-2">
                        Processing in background
                      </div>
                      <div className="text-xs text-zinc-600 space-y-1">
                        <div>• Large files may take 2-5 minutes</div>
                        <div>• Refresh page to see updated status</div>
                        <div>• Results appear in Evidence & Story tabs</div>
                      </div>
                    </div>
                  )}

                  {file.is_parsed && file.event_count > 0 && (
                    <div className="mt-3 pt-3 border-t border-zinc-800">
                      <div className="text-xs text-emerald-400 font-medium mb-2">
                        Processing complete
                      </div>
                      <div className="text-xs text-zinc-600 space-y-1">
                        <div>• View parsed events in Evidence tab</div>
                        <div>• Generate attack story in Story tab</div>
                        <div>• Export findings via Generate Report</div>
                      </div>
                    </div>
                  )}

                  {file.parse_error && (
                    <div className="mt-3 pt-3 border-t border-zinc-800">
                      <div className="text-xs text-red-400 font-medium">
                        Parsing failed: {file.parse_error}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CaseDetail;
