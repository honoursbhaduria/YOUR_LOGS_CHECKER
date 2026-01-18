import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { apiClient } from '../api/client';
import type { Case, ScoredEvent } from '../types';

const InvestigationOverview: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();

  const { data: caseData } = useQuery<Case>({
    queryKey: ['case', caseId],
    queryFn: async () => {
      const response = await apiClient.getCase(Number(caseId));
      return response.data;
    },
  });

  // Pre-fetch case summary for later use
  useQuery({
    queryKey: ['case-summary', caseId],
    queryFn: async () => {
      const response = await apiClient.getCaseSummary(Number(caseId));
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

  // Prepare timeline data
  const getTimelineData = () => {
    if (!scoredEvents) return [];

    const eventsByHour: Record<string, { time: string; high: number; critical: number; normal: number }> = {};

    scoredEvents.forEach((event) => {
      const timestamp = event.parsed_event?.timestamp || event.timestamp;
      if (!timestamp) return;

      const date = new Date(timestamp);
      const hour = `${date.getHours()}:00`;

      if (!eventsByHour[hour]) {
        eventsByHour[hour] = { time: hour, high: 0, critical: 0, normal: 0 };
      }

      const score = event.confidence || 0;
      if (score >= 0.8) {
        eventsByHour[hour].critical++;
      } else if (score >= 0.5) {
        eventsByHour[hour].high++;
      } else {
        eventsByHour[hour].normal++;
      }
    });

    return Object.values(eventsByHour).sort((a, b) => a.time.localeCompare(b.time));
  };

  // Prepare severity distribution data
  const getSeverityData = () => {
    if (!scoredEvents) return [];

    let critical = 0;
    let high = 0;
    let medium = 0;
    let low = 0;

    scoredEvents.forEach((event) => {
      const score = event.confidence || 0;
      if (score >= 0.8) critical++;
      else if (score >= 0.6) high++;
      else if (score >= 0.4) medium++;
      else low++;
    });

    return [
      { name: 'Critical', value: critical, color: '#EF4444' },
      { name: 'High', value: high, color: '#F59E0B' },
      { name: 'Medium', value: medium, color: '#3B82F6' },
      { name: 'Low', value: low, color: '#10B981' },
    ];
  };

  // Get top risky users
  const getTopRiskyUsers = () => {
    if (!scoredEvents) return [];

    const userRiskMap: Record<string, { count: number; avgScore: number; totalScore: number }> = {};

    scoredEvents.forEach((event) => {
      const user = event.parsed_event?.user || 'Unknown';
      const score = event.confidence || 0;

      if (!userRiskMap[user]) {
        userRiskMap[user] = { count: 0, avgScore: 0, totalScore: 0 };
      }

      userRiskMap[user].count++;
      userRiskMap[user].totalScore += score;
    });

    Object.keys(userRiskMap).forEach((user) => {
      userRiskMap[user].avgScore = userRiskMap[user].totalScore / userRiskMap[user].count;
    });

    return Object.entries(userRiskMap)
      .map(([user, data]) => ({
        user,
        events: data.count,
        riskScore: Math.round(data.avgScore * 100),
      }))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 5);
  };

  // Get top risky IPs
  const getTopRiskyIPs = () => {
    if (!scoredEvents) return [];

    const ipRiskMap: Record<string, { count: number; avgScore: number; totalScore: number }> = {};

    scoredEvents.forEach((event) => {
      const ip = 'Unknown'; // src_ip not in ParsedEvent type
      const score = event.confidence || 0;

      if (!ipRiskMap[ip]) {
        ipRiskMap[ip] = { count: 0, avgScore: 0, totalScore: 0 };
      }

      ipRiskMap[ip].count++;
      ipRiskMap[ip].totalScore += score;
    });

    Object.keys(ipRiskMap).forEach((ip) => {
      ipRiskMap[ip].avgScore = ipRiskMap[ip].totalScore / ipRiskMap[ip].count;
    });

    return Object.entries(ipRiskMap)
      .map(([ip, data]) => ({
        ip,
        events: data.count,
        riskScore: Math.round(data.avgScore * 100),
      }))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 5);
  };

  const timelineData = getTimelineData();
  const severityData = getSeverityData();
  const topUsers = getTopRiskyUsers();
  const topIPs = getTopRiskyIPs();

  const totalEvents = scoredEvents?.length || 0;
  const highRiskEvents = severityData.find((d) => d.name === 'High')?.value || 0;
  const criticalEvents = severityData.find((d) => d.name === 'Critical')?.value || 0;
  const normalEvents = totalEvents - highRiskEvents - criticalEvents;

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
          <span className="text-white">{caseData?.name}</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{caseData?.name}</h1>
            <p className="text-gray-400">{caseData?.description}</p>
          </div>
          <Link
            to={`/cases/${caseId}/story`}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition"
          >
            View Attack Story →
          </Link>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 border border-blue-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-300 uppercase tracking-wider mb-1">
                Total Events
              </p>
              <p className="text-3xl font-bold text-white">{totalEvents.toLocaleString()}</p>
            </div>
            <div className="text-4xl">📊</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-900/50 to-yellow-800/30 border border-yellow-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-300 uppercase tracking-wider mb-1">
                High Risk
              </p>
              <p className="text-3xl font-bold text-white">{highRiskEvents}</p>
            </div>
            <div className="text-4xl">⚠️</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-900/50 to-red-800/30 border border-red-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-300 uppercase tracking-wider mb-1">
                Critical Alerts
              </p>
              <p className="text-3xl font-bold text-white">{criticalEvents}</p>
            </div>
            <div className="text-4xl">🚨</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-900/50 to-green-800/30 border border-green-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-300 uppercase tracking-wider mb-1">
                Normal Logs
              </p>
              <p className="text-3xl font-bold text-white">{normalEvents.toLocaleString()}</p>
            </div>
            <div className="text-4xl">✓</div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Events Over Time */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Events Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="critical" stroke="#EF4444" strokeWidth={2} name="Critical" />
              <Line type="monotone" dataKey="high" stroke="#F59E0B" strokeWidth={2} name="High Risk" />
              <Line type="monotone" dataKey="normal" stroke="#10B981" strokeWidth={2} name="Normal" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Threat Severity Distribution */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Threat Severity Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={severityData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {severityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Risky Users */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Top Risky Users</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topUsers}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="user" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="riskScore" fill="#F59E0B" name="Risk Score" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Risky IPs */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Top Risky Source IPs</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topIPs}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="ip" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="riskScore" fill="#EF4444" name="Risk Score" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 flex justify-center space-x-4">
        <Link
          to={`/cases/${caseId}/events`}
          className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition"
        >
          View All Events
        </Link>
        <Link
          to={`/cases/${caseId}/report`}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition"
        >
          Generate Report
        </Link>
      </div>
    </div>
  );
};

export default InvestigationOverview;
