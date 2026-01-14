import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { Case, StoryPattern } from '../types';

// Attack stages with colors and icons
const ATTACK_STAGES = [
  { id: 'reconnaissance', name: 'Reconnaissance', icon: '🔍', color: 'from-purple-600 to-purple-800' },
  { id: 'initial_access', name: 'Initial Access', icon: '🚪', color: 'from-blue-600 to-blue-800' },
  { id: 'execution', name: 'Execution', icon: '⚡', color: 'from-yellow-600 to-yellow-800' },
  { id: 'persistence', name: 'Persistence', icon: '📌', color: 'from-orange-600 to-orange-800' },
  { id: 'privilege_escalation', name: 'Privilege Escalation', icon: '⬆️', color: 'from-red-600 to-red-800' },
  { id: 'defense_evasion', name: 'Defense Evasion', icon: '🎭', color: 'from-pink-600 to-pink-800' },
  { id: 'credential_access', name: 'Credential Access', icon: '🔑', color: 'from-indigo-600 to-indigo-800' },
  { id: 'discovery', name: 'Discovery', icon: '🗺️', color: 'from-teal-600 to-teal-800' },
  { id: 'lateral_movement', name: 'Lateral Movement', icon: '↔️', color: 'from-cyan-600 to-cyan-800' },
  { id: 'collection', name: 'Collection', icon: '📦', color: 'from-green-600 to-green-800' },
  { id: 'exfiltration', name: 'Exfiltration', icon: '📤', color: 'from-red-700 to-red-900' },
  { id: 'impact', name: 'Impact', icon: '💥', color: 'from-gray-600 to-gray-800' },
];

