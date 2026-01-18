import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { Case, StoryPattern, ParsedEvent } from '../types';

// Attack stages with keywords for matching
const ATTACK_STAGES = [
  { id: 'reconnaissance', name: 'Reconnaissance', keywords: ['scan', 'discovery', 'enum'] },
  { id: 'initial_access', name: 'Initial Access', keywords: ['logon', 'login', '4624', '4625', 'rdp', 'ssh', 'brute'] },
  { id: 'execution', name: 'Execution', keywords: ['process', 'cmd', 'powershell', 'script', '4688'] },
  { id: 'persistence', name: 'Persistence', keywords: ['scheduled', 'service', 'registry', '4698', '4697'] },
  { id: 'privilege_escalation', name: 'Privilege Escalation', keywords: ['admin', 'privilege', 'escalat', 'sam'] },
  { id: 'defense_evasion', name: 'Defense Evasion', keywords: ['clear', 'disable', 'bypass', '1102'] },
  { id: 'credential_access', name: 'Credential Access', keywords: ['credential', 'password', 'hash', 'dump', 'sam'] },
  { id: 'discovery', name: 'Discovery', keywords: ['query', 'list', 'get-', 'netstat', 'whoami'] },
  { id: 'lateral_movement', name: 'Lateral Movement', keywords: ['remote', 'psexec', 'wmi', 'movement'] },
  { id: 'collection', name: 'Collection', keywords: ['archive', 'compress', 'collect', 'file_access'] },
  { id: 'exfiltration', name: 'Exfiltration', keywords: ['upload', 'ftp', 'transfer', 'exfil'] },
  { id: 'impact', name: 'Impact', keywords: ['delete', 'encrypt', 'destroy', 'ransom'] },
];

// Parse severity from raw_message
const parseSeverity = (rawMessage: string): 'critical' | 'high' | 'medium' | 'low' => {
  const msg = rawMessage.toLowerCase();
  if (msg.includes('critical') || msg.includes('brute force')) return 'critical';
  if (msg.includes('high') || msg.includes('failure') || msg.includes('failed')) return 'high';
  if (msg.includes('medium')) return 'medium';
  return 'low';
};

// Classify event to attack stage
const classifyStage = (event: ParsedEvent): string => {
  const msg = (event.raw_message || '').toLowerCase();
  const eventType = (event.event_type || '').toLowerCase();
  const combined = `${msg} ${eventType}`;
  
  for (const stage of ATTACK_STAGES) {
    if (stage.keywords.some(kw => combined.includes(kw))) {
      return stage.id;
    }
  }
  return 'unknown';
};

// Extract severity description from raw_message
const getSeverityDescription = (rawMessage: string): string => {
  const match = rawMessage.match(/severity=([^|]+)/);
  return match ? match[1].trim() : '';
};

// Extract source IP from raw_message  
const getSourceIP = (rawMessage: string): string => {
  const match = rawMessage.match(/src_ip=([^|]+)/);
  return match ? match[1].trim() : 'N/A';
};

