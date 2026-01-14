import React, { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { apiClient } from '../api/client';
import type { DashboardSummary, Case } from '../types';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newCaseName, setNewCaseName] = useState('');
  const [showCreateCase, setShowCreateCase] = useState(false);

  const { data: summary, isLoading } = useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const response = await apiClient.getDashboardSummary();
      return response.data;
    },
  });

  const { data: cases } = useQuery<Case[]>({
    queryKey: ['cases'],
    queryFn: async () => {
      const response = await apiClient.getCases();
      return response.data.results || response.data;
    },
  });

  const createCaseMutation = useMutation({
    mutationFn: (name: string) =>
      apiClient.createCase({
        name,
        description: 'Investigation started from Dashboard',
        status: 'OPEN',
      }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      setShowCreateCase(false);
      setNewCaseName('');
      navigate(`/cases/${response.data.id}`);
    },
  });

  const handleQuickUpload = () => {
    if (!newCaseName.trim()) {
      alert('Please enter an investigation name');
      return;
    }
    createCaseMutation.mutate(newCaseName);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Hero Section */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-white mb-3">
          AI-Assisted Digital Forensics Platform
        </h1>
        <p className="text-xl text-gray-400 mb-8">
          Convert raw logs into clear attack stories in minutes, not hours
        </p>

        {/* Primary CTA - Upload Logs */}
        {!showCreateCase ? (
          <button
            onClick={() => setShowCreateCase(true)}
            className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-semibold rounded-lg text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg transform transition hover:scale-105"
          >
            <svg
              className="w-6 h-6 mr-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            Start New Investigation
          </button>
        ) : (
          <div className="max-w-md mx-auto bg-gray-800 border border-gray-700 rounded-lg p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-4">
              Create New Investigation
            </h3>
            <input
              type="text"
              value={newCaseName}
              onChange={(e) => setNewCaseName(e.target.value)}
              placeholder="Investigation name (e.g., 'Brute Force Attack Jan 2026')"
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              onKeyPress={(e) => e.key === 'Enter' && handleQuickUpload()}
            />
            <div className="flex space-x-3">
              <button
                onClick={handleQuickUpload}
                disabled={createCaseMutation.isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition disabled:opacity-50"
              >
                {createCaseMutation.isPending ? 'Creating...' : 'Create & Upload'}
              </button>
              <button
                onClick={() => {
                  setShowCreateCase(false);
                  setNewCaseName('');
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-12">
        <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 border border-blue-700/50 rounded-xl overflow-hidden shadow-lg">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-300 uppercase tracking-wider mb-1">
                  Total Events
                </p>
                <p className="text-3xl font-bold text-white">
                  {summary?.total_events?.toLocaleString() || 0}
                </p>
              </div>
              <div className="text-4xl text-blue-400">📊</div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-900/50 to-yellow-800/30 border border-yellow-700/50 rounded-xl overflow-hidden shadow-lg">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-300 uppercase tracking-wider mb-1">
                  High Risk
                </p>
                <p className="text-3xl font-bold text-white">
                  {summary?.high_risk_events || 0}
                </p>
              </div>
              <div className="text-4xl text-yellow-400">⚠️</div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-900/50 to-red-800/30 border border-red-700/50 rounded-xl overflow-hidden shadow-lg">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-300 uppercase tracking-wider mb-1">
                  Critical Alerts
                </p>
                <p className="text-3xl font-bold text-white">
                  {summary?.critical_events || 0}
                </p>
              </div>
              <div className="text-4xl text-red-400">🚨</div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-900/50 to-green-800/30 border border-green-700/50 rounded-xl overflow-hidden shadow-lg">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-300 uppercase tracking-wider mb-1">
                  Normal Logs
                </p>
                <p className="text-3xl font-bold text-white">
                  {(summary?.total_events || 0) -
                    (summary?.high_risk_events || 0) -
                    (summary?.critical_events || 0)}
                </p>
              </div>
              <div className="text-4xl text-green-400">✓</div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Investigations */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Active Investigations</h2>
          <Link
            to="/cases"
            className="text-blue-400 hover:text-blue-300 text-sm font-semibold"
          >
            View All →
          </Link>
        </div>

        {!cases || cases.length === 0 ? (
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-12 text-center">
            <div className="text-6xl mb-4">📁</div>
            <h3 className="text-xl font-semibold text-gray-300 mb-2">
              No investigations yet
            </h3>
            <p className="text-gray-500 mb-6">
              Start your first investigation by uploading log files
            </p>
            <button
              onClick={() => setShowCreateCase(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition"
            >
              Create Investigation
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cases.slice(0, 6).map((caseItem) => (
              <Link
                key={caseItem.id}
                to={`/cases/${caseItem.id}`}
                className="group bg-gray-800/50 border border-gray-700 hover:border-blue-500 rounded-lg p-5 transition-all hover:shadow-lg hover:shadow-blue-500/20"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition">
                    {caseItem.name}
                  </h3>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded ${
                      caseItem.status === 'OPEN'
                        ? 'bg-green-900/50 text-green-400 border border-green-700'
                        : caseItem.status === 'IN_PROGRESS'
                        ? 'bg-blue-900/50 text-blue-400 border border-blue-700'
                        : 'bg-gray-700/50 text-gray-400 border border-gray-600'
                    }`}
                  >
                    {caseItem.status}
                  </span>
                </div>
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                  {caseItem.description || 'No description'}
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    {new Date(caseItem.created_at).toLocaleDateString()}
                  </span>
                  <span className="text-blue-400 group-hover:translate-x-1 transition-transform">
                    View →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick Info */}
      <div className="bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border border-blue-700/30 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-3">
          How It Works - The Forensic Funnel
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-center">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold mb-2">
              1
            </div>
            <p className="text-sm text-gray-300 font-semibold">Upload Logs</p>
            <p className="text-xs text-gray-500 mt-1">CSV, JSON, Syslog</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold mb-2">
              2
            </div>
            <p className="text-sm text-gray-300 font-semibold">Parse & Normalize</p>
            <p className="text-xs text-gray-500 mt-1">Auto-detect format</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold mb-2">
              3
            </div>
            <p className="text-sm text-gray-300 font-semibold">ML Scoring</p>
            <p className="text-xs text-gray-500 mt-1">Filter noise</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold mb-2">
              4
            </div>
            <p className="text-sm text-gray-300 font-semibold">AI Story</p>
            <p className="text-xs text-gray-500 mt-1">Attack narrative</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold mb-2">
              5
            </div>
            <p className="text-sm text-gray-300 font-semibold">Report</p>
            <p className="text-xs text-gray-500 mt-1">PDF/CSV export</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