const AttackStory: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();

  const { data: caseData } = useQuery<Case>({
    queryKey: ['case', caseId],
    queryFn: async () => {
      const response = await apiClient.getCase(Number(caseId));
      return response.data;
    },
  });

  const { data: stories } = useQuery<StoryPattern[]>({
    queryKey: ['stories', caseId],
    queryFn: async () => {
      const response = await apiClient.getStories(Number(caseId));
      return response.data.results || response.data;
    },
  });

  // Group stories by stage
  const storiesByStage = stories?.reduce((acc, story) => {
    const stage = story.attack_phase || 'unknown';
    if (!acc[stage]) acc[stage] = [];
    acc[stage].push(story);
    return acc;
  }, {} as Record<string, StoryPattern[]>);

  const getSeverityBadge = (severity?: string) => {
    const sev = severity?.toLowerCase() || 'info';
    if (sev === 'critical')
      return <span className="px-2 py-1 bg-red-900/50 text-red-400 border border-red-700 rounded text-xs font-bold">CRITICAL</span>;
    if (sev === 'high')
      return <span className="px-2 py-1 bg-orange-900/50 text-orange-400 border border-orange-700 rounded text-xs font-bold">HIGH</span>;
    if (sev === 'medium')
      return <span className="px-2 py-1 bg-yellow-900/50 text-yellow-400 border border-yellow-700 rounded text-xs font-bold">MEDIUM</span>;
    return <span className="px-2 py-1 bg-blue-900/50 text-blue-400 border border-blue-700 rounded text-xs font-bold">INFO</span>;
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
          <span className="text-white">Attack Story</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">🎯 Attack Story Timeline</h1>
            <p className="text-gray-400">
              AI-generated narrative of the attack based on high-confidence events
            </p>
          </div>
          <Link
            to={`/cases/${caseId}/report`}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition"
          >
            Generate Report
          </Link>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="bg-gradient-to-r from-red-900/30 to-orange-900/30 border border-red-700/50 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-bold text-white mb-3 flex items-center">
          <span className="text-2xl mr-2">📋</span>
          Executive Summary
        </h2>
        <div className="text-gray-300 space-y-2">
          <p>
            This investigation identified <span className="text-red-400 font-bold">{stories?.length || 0}</span> security patterns
            across <span className="text-yellow-400 font-bold">{Object.keys(storiesByStage || {}).length}</span> attack stages.
          </p>
          {stories && stories.length > 0 && (
            <p className="text-lg font-semibold text-white mt-4">
              {stories[0].narrative_text || 'No narrative generated yet. Processing events...'}
            </p>
          )}
        </div>
      </div>

      {/* Horizontal Timeline */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-6">Attack Progression</h2>
        
        {/* Timeline Container - Horizontal Scroll */}
        <div className="relative overflow-x-auto pb-8">
          <div className="flex space-x-6 min-w-max px-4">
            {ATTACK_STAGES.map((stage, index) => {
              const stageStories = storiesByStage?.[stage.id] || [];
              const hasActivity = stageStories.length > 0;

              return (
                <div key={stage.id} className="flex flex-col items-center">
                  {/* Timeline Node */}
                  <div className={`relative flex flex-col items-center ${hasActivity ? 'animate-pulse-slow' : ''}`}>
                    {/* Connector Line */}
                    {index > 0 && (
                      <div className="absolute top-8 right-full w-6 h-0.5 bg-gray-600" />
                    )}
                    
                    {/* Stage Circle */}
                    <div
                      className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-lg ${
                        hasActivity
                          ? `bg-gradient-to-br ${stage.color} ring-4 ring-white/20`
                          : 'bg-gray-700 opacity-50'
                      }`}
                    >
                      {stage.icon}
                    </div>
                    
                    {/* Stage Name */}
                    <div className="mt-3 text-center">
                      <p className={`text-sm font-bold ${hasActivity ? 'text-white' : 'text-gray-500'}`}>
                        {stage.name}
                      </p>
                      {hasActivity && (
                        <p className="text-xs text-gray-400 mt-1">
                          {stageStories.length} event{stageStories.length !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Stage Card */}
                  <div className="mt-6 w-80">
                    {hasActivity ? (
                      <div className={`bg-gradient-to-br ${stage.color}/20 border border-white/20 rounded-lg p-5 shadow-xl`}>
                        {stageStories.map((story, idx) => (
                          <div key={story.id} className={idx > 0 ? 'mt-4 pt-4 border-t border-white/10' : ''}>
                            {/* Severity Badge */}
                            <div className="flex items-center justify-between mb-2">
                              {getSeverityBadge('MEDIUM')}
                              <span className="text-xs text-gray-400">
                                {story.event_count} events
                              </span>
                            </div>

                            {/* Story Text */}
                            <p className="text-sm text-gray-200 mb-3 leading-relaxed">
                              {story.narrative_text || 'No description available'}
                            </p>

                            {/* Key Evidence */}

                            {/* Timestamp */}
                            {story.time_span_start && (
                              <p className="text-xs text-gray-500 mt-2">
                                ⏱️ {new Date(story.time_span_start).toLocaleString()}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-5 text-center">
                        <p className="text-sm text-gray-500">No activity detected</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detailed Findings */}
      {stories && stories.length > 0 && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Detailed Findings</h2>
          <div className="space-y-4">
            {stories.map((story, index) => (
              <div
                key={story.id}
                className="bg-gray-900/50 border border-gray-700 rounded-lg p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">
                      {ATTACK_STAGES.find((s) => s.id === story.attack_phase)?.icon || '🔍'}
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        Finding #{index + 1}:{' '}
                        {ATTACK_STAGES.find((s) => s.id === story.attack_phase)?.name || story.attack_phase}
                      </h3>
                      <p className="text-sm text-gray-400">{story.event_count} related events</p>
                    </div>
                  </div>
                  {getSeverityBadge('MEDIUM')}
                </div>

                <p className="text-gray-300 mb-4 leading-relaxed">{story.narrative_text}</p>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>
                    {story.time_span_start && `Started: ${new Date(story.time_span_start).toLocaleString()}`}
                  </span>
                  <span>Confidence: {Math.round((story.avg_confidence || 0) * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Stories Message */}
      {(!stories || stories.length === 0) && (
        <div className="text-center py-12 bg-gray-800/50 border border-gray-700 rounded-lg">
          <div className="text-6xl mb-4">🤔</div>
          <h3 className="text-xl font-semibold text-gray-300 mb-2">
            No Attack Story Generated Yet
          </h3>
          <p className="text-gray-500 mb-6">
            Upload and parse evidence files to generate an AI-powered attack narrative
          </p>
          <Link
            to={`/cases/${caseId}`}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold inline-block transition"
          >
            Upload Evidence
          </Link>
        </div>
      )}
    </div>
  );
};

export default AttackStory;