// Extract destination from raw_message
const getDestination = (rawMessage: string): string => {
  const match = rawMessage.match(/dest=([^|]+)/);
  return match ? match[1].trim() : 'N/A';
};

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

  // Fetch parsed events for this case
  const { data: parsedEvents, isLoading: eventsLoading } = useQuery<ParsedEvent[]>({
    queryKey: ['parsed-events-case', caseId],
    queryFn: async () => {
      const response = await apiClient.getParsedEvents({ case: Number(caseId) });
      return response.data.results || response.data || [];
    },
  });

  // Analyze all events and classify by severity and stage
  const analysis = useMemo(() => {
    if (!parsedEvents || parsedEvents.length === 0) {
      return {
        criticalEvents: [] as ParsedEvent[],
        highEvents: [] as ParsedEvent[],
        eventsByStage: {} as Record<string, ParsedEvent[]>,
        summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0 },
        attackerIPs: [] as string[],
      };
    }

    const criticalEvents: ParsedEvent[] = [];
    const highEvents: ParsedEvent[] = [];
    const eventsByStage: Record<string, ParsedEvent[]> = {};
    const ipCounts: Record<string, number> = {};
    let criticalCount = 0, highCount = 0, mediumCount = 0, lowCount = 0;

    parsedEvents.forEach(event => {
      const severity = parseSeverity(event.raw_message || '');
      const stage = classifyStage(event);

      // Count by severity
      if (severity === 'critical') {
        criticalCount++;
        criticalEvents.push(event);
      } else if (severity === 'high') {
        highCount++;
        highEvents.push(event);
      } else if (severity === 'medium') {
        mediumCount++;
      } else {
        lowCount++;
      }

      // Group by stage
      if (!eventsByStage[stage]) eventsByStage[stage] = [];
      eventsByStage[stage].push(event);

      // Track IPs for critical events
      if (severity === 'critical') {
        const ip = getSourceIP(event.raw_message || '');
        if (ip !== 'N/A') {
          ipCounts[ip] = (ipCounts[ip] || 0) + 1;
        }
      }
    });

    // Sort IPs by attack count
    const attackerIPs = Object.entries(ipCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([ip]) => ip);

    return {
      criticalEvents,
      highEvents,
      eventsByStage,
      summary: { total: parsedEvents.length, critical: criticalCount, high: highCount, medium: mediumCount, low: lowCount },
      attackerIPs,
    };
  }, [parsedEvents]);

  // Group stories by stage (for legacy ML-scored support)
  const storiesByStage = stories?.reduce((acc, story) => {
    const stage = story.attack_phase || 'unknown';
    if (!acc[stage]) acc[stage] = [];
    acc[stage].push(story);
    return acc;
  }, {} as Record<string, StoryPattern[]>);

  const getSeverityBadge = (severity: string) => {
    const sev = severity.toLowerCase();
    if (sev === 'critical')
      return <span className="px-2 py-1 bg-red-950 text-red-400 border border-red-900 rounded-lg text-xs font-medium">CRITICAL</span>;
    if (sev === 'high')
      return <span className="px-2 py-1 bg-orange-950 text-orange-400 border border-orange-900 rounded-lg text-xs font-medium">HIGH</span>;
    if (sev === 'medium')
      return <span className="px-2 py-1 bg-amber-950 text-amber-400 border border-amber-900 rounded-lg text-xs font-medium">MEDIUM</span>;
    return <span className="px-2 py-1 bg-indigo-950 text-indigo-400 border border-indigo-900 rounded-lg text-xs font-medium">LOW</span>;
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-2 text-sm text-zinc-500 mb-3">
          <Link to="/" className="hover:text-zinc-100 transition-colors">Dashboard</Link>
          <span>→</span>
          <Link to="/cases" className="hover:text-zinc-100 transition-colors">Investigations</Link>
          <span>→</span>
          <Link to={`/cases/${caseId}`} className="hover:text-zinc-100 transition-colors">{caseData?.name}</Link>
          <span>→</span>
          <span className="text-zinc-400">Attack Story</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-100 mb-2">Attack Story Timeline</h1>
            <p className="text-zinc-500 text-sm">
              Security event analysis with critical threat detection
            </p>
          </div>
          <Link to={`/cases/${caseId}/report`} className="btn-primary">Generate Report</Link>
        </div>
      </div>

      {/* Loading State */}
      {eventsLoading && (
        <div className="text-center py-12 bg-zinc-900 border border-zinc-800 rounded-lg mb-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading security events...</p>
        </div>
      )}

      {/* Executive Summary */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-8">
        <h2 className="text-base font-medium text-zinc-100 mb-4">Executive Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-zinc-100">{analysis.summary.total}</p>
            <p className="text-xs text-zinc-500">Total Events</p>
          </div>
          <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{analysis.summary.critical}</p>
            <p className="text-xs text-red-400/70">Critical</p>
          </div>
          <div className="bg-orange-950/30 border border-orange-900/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-orange-400">{analysis.summary.high}</p>
            <p className="text-xs text-orange-400/70">High</p>
          </div>
          <div className="bg-amber-950/30 border border-amber-900/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-amber-400">{analysis.summary.medium}</p>
            <p className="text-xs text-amber-400/70">Medium</p>
          </div>
          <div className="bg-indigo-950/30 border border-indigo-900/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-indigo-400">{analysis.summary.low}</p>
            <p className="text-xs text-indigo-400/70">Low</p>
          </div>
        </div>
        
        {/* Critical Alert Banner */}
        {analysis.summary.critical > 0 && (
          <div className="bg-red-950/20 border border-red-900/30 rounded-lg p-4 mt-4">
            <p className="text-red-400 text-sm font-medium mb-2 flex items-center">
              <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>
              ⚠️ Critical Security Alert
            </p>
            <p className="text-zinc-300 text-sm">
              Detected <strong className="text-red-400">{analysis.summary.critical}</strong> critical security events including potential brute force attacks.
              {analysis.attackerIPs.length > 0 && (
                <> Suspicious activity from IP{analysis.attackerIPs.length > 1 ? 's' : ''}: <span className="text-red-400 font-mono">{analysis.attackerIPs.join(', ')}</span></>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Critical Events Section */}
      {analysis.criticalEvents.length > 0 && (
        <div className="bg-zinc-900 border border-red-900/50 rounded-lg p-6 mb-8">
          <h2 className="text-base font-medium text-red-400 mb-4 flex items-center">
            <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>
            Critical Security Events ({analysis.criticalEvents.length})
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {analysis.criticalEvents.map((event, idx) => (
              <div key={event.id || idx} className="bg-zinc-950 border border-red-900/30 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getSeverityBadge('critical')}
                    <span className="text-xs text-zinc-500">Event ID: {event.event_type}</span>
                  </div>
                  <span className="text-xs text-zinc-500">
                    {event.timestamp ? new Date(event.timestamp).toLocaleString() : 'N/A'}
                  </span>
                </div>
                <p className="text-sm text-zinc-300 mb-2">
                  {getSeverityDescription(event.raw_message) || event.event_type || 'Security event detected'}
                </p>
                <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
                  <span>User: <span className="text-zinc-400">{event.user || 'N/A'}</span></span>
                  <span>Source IP: <span className="text-red-400 font-mono">{getSourceIP(event.raw_message)}</span></span>
                  <span>Target: <span className="text-zinc-400">{getDestination(event.raw_message)}</span></span>
                  <span>Host: <span className="text-zinc-400">{event.host || 'N/A'}</span></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* High Priority Events */}
      {analysis.highEvents.length > 0 && (
        <div className="bg-zinc-900 border border-orange-900/30 rounded-lg p-6 mb-8">
          <h2 className="text-base font-medium text-orange-400 mb-4">
            High Priority Events ({analysis.highEvents.length})
          </h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {analysis.highEvents.slice(0, 15).map((event, idx) => (
              <div key={event.id || idx} className="bg-zinc-950 border border-orange-900/20 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getSeverityBadge('high')}
                  <span className="text-sm text-zinc-300">
                    {getSeverityDescription(event.raw_message) || event.event_type}
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-xs text-zinc-500">
                  <span>{event.user || 'N/A'}</span>
                  <span className="text-orange-400 font-mono">{getSourceIP(event.raw_message)}</span>
                  <span>{event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : ''}</span>
                </div>
              </div>
            ))}
            {analysis.highEvents.length > 15 && (
              <p className="text-xs text-zinc-500 text-center py-2">
                +{analysis.highEvents.length - 15} more high priority events...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Attack Progression Timeline */}
      <div className="mb-12">
        <h2 className="text-base font-medium text-zinc-100 mb-6">Attack Progression</h2>
        <div className="relative overflow-x-auto pb-8">
          <div className="flex space-x-6 min-w-max px-4">
            {ATTACK_STAGES.map((stage, index) => {
              const stageEvents = analysis.eventsByStage[stage.id] || [];
              const stageStories = storiesByStage?.[stage.id] || [];
              const hasActivity = stageEvents.length > 0 || stageStories.length > 0;
              const eventCount = stageEvents.length + stageStories.length;
              
              // Check if stage has critical events
              const hasCritical = stageEvents.some(e => parseSeverity(e.raw_message || '') === 'critical');

              return (
                <div key={stage.id} className="flex flex-col items-center">
                  <div className="relative flex flex-col items-center">
                    {index > 0 && (
                      <div className={`absolute top-6 right-full w-6 h-px ${
                        hasActivity ? (hasCritical ? 'bg-red-600' : 'bg-zinc-600') : 'bg-zinc-800'
                      }`} />
                    )}
                    
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                      hasActivity
                        ? (hasCritical ? 'bg-red-950 border-red-600' : 'bg-zinc-800 border-zinc-600')
                        : 'bg-zinc-900 border-zinc-800'
                    }`}>
                      <div className={`w-3 h-3 rounded-full ${
                        hasActivity ? (hasCritical ? 'bg-red-500 animate-pulse' : 'bg-zinc-400') : 'bg-zinc-700'
                      }`} />
                    </div>
                    
                    <div className="mt-3 text-center">
                      <p className={`text-xs font-medium ${
                        hasActivity ? (hasCritical ? 'text-red-400' : 'text-zinc-300') : 'text-zinc-600'
                      }`}>
                        {stage.name}
                      </p>
                      {hasActivity && (
                        <p className={`text-xs mt-1 ${hasCritical ? 'text-red-400/70' : 'text-zinc-600'}`}>
                          {eventCount} event{eventCount !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 w-72">
                    {hasActivity ? (
                      <div className={`bg-zinc-900 border rounded-lg p-4 ${
                        hasCritical ? 'border-red-900/50' : 'border-zinc-800'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          {getSeverityBadge(hasCritical ? 'critical' : 'medium')}
                          <span className="text-xs text-zinc-500">{eventCount} events</span>
                        </div>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {stageEvents.slice(0, 3).map((event, idx) => (
                            <p key={idx} className="text-xs text-zinc-400 truncate">
                              • {getSeverityDescription(event.raw_message) || event.event_type}
                            </p>
                          ))}
                          {stageEvents.length > 3 && (
                            <p className="text-xs text-zinc-500">
                              +{stageEvents.length - 3} more events...
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center">
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

      {/* Legacy Story Patterns (if ML scoring was run) */}
      {stories && stories.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-8">
          <h2 className="text-base font-medium text-zinc-100 mb-4">AI-Generated Findings</h2>
          <div className="space-y-4">
            {stories.map((story, index) => (
              <div key={story.id} className="bg-zinc-950 border border-zinc-800 rounded-lg p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-base font-medium text-zinc-100">
                      Finding #{index + 1}: {ATTACK_STAGES.find((s) => s.id === story.attack_phase)?.name || story.attack_phase}
                    </h3>
                    <p className="text-sm text-zinc-500 mt-1">{story.event_count} related events</p>
                  </div>
                  {getSeverityBadge('medium')}
                </div>
                <p className="text-zinc-400 text-sm mb-4 leading-relaxed">{story.narrative_text}</p>
                <div className="flex items-center justify-between text-xs text-zinc-600">
                  <span>{story.time_span_start && `Started: ${new Date(story.time_span_start).toLocaleString()}`}</span>
                  <span>Confidence: {Math.round((story.avg_confidence || 0) * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Events Message */}
      {!eventsLoading && (!parsedEvents || parsedEvents.length === 0) && (!stories || stories.length === 0) && (
        <div className="text-center py-12 bg-zinc-900 border border-zinc-800 rounded-lg">
          <h3 className="text-base font-medium text-zinc-300 mb-2">
            No Security Events Found
          </h3>
          <p className="text-zinc-500 text-sm mb-6">
            Upload and parse evidence files to analyze security events and detect threats
          </p>
          <Link to={`/cases/${caseId}`} className="btn-primary inline-block">
            Upload Evidence
          </Link>
        </div>
      )}
    </div>
  );
};

export default AttackStory;
