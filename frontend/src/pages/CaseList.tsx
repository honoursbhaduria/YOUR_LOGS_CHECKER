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
    return <div className="text-center py-12 text-gray-400">Loading cases...</div>;
  }

  return (
    <div className="px-4 sm:px-0 animate-fadeIn">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white font-mono">$ list_cases --all</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          + New Case
        </button>
      </div>

      {/* Cases Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cases?.map((c) => (
          <Link
            key={c.id}
            to={`/cases/${c.id}`}
            className="block bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-blue-600 hover:bg-gray-800 transition"
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-lg font-semibold text-white">{c.name}</h3>
              <span
                className={`px-2 py-1 text-xs font-semibold rounded ${
                  c.status === 'OPEN'
                    ? 'bg-green-900 text-green-400 border border-green-700'
                    : c.status === 'IN_PROGRESS'
                    ? 'bg-blue-900 text-blue-400 border border-blue-700'
                    : c.status === 'CLOSED'
                    ? 'bg-gray-800 text-gray-400 border border-gray-700'
                    : 'bg-yellow-900 text-yellow-400 border border-yellow-700'
                }`}
              >
                {c.status}
              </span>
            </div>
            <p className="text-sm text-gray-400 mb-4 line-clamp-2">
              {c.description || 'No description'}
            </p>
            <div className="flex justify-between text-sm text-gray-400 font-mono">
              <span>[F] {c.evidence_count} files</span>
              <span>[E] {c.event_count} events</span>
            </div>
            <div className="mt-4 text-xs text-gray-500 font-mono">
              Created {new Date(c.created_at).toLocaleDateString()}
            </div>
          </Link>
        ))}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-white mb-4">Create New Case</h2>
            <form onSubmit={handleCreate}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Case Name
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 bg-black border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  value={newCaseName}
                  onChange={(e) => setNewCaseName(e.target.value)}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 bg-black border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  value={newCaseDesc}
                  onChange={(e) => setNewCaseDesc(e.target.value)}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-300 border border-gray-600 rounded-md hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create'}
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
