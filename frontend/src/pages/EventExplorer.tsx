import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { Case, ScoredEvent } from '../types';

const EventExplorer: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const [minConfidence, setMinConfidence] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const { data: caseData } = useQuery<Case>({
    queryKey: ['case', caseId],
    queryFn: async () => {
      const response = await apiClient.getCase(Number(caseId));
      return response.data;
    },
  });

  const { data: scoredEvents } = useQuery<ScoredEvent[]>({
    queryKey: ['scored-events', caseId],
    queryFn: async () => {
      const response = await apiClient.getScoredEvents(Number(caseId));
      return response.data.results || response.data;
    },
  });

  const filteredEvents = scoredEvents?.filter((event) => {
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
  });

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
          <span className="text-white">Events</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Event Explorer</h1>
        <p className="text-gray-400">
          Raw events with ML confidence scores. Filter by confidence and search for specific events.
        </p>
      </div>

      {/* Action Bar */}
      <div className="mb-4 flex justify-end">
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
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Confidence Slider */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-3">
              Minimum Confidence Score: {minConfidence}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={minConfidence}
              onChange={(e) => setMinConfidence(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>0% (Show All)</span>
              <span>50% (Medium+)</span>
              <span>100% (Critical Only)</span>
            </div>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-3">
              Search Events
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by user, event type, or description..."
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 flex items-center space-x-6 text-sm">
          <div className="text-gray-400">
            Showing <span className="text-white font-semibold">{filteredEvents?.length || 0}</span> of{' '}
            <span className="text-white font-semibold">{scoredEvents?.length || 0}</span> events
          </div>
          {minConfidence > 0 && (
            <button
              onClick={() => {
                setMinConfidence(0);
                setSearchQuery('');
              }}
              className="text-blue-400 hover:text-blue-300 font-semibold"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Event Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Source IP
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Confidence
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {!filteredEvents || filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    <p>No events found matching your criteria</p>
                  </td>
                </tr>
              ) : (
                filteredEvents.map((event) => {
                  const score = event.confidence || 0;
                  const timestamp = event.parsed_event?.timestamp || event.timestamp;
                  const eventType = event.parsed_event?.event_type || event.event_type || 'Unknown';
                  const user = event.parsed_event?.user || 'N/A';
                  const srcIp = 'N/A'; // src_ip not in ParsedEvent type
                  const description =
                    event.parsed_event?.raw_message || event.raw_message || 'No description';
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
                            <div className="text-sm">
                              <h4 className="text-white font-semibold mb-2">Raw Event Data</h4>
                              <pre className="bg-black/50 rounded p-4 overflow-x-auto text-xs text-gray-300">
                                {JSON.stringify(event, null, 2)}
                              </pre>
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

      {/* Legend */}
      <div className="mt-6 bg-gray-800/50 border border-gray-700 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Confidence Score Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold text-red-400 bg-red-900/30">
              CRITICAL
            </span>
            <span className="text-gray-400">≥ 80%</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold text-yellow-400 bg-yellow-900/30">
              HIGH
            </span>
            <span className="text-gray-400">60-79%</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold text-blue-400 bg-blue-900/30">
              MEDIUM
            </span>
            <span className="text-gray-400">40-59%</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold text-green-400 bg-green-900/30">
              LOW
            </span>
            <span className="text-gray-400">0-39%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventExplorer;
