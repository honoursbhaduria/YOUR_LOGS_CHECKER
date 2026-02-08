import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { ScoredEvent } from '../types';

const EvidenceView: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const [threshold, setThreshold] = useState(0.0); // Start at 0 to show all events
  const [filterRisk, setFilterRisk] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const queryClient = useQueryClient();

  // Fetch ALL events by requesting a very large page size
  const { data: eventsResponse, isLoading, error } = useQuery({
    queryKey: ['scored-events', caseId],
    queryFn: async () => {
      console.log('Fetching scored events for case:', caseId);
      const response = await apiClient.getScoredEvents({
        parsed_event__evidence_file__case: caseId,
        page_size: 10000, // Fetch all events at once
      });
      console.log('Received events response:', response.data);
      return response.data;
    },
    enabled: !!caseId, // Only run query if caseId exists
  });

  const events = eventsResponse?.results || eventsResponse || [];
  const totalCount = eventsResponse?.count || events.length;

  console.log('Events array:', events);
  console.log('Total count:', totalCount);
  console.log('Case ID:', caseId);

  const applyThresholdMutation = useMutation({
    mutationFn: (threshold: number) =>
      apiClient.applyThreshold(Number(caseId), threshold),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scored-events', caseId] });
    },
  });

  const handleApplyThreshold = () => {
    applyThresholdMutation.mutate(threshold);
  };

  const filteredEvents = events?.filter((event: ScoredEvent) => {
    // Filter by confidence threshold
    if (event.confidence < threshold) {
      return false;
    }
    
    // Filter by risk level
    if (filterRisk !== 'ALL' && event.risk_label !== filterRisk) {
      return false;
    }
    
    // Hide archived events
    if (event.is_archived) {
      return false;
    }
    
    return true;
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterRisk, threshold]);

  // Calculate pagination
  const totalPages = Math.ceil((filteredEvents?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEvents = filteredEvents?.slice(startIndex, endIndex) || [];

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    pages.push(1);

    if (currentPage > 3) {
      pages.push('...');
    }

    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push('...');
    }

    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="px-4 sm:px-0">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-100">Evidence Explorer</h1>
        <p className="text-zinc-500 text-sm mt-2">Filter and analyze scored security events</p>
        {!caseId && (
          <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-600/50 rounded-lg text-yellow-400 text-sm">
            ⚠️ No case ID found. Please navigate from a specific investigation case.
          </div>
        )}
        {error && (
          <div className="mt-4 p-4 bg-red-900/20 border border-red-600/50 rounded-lg text-red-400 text-sm">
            ❌ Error loading events: {(error as Error).message}
          </div>
        )}
        {!isLoading && events.length === 0 && caseId && (
          <div className="mt-4 p-4 bg-blue-900/20 border border-blue-600/50 rounded-lg text-blue-400 text-sm">
            ℹ️ No scored events found for this case. Upload and process log files first.
          </div>
        )}
        {!isLoading && events.length > 0 && (
          <div className="mt-4 p-4 bg-green-900/20 border border-green-600/50 rounded-lg text-green-400 text-sm">
            ✓ Loaded {totalCount} scored events from this investigation
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Threshold Slider */}
          <div>
            <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-3">
              Minimum Confidence: {threshold.toFixed(2)} ({Math.round(threshold * 100)}%)
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-zinc-600 mt-2">
              <span>0% (All)</span>
              <span>50%</span>
              <span>100% (Highest)</span>
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              Filters events in real-time. Move slider to adjust.
            </p>
          </div>

          {/* Risk Filter */}
          <div>
            <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-3">
              Risk Level Filter
            </label>
            <div className="flex flex-wrap gap-2">
              {['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((risk) => (
                <button
                  key={risk}
                  onClick={() => setFilterRisk(risk)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filterRisk === risk
                      ? 'bg-zinc-100 text-zinc-900'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  {risk}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-zinc-800">
          <thead className="bg-zinc-950">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Event Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Confidence
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Risk
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Explanation
              </th>
            </tr>
          </thead>
          <tbody className="bg-zinc-900 divide-y divide-zinc-800">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-zinc-600 text-sm">
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="animate-spin h-5 w-5 text-zinc-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Loading events...</span>
                  </div>
                </td>
              </tr>
            ) : !caseId ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-yellow-400 text-sm">
                  No case selected. Please navigate from an investigation case.
                </td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-zinc-500 text-sm">
                  <div className="space-y-2">
                    <div>No scored events found for this investigation.</div>
                    <div className="text-xs text-zinc-600">
                      Events will appear here after:
                      <br />1. Uploading log files
                      <br />2. Parsing completes (check Case Detail page)
                      <br />3. ML scoring completes (automatic after parsing)
                    </div>
                  </div>
                </td>
              </tr>
            ) : paginatedEvents && paginatedEvents.length > 0 ? (
              paginatedEvents.map((event: ScoredEvent) => (
                <tr key={event.id} className="hover:bg-zinc-800/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-300">
                    {new Date(event.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-100">
                    {event.event_type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-12 bg-zinc-800 rounded-full h-1.5">
                        <div
                          className="bg-zinc-400 h-1.5 rounded-full"
                          style={{ width: `${event.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-zinc-400 min-w-[2.5rem]">
                        {event.confidence.toFixed(2)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-lg risk-${event.risk_label.toLowerCase()}`}
                    >
                      {event.risk_label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-400">
                    {event.inference_text || (
                      <span className="text-zinc-600 italic">
                        No explanation yet
                      </span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-zinc-600 text-sm">
                  No events match the current filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {filteredEvents && filteredEvents.length > 0 && (
        <div className="mt-6 space-y-4">
          {/* Items per page selector */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-400">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredEvents.length)} of {filteredEvents.length} events
              {filteredEvents.length !== totalCount && (
                <span className="text-zinc-600"> (filtered from {totalCount} total)</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-zinc-400">Events per page:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-zinc-800 border border-zinc-700 text-zinc-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
              </select>
            </div>
          </div>

          {/* Page numbers */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-zinc-400 bg-zinc-800 border border-zinc-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-700 hover:text-zinc-300 transition-colors"
              >
                Previous
              </button>

              {getPageNumbers().map((page, index) => (
                <button
                  key={index}
                  onClick={() => typeof page === 'number' && handlePageChange(page)}
                  disabled={page === '...'}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    page === currentPage
                      ? 'bg-blue-600 text-white'
                      : page === '...'
                      ? 'text-zinc-600 cursor-default'
                      : 'text-zinc-400 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 hover:text-zinc-300'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-zinc-400 bg-zinc-800 border border-zinc-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-700 hover:text-zinc-300 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EvidenceView;
