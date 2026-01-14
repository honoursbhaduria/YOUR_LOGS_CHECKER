import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { Case, StoryPattern } from '../types';

// Attack stages
const ATTACK_STAGES = [
  { id: 'reconnaissance', name: 'Reconnaissance' },
  { id: 'initial_access', name: 'Initial Access' },
  { id: 'execution', name: 'Execution' },
  { id: 'persistence', name: 'Persistence' },
  { id: 'privilege_escalation', name: 'Privilege Escalation' },
  { id: 'defense_evasion', name: 'Defense Evasion' },
  { id: 'credential_access', name: 'Credential Access' },
  { id: 'discovery', name: 'Discovery' },
  { id: 'lateral_movement', name: 'Lateral Movement' },
  { id: 'collection', name: 'Collection' },
  { id: 'exfiltration', name: 'Exfiltration' },
  { id: 'impact', name: 'Impact' },
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
      return <span className="px-2 py-1 bg-red-950 text-red-400 border border-red-900 rounded-lg text-xs font-medium">CRITICAL</span>;
    if (sev === 'high')
      return <span className="px-2 py-1 bg-orange-950 text-orange-400 border border-orange-900 rounded-lg text-xs font-medium">HIGH</span>;
    if (sev === 'medium')
      return <span className="px-2 py-1 bg-amber-950 text-amber-400 border border-amber-900 rounded-lg text-xs font-medium">MEDIUM</span>;
    return <span className="px-2 py-1 bg-indigo-950 text-indigo-400 border border-indigo-900 rounded-lg text-xs font-medium">INFO</span>;
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
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
          <span className="text-zinc-400">Attack Story</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-100 mb-2">Attack Story Timeline</h1>
            <p className="text-zinc-500 text-sm">
              AI-generated narrative of the attack based on high-confidence events
            </p>
          </div>
          <Link
            to={`/cases/${caseId}/report`}
            className="btn-primary"
          >
            Generate Report
          </Link>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-8">
        <h2 className="text-base font-medium text-zinc-100 mb-4">
          Executive Summary
        </h2>
        <div className="text-zinc-400 text-sm space-y-2">
          <p>
            This investigation identified <span className="text-indigo-400 font-semibold">{stories?.length || 0}</span> security patterns
            across <span className="text-indigo-400 font-semibold">{Object.keys(storiesByStage || {}).length}</span> attack stages.
          </p>
          {stories && stories.length > 0 && (
            <p className="text-base text-zinc-300 mt-4">
              {stories[0].narrative_text || 'No narrative generated yet. Processing events...'}
            </p>
          )}
        </div>
      </div>

      {/* Horizontal Timeline */}
      <div className="mb-12">
        <h2 className="text-base font-medium text-zinc-100 mb-6">Attack Progression</h2>
        
        {/* Timeline Container - Horizontal Scroll */}
        <div className="relative overflow-x-auto pb-8">
          <div className="flex space-x-6 min-w-max px-4">
            {ATTACK_STAGES.map((stage, index) => {
              const stageStories = storiesByStage?.[stage.id] || [];
              const hasActivity = stageStories.length > 0;

              return (
                <div key={stage.id} className="flex flex-col items-center">
                  {/* Timeline Node */}
                  <div className="relative flex flex-col items-center">
                    {/* Connector Line */}
                    {index > 0 && (
                      <div className={`absolute top-6 right-full w-6 h-px ${
                        hasActivity ? 'bg-zinc-600' : 'bg-zinc-800'
                      }`} />
                    )}
                    
                    {/* Stage Circle */}
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                        hasActivity
                          ? 'bg-zinc-800 border-zinc-600'
                          : 'bg-zinc-900 border-zinc-800'
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full ${
                        hasActivity ? 'bg-zinc-400' : 'bg-zinc-700'
                      }`} />
                    </div>
                    
                    {/* Stage Name */}
                    <div className="mt-3 text-center">
                      <p className={`text-xs font-medium ${
                        hasActivity ? 'text-zinc-300' : 'text-zinc-600'
                      }`}>
                        {stage.name}
                      </p>
                      {hasActivity && (
                        <p className="text-xs text-zinc-600 mt-1">
                          {stageStories.length} event{stageStories.length !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Stage Card */}
                  <div className="mt-6 w-80">
                    {hasActivity ? (
                      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
                        {stageStories.map((story, idx) => (
                          <div key={story.id} className={idx > 0 ? 'mt-4 pt-4 border-t border-zinc-800' : ''}>
                            {/* Severity Badge */}
                            <div className="flex items-center justify-between mb-3">
                              {getSeverityBadge('MEDIUM')}
                              <span className="text-xs text-zinc-500">
                                {story.event_count} events
                              </span>
                            </div>

                            {/* Story Text */}
                            <p className="text-sm text-zinc-300 mb-3 leading-relaxed">
                              {story.narrative_text || 'No description available'}
                            </p>

                            {/* Timestamp */}
                            {story.time_span_start && (
                              <p className="text-xs text-zinc-600">
                                {new Date(story.time_span_start).toLocaleString()}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 text-center">
                        <p className="text-sm text-zinc-600">No activity detected</p>
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
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-base font-medium text-zinc-100 mb-4">Detailed Findings</h2>
          <div className="space-y-4">
            {stories.map((story, index) => (
              <div
                key={story.id}
                className="bg-zinc-950 border border-zinc-800 rounded-lg p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-base font-medium text-zinc-100">
                      Finding #{index + 1}:{' '}
                      {ATTACK_STAGES.find((s) => s.id === story.attack_phase)?.name || story.attack_phase}
                    </h3>
                    <p className="text-sm text-zinc-500 mt-1">{story.event_count} related events</p>
                  </div>
                  {getSeverityBadge('MEDIUM')}
                </div>

                <p className="text-zinc-400 text-sm mb-4 leading-relaxed">{story.narrative_text}</p>

                <div className="flex items-center justify-between text-xs text-zinc-600">
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
        <div className="text-center py-12 bg-zinc-900 border border-zinc-800 rounded-lg">
          <h3 className="text-base font-medium text-zinc-300 mb-2">
            No Attack Story Generated Yet
          </h3>
          <p className="text-zinc-500 text-sm mb-6">
            Upload and parse evidence files to generate an AI-powered attack narrative
          </p>
          <Link
            to={`/cases/${caseId}`}
            className="btn-primary inline-block"
          >
            Upload Evidence
          </Link>
        </div>
      )}
    </div>
  );
};

export default AttackStory;
