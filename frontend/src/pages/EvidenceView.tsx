import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { ScoredEvent } from '../types';

const EvidenceView: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const [threshold, setThreshold] = useState(0.7);
  const [filterRisk, setFilterRisk] = useState<string>('ALL');
  const queryClient = useQueryClient();

  const { data: events, isLoading } = useQuery<ScoredEvent[]>({
    queryKey: ['scored-events', caseId],
    queryFn: async () => {
      const response = await apiClient.getScoredEvents({
        parsed_event__evidence_file__case: caseId,
      });
      return response.data.results || response.data;
    },
  });

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

  const filteredEvents = events?.filter((event) => {
    if (filterRisk !== 'ALL' && event.risk_label !== filterRisk) {
      return false;
    }
    if (event.is_archived) {
      return false;
    }
    return true;
  });

  return (
    <div className="px-4 sm:px-0 animate-fadeIn relative">
      <h1 className="text-3xl font-bold text-white mb-6 font-mono">$ query evidence --filter=scored</h1>
      <p className="text-gray-500 font-mono text-sm mb-6">&gt; SELECT * FROM scored_events WHERE confidence &gt; {threshold.toFixed(2)};</p>

      {/* Filters */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Threshold Slider */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Confidence Threshold: {threshold.toFixed(2)}
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
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0.0</span>
              <span>0.5</span>
              <span>1.0</span>
            </div>
            <button
              onClick={handleApplyThreshold}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              Apply Threshold
            </button>
          </div>

          {/* Risk Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Risk Level Filter
            </label>
            <div className="flex space-x-2">
              {['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((risk) => (
                <button
                  key={risk}
                  onClick={() => setFilterRisk(risk)}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    filterRisk === risk
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
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
      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-800">
          <thead className="bg-black">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider font-mono">
                Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider font-mono">
                Event Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider font-mono">
                Confidence
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider font-mono">
                Risk
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider font-mono">
                Explanation
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-900 divide-y divide-gray-800">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-400">
                  Loading events...
                </td>
              </tr>
            ) : filteredEvents && filteredEvents.length > 0 ? (
              filteredEvents.map((event) => (
                <tr key={event.id} className="hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-mono">
                    {new Date(event.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-white font-mono">
                    {event.event_type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-800 rounded-full h-2 mr-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${event.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-white font-mono">
                        {event.confidence.toFixed(2)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded font-mono risk-${event.risk_label.toLowerCase()}`}
                    >
                      {event.risk_label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {event.inference_text || (
                      <span className="text-gray-500 italic">
                        No explanation yet
                      </span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-400">
                  No events match the current filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredEvents && (
        <div className="mt-4 text-sm text-gray-400 text-center">
          Showing {filteredEvents.length} of {events?.length || 0} events
        </div>
      )}
    </div>
  );
};

export default EvidenceView;
