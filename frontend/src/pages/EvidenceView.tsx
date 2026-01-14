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
    <div className="px-4 sm:px-0">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-100">Evidence Explorer</h1>
        <p className="text-zinc-500 text-sm mt-2">Filter and analyze scored security events</p>
      </div>

      {/* Filters */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Threshold Slider */}
          <div>
            <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-3">
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
            <div className="flex justify-between text-xs text-zinc-600 mt-2">
              <span>0.0</span>
              <span>0.5</span>
              <span>1.0</span>
            </div>
            <button
              onClick={handleApplyThreshold}
              className="btn-primary mt-4"
            >
              Apply Threshold
            </button>
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
                  Loading events...
                </td>
              </tr>
            ) : filteredEvents && filteredEvents.length > 0 ? (
              filteredEvents.map((event) => (
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

      {filteredEvents && (
        <div className="mt-6 text-sm text-zinc-600 text-center">
          Showing {filteredEvents.length} of {events?.length || 0} events
        </div>
      )}
    </div>
  );
};

export default EvidenceView;
