'use client';

import { RefreshCw, Trash2, Eye, EyeOff, CheckCircle, XCircle, Clock } from 'lucide-react';
import { reindexRepository, clearRepositoryVectors } from './actions';
import { toast } from 'sonner';

interface Repository {
  id: string;
  installationId: string;
  githubRepoId: number;
  fullName: string;
  isPrivate: number | null;
  indexedAt: Date | null;
  createdAt: Date;
  accountName: string;
  lastReviewAt: Date | null;
  status: 'active' | 'removed' | 'deleted';
}

export function RepositoriesTable({ repositories }: { repositories: Repository[] }) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-500/10 text-green-500">Active</span>;
      case 'removed':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/10 text-yellow-500">Removed</span>;
      case 'deleted':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-500/10 text-red-500">Deleted</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-500/10 text-gray-500">Unknown</span>;
    }
  };

  return (
    <div className="border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="p-3 font-medium">Repository</th>
              <th className="p-3 font-medium">Owner</th>
              <th className="p-3 font-medium">Visibility</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Indexed At</th>
              <th className="p-3 font-medium">Last Review</th>
              <th className="p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {repositories.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  No repositories yet
                </td>
              </tr>
            ) : (
              repositories.map((repo) => (
                <tr key={repo.id} className="border-t hover:bg-muted/30">
                  <td className="p-3">
                    <div className="font-mono text-xs">{repo.fullName}</div>
                    <div className="text-xs text-muted-foreground">ID: {repo.githubRepoId}</div>
                  </td>
                  <td className="p-3 text-muted-foreground">{repo.accountName}</td>
                  <td className="p-3">
                    {repo.isPrivate ? (
                      <span className="flex items-center gap-1 text-orange-500">
                        <EyeOff className="w-4 h-4" />
                        <span className="text-xs">Private</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-green-500">
                        <Eye className="w-4 h-4" />
                        <span className="text-xs">Public</span>
                      </span>
                    )}
                  </td>
                  <td className="p-3">{getStatusBadge(repo.status)}</td>
                  <td className="p-3 text-muted-foreground whitespace-nowrap">
                    {repo.indexedAt ? (
                      <span className="flex items-center gap-1 text-green-500">
                        <CheckCircle className="w-3 h-3" />
                        {new Date(repo.indexedAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        Not indexed
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground whitespace-nowrap">
                    {repo.lastReviewAt ? new Date(repo.lastReviewAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          toast.loading('Reindexing...', { id: `reindex-${repo.id}` });
                          const result = await reindexRepository(repo.id);
                          if (result.success) {
                            toast.success(`Queued ${repo.fullName} for reindexing`, { id: `reindex-${repo.id}` });
                          } else {
                            toast.error(result.error || 'Failed to reindex', { id: `reindex-${repo.id}` });
                          }
                        }}
                        className="p-1.5 rounded hover:bg-blue-500/10 text-blue-500 transition-colors"
                        title="Reindex Repository"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={async () => {
                          toast.loading('Clearing vectors...', { id: `clear-${repo.id}` });
                          const result = await clearRepositoryVectors(repo.id);
                          if (result.success) {
                            toast.success(`Cleared vectors for ${repo.fullName}`, { id: `clear-${repo.id}` });
                          } else {
                            toast.error(result.error || 'Failed to clear vectors', { id: `clear-${repo.id}` });
                          }
                        }}
                        className="p-1.5 rounded hover:bg-red-500/10 text-red-500 transition-colors"
                        title="Clear Vectors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
