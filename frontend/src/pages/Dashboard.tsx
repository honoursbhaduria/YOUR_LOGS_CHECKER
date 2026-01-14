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
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-700 border-t-zinc-100 mx-auto"></div>
          <p className="text-zinc-500 text-sm mt-4">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="mb-16 max-w-3xl">
        <h1 className="text-4xl font-semibold text-zinc-100 mb-3">
          AI-Assisted Digital Forensics Platform
        </h1>
        <p className="text-lg text-zinc-400 mb-8">
          Convert raw logs into clear attack stories in minutes, not hours
        </p>

        {/* Primary CTA - Upload Logs */}
        {!showCreateCase ? (
          <button
            onClick={() => setShowCreateCase(true)}
            className="inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-lg text-zinc-950 bg-zinc-100 hover:bg-zinc-200 focus:outline-none transition-colors"
          >
            <svg
              className="w-4 h-4 mr-2"
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
          <div className="max-w-md bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <h3 className="text-base font-medium text-zinc-100 mb-4">
              Create New Investigation
            </h3>
            <input
              type="text"
              value={newCaseName}
              onChange={(e) => setNewCaseName(e.target.value)}
              placeholder="Investigation name"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 mb-4"
              onKeyPress={(e) => e.key === 'Enter' && handleQuickUpload()}
            />
            <div className="flex space-x-3">
              <button
                onClick={handleQuickUpload}
                disabled={createCaseMutation.isPending}
                className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
              >
                {createCaseMutation.isPending ? 'Creating...' : 'Create'}
              </button>
              <button
                onClick={() => {
                  setShowCreateCase(false);
                  setNewCaseName('');
                }}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border border-zinc-800 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-16">
        <div className="bg-zinc-900 border border-zinc-800 border-l-2 border-l-indigo-500 rounded-lg p-6 hover:border-zinc-700 hover:border-l-indigo-400 transition-colors">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
            Total Events
          </p>
          <p className="text-3xl font-semibold text-zinc-100">
            {summary?.total_events?.toLocaleString() || 0}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 border-l-2 border-l-amber-500 rounded-lg p-6 hover:border-zinc-700 hover:border-l-amber-400 transition-colors">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
            High Risk
          </p>
          <p className="text-3xl font-semibold text-zinc-100">
            {summary?.high_risk_events || 0}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 border-l-2 border-l-red-500 rounded-lg p-6 hover:border-zinc-700 hover:border-l-red-400 transition-colors">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
            Critical Alerts
          </p>
          <p className="text-3xl font-semibold text-zinc-100">
            {summary?.critical_events || 0}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 border-l-2 border-l-emerald-500 rounded-lg p-6 hover:border-zinc-700 hover:border-l-emerald-400 transition-colors">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
            Normal Logs
          </p>
          <p className="text-3xl font-semibold text-zinc-100">
            {(summary?.total_events || 0) -
              (summary?.high_risk_events || 0) -
              (summary?.critical_events || 0)}
          </p>
        </div>
      </div>

      {/* Active Investigations */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-zinc-100">Active Investigations</h2>
          <Link
            to="/cases"
            className="text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            View All →
          </Link>
        </div>

        {!cases || cases.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
            <h3 className="text-lg font-medium text-zinc-300 mb-2">
              No investigations yet
            </h3>
            <p className="text-sm text-zinc-500 mb-6">
              Start your first investigation by uploading log files
            </p>
            <button
              onClick={() => setShowCreateCase(true)}
              className="bg-zinc-100 hover:bg-zinc-200 text-zinc-950 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
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
                className="group bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg p-5 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-base font-medium text-zinc-100 group-hover:text-zinc-50 transition-colors">
                    {caseItem.name}
                  </h3>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      caseItem.status === 'OPEN'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-900'
                        : caseItem.status === 'IN_PROGRESS'
                        ? 'bg-indigo-950 text-indigo-400 border border-indigo-900'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    }`}
                  >
                    {caseItem.status}
                  </span>
                </div>
                <p className="text-zinc-400 text-sm mb-4 line-clamp-2">
                  {caseItem.description || 'No description'}
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-600">
                    {new Date(caseItem.created_at).toLocaleDateString()}
                  </span>
                  <span className="text-zinc-400 group-hover:text-zinc-100 transition-colors">
                    View →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick Info */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8">
        <h3 className="text-base font-medium text-zinc-100 mb-6">
          How It Works
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="flex flex-col">
            <div className="w-8 h-8 bg-zinc-800 border border-zinc-700 rounded-lg flex items-center justify-center text-zinc-400 text-sm font-medium mb-3">
              1
            </div>
            <p className="text-sm text-zinc-300 font-medium mb-1">Upload Logs</p>
            <p className="text-xs text-zinc-600">CSV, JSON, Syslog</p>
          </div>
          <div className="flex flex-col">
            <div className="w-8 h-8 bg-zinc-800 border border-zinc-700 rounded-lg flex items-center justify-center text-zinc-400 text-sm font-medium mb-3">
              2
            </div>
            <p className="text-sm text-zinc-300 font-medium mb-1">Parse & Normalize</p>
            <p className="text-xs text-zinc-600">Auto-detect format</p>
          </div>
          <div className="flex flex-col">
            <div className="w-8 h-8 bg-zinc-800 border border-zinc-700 rounded-lg flex items-center justify-center text-zinc-400 text-sm font-medium mb-3">
              3
            </div>
            <p className="text-sm text-zinc-300 font-medium mb-1">ML Scoring</p>
            <p className="text-xs text-zinc-600">Filter noise</p>
          </div>
          <div className="flex flex-col">
            <div className="w-8 h-8 bg-zinc-800 border border-zinc-700 rounded-lg flex items-center justify-center text-zinc-400 text-sm font-medium mb-3">
              4
            </div>
            <p className="text-sm text-zinc-300 font-medium mb-1">AI Story</p>
            <p className="text-xs text-zinc-600">Attack narrative</p>
          </div>
          <div className="flex flex-col">
            <div className="w-8 h-8 bg-zinc-800 border border-zinc-700 rounded-lg flex items-center justify-center text-zinc-400 text-sm font-medium mb-3">
              5
            </div>
            <p className="text-sm text-zinc-300 font-medium mb-1">Report</p>
            <p className="text-xs text-zinc-600">PDF/CSV export</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
