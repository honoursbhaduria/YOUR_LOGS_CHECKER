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
    <div className="px-4 sm:px-0 animate-fadeIn">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-2 text-sm text-gray-400 mb-2">
          <Link to="/cases" className="hover:text-gray-300">
            Cases
          </Link>
          <span>→</span>
          <span className="text-white">{caseData?.name}</span>
        </div>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-white font-mono">{caseData?.name}</h1>
            <p className="text-gray-400 mt-1">{caseData?.description}</p>
          </div>
          <span
            className={`px-3 py-1 text-sm font-semibold rounded font-mono ${
              caseData?.status === 'OPEN'
                ? 'bg-green-900 text-green-400 border border-green-700'
                : caseData?.status === 'IN_PROGRESS'
                ? 'bg-blue-900 text-blue-400 border border-blue-700'
                : 'bg-gray-800 text-gray-400 border border-gray-700'
            }`}
          >
            {caseData?.status}
          </span>
        </div>
      </div>

      {/* Processing Status Banner */}
      {evidenceFiles && evidenceFiles.some(f => !f.is_parsed) && (
        <div className="mb-6 bg-yellow-900 border border-yellow-700 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="text-yellow-400 font-mono text-xl">[..]</div>
            <div className="flex-1">
              <div className="text-yellow-300 font-semibold font-mono">
                Processing files in background...
              </div>
              <div className="text-yellow-200 text-sm mt-1 font-mono">
                {evidenceFiles.filter(f => !f.is_parsed).length} file(s) being parsed. 
                This page auto-refreshes every 5 seconds. Results will appear when ready.
              </div>
            </div>
            <div className="animate-pulse text-yellow-400 font-mono">●</div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-8">
        <div className="bg-gray-900 border border-gray-800 p-4 rounded-lg">
          <div className="text-sm text-gray-500 font-mono">Evidence Files</div>
          <div className="text-2xl font-bold text-white">
            {summary?.evidence_count || 0}
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 p-4 rounded-lg">
          <div className="text-sm text-gray-500 font-mono">Total Events</div>
          <div className="text-2xl font-bold text-white">
            {summary?.total_events || 0}
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 p-4 rounded-lg">
          <div className="text-sm text-gray-500 font-mono">High Risk</div>
          <div className="text-2xl font-bold text-white">
            {summary?.high_risk_events || 0}
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 p-4 rounded-lg">
          <div className="text-sm text-gray-500 font-mono">Critical</div>
          <div className="text-2xl font-bold text-white">
            {summary?.critical_events || 0}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Link
          to={`/cases/${caseId}/evidence`}
          className="block bg-gray-900 border border-gray-800 p-6 rounded-lg hover:border-blue-600 hover:bg-gray-800 transition text-center"
        >
          <div className="text-3xl mb-2 font-mono text-blue-500">[TBL]</div>
          <div className="font-semibold text-white font-mono">Evidence Table</div>
          <div className="text-sm text-gray-400">View all events</div>
        </Link>
        <Link
          to={`/cases/${caseId}/story`}
          className="block bg-gray-900 border border-gray-800 p-6 rounded-lg hover:border-blue-600 hover:bg-gray-800 transition text-center"
        >
          <div className="text-3xl mb-2 font-mono text-blue-500">[NRT]</div>
          <div className="font-semibold text-white font-mono">Story View</div>
          <div className="text-sm text-gray-400">Attack narratives</div>
        </Link>
        <button
          onClick={() => apiClient.generateReport(Number(caseId))}
          className="bg-gray-900 border border-gray-800 p-6 rounded-lg hover:border-blue-600 hover:bg-gray-800 transition text-center"
        >
          <div className="text-3xl mb-2 font-mono text-blue-500">[RPT]</div>
          <div className="font-semibold text-white font-mono">Generate Report</div>
          <div className="text-sm text-gray-400">PDF export</div>
        </button>
      </div>

      {/* Upload Section */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4 font-mono">
          &gt; upload_evidence()
        </h2>
        
        {uploadMutation.isPending && (
          <div className="mb-4 p-3 bg-blue-900 border border-blue-700 rounded text-blue-300 font-mono">
            [...] Uploading file...
          </div>
        )}
        
        {uploadMutation.isSuccess && (
          <div className="mb-4 p-3 bg-green-900 border border-green-700 rounded text-green-300 font-mono">
            [OK] File uploaded successfully!
          </div>
        )}
        
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
            isDragActive
              ? 'border-blue-600 bg-gray-800'
              : 'border-gray-600 hover:border-gray-500'
          }`}
        >
          <input {...getInputProps()} />
          <div className="text-4xl mb-3 font-mono text-blue-500">[UPLOAD]</div>
          {isDragActive ? (
            <p className="text-gray-300 font-mono">Drop the files here...</p>
          ) : (
            <>
              <p className="text-gray-300 font-medium">
                Drag & drop log files here, or click to select
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Supports: CSV, Syslog, JSON, TXT
              </p>
            </>
          )}
        </div>
      </div>

      {/* Evidence Files List */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white font-mono">&gt; evidence_files.list()</h2>
          <div className="text-sm text-gray-400 mt-1 font-mono">
            {evidenceFiles?.length || 0} file{evidenceFiles?.length !== 1 ? 's' : ''} uploaded
          </div>
        </div>
        <div className="divide-y divide-gray-800">
          {!evidenceFiles || evidenceFiles.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500 font-mono">
              [EMPTY] No evidence files uploaded yet
            </div>
          ) : (
            evidenceFiles.map((file) => (
              <div key={file.id} className="px-6 py-4 hover:bg-gray-800 transition">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="font-medium text-white font-mono text-lg">{file.filename}</div>
                    <div className="text-sm text-gray-400 mt-1 font-mono">
                      {file.log_type} • {(file.file_size / 1024).toFixed(2)} KB •{' '}
                      {file.event_count} events parsed
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Uploaded: {new Date(file.uploaded_at).toLocaleString()} | Hash: {file.file_hash.substring(0, 16)}...
                    </div>
                  </div>
                  <div className="ml-4">
                    {file.is_parsed ? (
                      <span className="px-2 py-1 text-xs font-semibold bg-green-900 text-green-400 border border-green-700 rounded font-mono">
                        [OK] Complete
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold bg-yellow-900 text-yellow-400 border border-yellow-700 rounded font-mono">
                        [..] Processing
                      </span>
                    )}
                  </div>
                </div>

                {/* Processing Pipeline Status */}
                <div className="mt-3 bg-black border border-gray-700 rounded p-3">
                  <div className="text-xs text-gray-400 font-mono mb-2">&gt; Processing Pipeline:</div>
                  <div className="space-y-2">
                    {/* Step 1: Upload */}
                    <div className="flex items-center space-x-2 text-xs font-mono">
                      <span className="text-green-400">[OK]</span>
                      <span className="text-gray-300">STEP 1: File Upload</span>
                      <span className="text-gray-500">- Completed</span>
                    </div>

                    {/* Step 2: Hash Calculation */}
                    <div className="flex items-center space-x-2 text-xs font-mono">
                      <span className="text-green-400">[OK]</span>
                      <span className="text-gray-300">STEP 2: Hash Calculation</span>
                      <span className="text-gray-500">- SHA-256 verified</span>
                    </div>

                    {/* Step 3: Log Parsing */}
                    <div className="flex items-center space-x-2 text-xs font-mono">
                      {file.is_parsed ? (
                        <>
                          <span className="text-green-400">[OK]</span>
                          <span className="text-gray-300">STEP 3: Log Parsing</span>
                          <span className="text-gray-500">- {file.event_count} events extracted</span>
                        </>
                      ) : (
                        <>
                          <span className="text-yellow-400">[..]</span>
                          <span className="text-gray-300">STEP 3: Log Parsing</span>
                          <span className="text-yellow-400">- In progress... (may take 1-3 min)</span>
                        </>
                      )}
                    </div>

                    {/* Step 4: ML Scoring */}
                    <div className="flex items-center space-x-2 text-xs font-mono">
                      {file.is_parsed && file.event_count > 0 ? (
                        <>
                          <span className="text-green-400">[OK]</span>
                          <span className="text-gray-300">STEP 4: ML Scoring</span>
                          <span className="text-gray-500">- Ready for analysis</span>
                        </>
                      ) : !file.is_parsed ? (
                        <>
                          <span className="text-gray-600">[--]</span>
                          <span className="text-gray-500">STEP 4: ML Scoring</span>
                          <span className="text-gray-600">- Waiting for parsing</span>
                        </>
                      ) : (
                        <>
                          <span className="text-yellow-400">[..]</span>
                          <span className="text-gray-300">STEP 4: ML Scoring</span>
                          <span className="text-yellow-400">- Processing...</span>
                        </>
                      )}
                    </div>

                    {/* Step 5: Story Generation */}
                    <div className="flex items-center space-x-2 text-xs font-mono">
                      {file.is_parsed && file.event_count > 0 ? (
                        <>
                          <span className="text-blue-400">[&gt;&gt;]</span>
                          <span className="text-gray-300">STEP 5: Story Generation</span>
                          <span className="text-blue-400">- Navigate to &quot;Story&quot; tab</span>
                        </>
                      ) : (
                        <>
                          <span className="text-gray-600">[--]</span>
                          <span className="text-gray-500">STEP 5: Story Generation</span>
                          <span className="text-gray-600">- Pending completion</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Processing Info */}
                  {!file.is_parsed && (
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <div className="text-xs text-yellow-400 font-mono">
                        ⚡ Processing in background...
                      </div>
                      <div className="text-xs text-gray-500 font-mono mt-1">
                        • Parsing large files may take 2-5 minutes
                      </div>
                      <div className="text-xs text-gray-500 font-mono">
                        • Refresh this page to see updated status
                      </div>
                      <div className="text-xs text-gray-500 font-mono">
                        • Results will appear in Evidence & Story tabs
                      </div>
                    </div>
                  )}

                  {file.is_parsed && file.event_count > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <div className="text-xs text-green-400 font-mono">
                        ✓ Processing complete! Next steps:
                      </div>
                      <div className="text-xs text-gray-500 font-mono mt-1">
                        • View parsed events in "Evidence" tab
                      </div>
                      <div className="text-xs text-gray-500 font-mono">
                        • Generate attack story in "Story" tab
                      </div>
                      <div className="text-xs text-gray-500 font-mono">
                        • Export findings via "Generate Report"
                      </div>
                    </div>
                  )}

                  {file.parse_error && (
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <div className="text-xs text-red-400 font-mono">
                        [ERROR] Parsing failed: {file.parse_error}
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
