import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { Case, ScoredEvent } from '../types';

const EventExplorer: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const [minConfidence, setMinConfidence] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const { data: caseData } = useQuery<Case>({
    queryKey: ['case', caseId],
    queryFn: async () => {
      const response = await apiClient.getCase(Number(caseId));
      return response.data;
    },
  });

  const { data: scoredEventsResponse } = useQuery({
    queryKey: ['scored-events', caseId],
    queryFn: async () => {
      const response = await apiClient.getScoredEvents({
        parsed_event__evidence_file__case: caseId,
        page_size: 10000,
      });
      return response.data;
    },
  });

  const scoredEvents = scoredEventsResponse?.results || scoredEventsResponse || [];

  const filteredEvents = Array.isArray(scoredEvents) ? scoredEvents.filter((event: ScoredEvent) => {
    const score = (event.confidence || 0) * 100;
    if (score < minConfidence) return false;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const user = event.parsed_event?.user || '';
      const eventType = event.parsed_event?.event_type || event.event_type || '';
      const description = event.parsed_event?.raw_message || event.raw_message || '';

      return (
        user.toLowerCase().includes(query) ||
        eventType.toLowerCase().includes(query) ||
        description.toLowerCase().includes(query)
      );
    }

    return true;
  }) : [];

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [minConfidence, searchQuery]);

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
    const showEllipsisThreshold = 7;

    if (totalPages <= showEllipsisThreshold) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-red-400 bg-red-900/30';
    if (score >= 0.6) return 'text-yellow-400 bg-yellow-900/30';
    if (score >= 0.4) return 'text-blue-400 bg-blue-900/30';
    return 'text-green-400 bg-green-900/30';
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 0.8) return 'CRITICAL';
    if (score >= 0.6) return 'HIGH';
    if (score >= 0.4) return 'MEDIUM';
    return 'LOW';
  };

  // Calculate stats
  const totalEvents = scoredEvents?.length || 0;
  const criticalAlerts = scoredEvents?.filter((e: ScoredEvent) => (e.confidence || 0) >= 0.8).length || 0;
  const highRisk = scoredEvents?.filter((e: ScoredEvent) => (e.confidence || 0) >= 0.6 && (e.confidence || 0) < 0.8).length || 0;
  const normalLogs = scoredEvents?.filter((e: ScoredEvent) => (e.confidence || 0) < 0.4).length || 0;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-2 text-sm text-zinc-500 mb-3">
          <Link to="/" className="hover:text-zinc-300 transition">
            Dashboard
          </Link>
          <span>→</span>
          <Link to="/cases" className="hover:text-zinc-300 transition">
            Investigations
          </Link>
          <span>→</span>
          <Link to={`/cases/${caseId}`} className="hover:text-zinc-300 transition">
            {caseData?.name}
          </Link>
          <span>→</span>
          <span className="text-zinc-100">Events</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Event Explorer</h1>
            <p className="text-zinc-400 text-base">
              Raw events with ML confidence scores. Filter by confidence and search for specific events.
            </p>
          </div>
          <button
            onClick={async () => {
              try {
                const response = await apiClient.exportEventsCSV(Number(caseId));
                const blob = new Blob([response.data], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `case_${caseId}_events.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
              } catch (error) {
                console.error('Failed to export CSV:', error);
                alert('Failed to export CSV file');
              }
            }}
            className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-600 rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total Events */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 border-l-4 border-l-blue-500">
          <div className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2">
            Total Events
          </div>
          <div className="text-white text-3xl font-bold">
            {totalEvents.toLocaleString()}
          </div>
        </div>

        {/* High Risk */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 border-l-4 border-l-yellow-500">
          <div className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2">
            High Risk
          </div>
          <div className="text-white text-3xl font-bold">
            {highRisk}
          </div>
        </div>

        {/* Critical Alerts */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 border-l-4 border-l-red-500">
          <div className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2">
            Critical Alerts
          </div>
          <div className="text-white text-3xl font-bold">
            {criticalAlerts}
          </div>
        </div>

        {/* Normal Logs */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 border-l-4 border-l-emerald-500">
          <div className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2">
            Normal Logs
          </div>
          <div className="text-white text-3xl font-bold">
            {normalLogs.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Confidence Slider */}
          <div>
            <label className="block text-sm font-semibold text-zinc-300 mb-3">
              Minimum Confidence Score: {minConfidence}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={minConfidence}
              onChange={(e) => setMinConfidence(Number(e.target.value))}
              className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-xs text-zinc-600 mt-2">
              <span>0% (Show All)</span>
              <span>50% (Medium+)</span>
              <span>100% (Critical Only)</span>
            </div>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-sm font-semibold text-zinc-300 mb-3">
              Search Events
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by user, event type, or description..."
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 flex items-center space-x-6 text-sm">
          <div className="text-zinc-500">
            Showing{' '}
            <span className="text-zinc-100 font-semibold">
              {filteredEvents?.length > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, filteredEvents?.length || 0)}
            </span>{' '}
            of <span className="text-zinc-100 font-semibold">{filteredEvents?.length || 0}</span> filtered
            {scoredEvents && filteredEvents?.length !== scoredEvents.length && (
              <span className="text-zinc-600"> ({scoredEvents.length} total)</span>
            )}
          </div>
          {(minConfidence > 0 || searchQuery) && (
            <button
              onClick={() => {
                setMinConfidence(0);
                setSearchQuery('');
              }}
              className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-800">
            <thead className="bg-zinc-950">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Event Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Source IP
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Confidence
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {!filteredEvents || filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                    <p>No events found matching your criteria</p>
                  </td>
                </tr>
              ) : (
                paginatedEvents.map((event) => {
                  const score = event.confidence || 0;
                  const timestamp = event.parsed_event?.timestamp || event.timestamp;
                  const eventType = event.parsed_event?.event_type || event.event_type || 'Unknown';
                  const user = event.parsed_event?.user || 'N/A';
                  const srcIp = event.parsed_event?.host || 'N/A';
                  const description =
                    event.parsed_event?.raw_message || event.raw_message || 'No description';
                  const extraData = event.parsed_event?.extra_data || {};
                  const isExpanded = expandedRow === event.id;

                  return (
                    <React.Fragment key={event.id}>
                      <tr className="hover:bg-gray-700/30 transition">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {timestamp ? new Date(timestamp).toLocaleString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded font-mono text-xs">
                            {eventType}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {user}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {srcIp}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400 max-w-md truncate">
                          {description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold ${getConfidenceColor(
                              score
                            )}`}
                          >
                            {getConfidenceLabel(score)} ({Math.round(score * 100)}%)
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                          <button
                            onClick={() => setExpandedRow(isExpanded ? null : event.id)}
                            className="text-blue-400 hover:text-blue-300 font-semibold"
                          >
                            {isExpanded ? 'Hide' : 'Expand'}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="px-6 py-4 bg-gray-900/50">
                            <div className="text-sm space-y-4">
                              <div>
                                <h4 className="text-white font-semibold mb-2">Event Details</h4>
                                <div className="grid grid-cols-2 gap-4 bg-black/50 rounded p-4">
                                  <div>
                                    <span className="text-gray-400">Timestamp:</span>
                                    <span className="text-white ml-2">
                                      {timestamp ? new Date(timestamp).toLocaleString() : 'N/A'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Event Type:</span>
                                    <span className="text-white ml-2">{eventType}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">User:</span>
                                    <span className="text-white ml-2">{user}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Source IP:</span>
                                    <span className="text-white ml-2">{srcIp}</span>
                                  </div>
                                  <div className="col-span-2">
                                    <span className="text-gray-400">Description:</span>
                                    <span className="text-white ml-2">{description}</span>
                                  </div>
                                  
                                  {/* Dynamic fields from extra_data */}
                                  {Object.keys(extraData).length > 0 && (
                                    <>
                                      <div className="col-span-2 border-t border-zinc-700 pt-3 mt-2">
                                        <h5 className="text-zinc-300 font-semibold mb-2">Additional Fields</h5>
                                      </div>
                                      {Object.entries(extraData).map(([key, value]) => (
                                        <div key={key}>
                                          <span className="text-zinc-400 capitalize">
                                            {key.replace(/_/g, ' ')}:
                                          </span>
                                          <span className="text-white ml-2">
                                            {value != null ? String(value) : 'N/A'}
                                          </span>
                                        </div>
                                      ))}
                                    </>
                                  )}
                                </div>
                              </div>
                              
                              <div>
                                <h4 className="text-white font-semibold mb-2">Raw Event Data (JSON)</h4>
                                <pre className="bg-black/50 rounded p-4 overflow-x-auto text-xs text-zinc-300">
                                  {JSON.stringify(event, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {filteredEvents && filteredEvents.length > 0 && (
        <div className="mt-6 bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Items per page selector */}
            <div className="flex items-center space-x-3">
              <label className="text-sm text-zinc-400">Events per page:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-gray-900 border border-gray-600 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
              </select>
            </div>

            {/* Page info and navigation */}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-zinc-400">
                Page {currentPage} of {totalPages}
              </span>

              <div className="flex items-center space-x-2">
                {/* Previous button */}
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded text-sm font-semibold transition-colors disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                {/* Page numbers */}
                <div className="hidden md:flex items-center space-x-1">
                  {getPageNumbers().map((page, index) => (
                    typeof page === 'number' ? (
                      <button
                        key={index}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-1.5 rounded text-sm font-semibold transition-colors ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'bg-zinc-700 hover:bg-zinc-600 text-white'
                        }`}
                      >
                        {page}
                      </button>
                    ) : (
                      <span key={index} className="px-2 text-zinc-500">
                        {page}
                      </span>
                    )
                  ))}
                </div>

                {/* Next button */}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded text-sm font-semibold transition-colors disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Confidence Score Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold text-red-400 bg-red-900/30">
              CRITICAL
            </span>
            <span className="text-zinc-400">≥ 80%</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold text-yellow-400 bg-yellow-900/30">
              HIGH
            </span>
            <span className="text-zinc-400">60-79%</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold text-blue-400 bg-blue-900/30">
              MEDIUM
            </span>
            <span className="text-zinc-400">40-59%</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold text-green-400 bg-green-900/30">
              LOW
            </span>
            <span className="text-zinc-400">0-39%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventExplorer;
