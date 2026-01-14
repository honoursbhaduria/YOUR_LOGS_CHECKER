import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import type { Case } from '../types';

const CaseList: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCaseName, setNewCaseName] = useState('');
  const [newCaseDesc, setNewCaseDesc] = useState('');
  const queryClient = useQueryClient();

  const { data: cases, isLoading } = useQuery<Case[]>({
    queryKey: ['cases'],
    queryFn: async () => {
      const response = await apiClient.getCases();
      return response.data.results || response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description: string }) =>
      apiClient.createCase(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      setShowCreateModal(false);
      setNewCaseName('');
      setNewCaseDesc('');
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ name: newCaseName, description: newCaseDesc });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-700 border-t-zinc-100 mx-auto"></div>
          <p className="text-zinc-500 text-sm mt-4">Loading investigations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-0">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Investigations</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage and track forensic cases</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          New Case
        </button>
      </div>

      {/* Cases Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cases?.map((c) => (
          <Link
            key={c.id}
            to={`/cases/${c.id}`}
            className="block bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:border-zinc-700 transition-colors"
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-base font-medium text-zinc-100">{c.name}</h3>
              <span
                className={`px-2 py-1 text-xs font-medium rounded-lg ${
                  c.status === 'OPEN'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-900'
                    : c.status === 'IN_PROGRESS'
                    ? 'bg-indigo-950 text-indigo-400 border border-indigo-900'
                    : c.status === 'CLOSED'
                    ? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    : 'bg-amber-950 text-amber-400 border border-amber-900'
                }`}
              >
                {c.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-sm text-zinc-400 mb-4 line-clamp-2">
              {c.description || 'No description'}
            </p>
            <div className="flex items-center gap-4 text-sm text-zinc-500">
              <span>{c.evidence_count} {c.evidence_count === 1 ? 'file' : 'files'}</span>
              <span>•</span>
              <span>{c.event_count} {c.event_count === 1 ? 'event' : 'events'}</span>
            </div>
            <div className="mt-4 text-xs text-zinc-600">
              Created {new Date(c.created_at).toLocaleDateString()}
            </div>
          </Link>
        ))}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-medium text-zinc-100 mb-6">Create New Investigation</h2>
            <form onSubmit={handleCreate}>
              <div className="mb-4">
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                  Case Name
                </label>
                <input
                  type="text"
                  required
                  className="input-modern w-full"
                  value={newCaseName}
                  onChange={(e) => setNewCaseName(e.target.value)}
                  placeholder="Enter investigation name"
                />
              </div>
              <div className="mb-6">
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                  Description
                </label>
                <textarea
                  rows={3}
                  className="input-modern w-full"
                  value={newCaseDesc}
                  onChange={(e) => setNewCaseDesc(e.target.value)}
                  placeholder="Describe the investigation purpose"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn-primary"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Investigation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaseList;
