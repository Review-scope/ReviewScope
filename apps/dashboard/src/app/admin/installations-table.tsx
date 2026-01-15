'use client';

import { RefreshCw, Ban, Trash2, Key, CheckCircle, XCircle, Clock, Zap } from 'lucide-react';
import { reindexInstallation, disableInstallation } from './actions';
import { toast } from 'sonner';

interface Installation {
  id: string;
  githubInstallationId: number;
  accountName: string;
  accountType: string;
  planName: string | null;
  createdAt: Date;
  repoCount: number;
  indexedCount: number;
  hasApiKey: boolean;
  provider: string | null;
  indexingStatus: 'NO_REPOS' | 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE';
  status: 'active' | 'suspended' | 'deleted' | 'inactive';
}

export function InstallationsTable({ installations }: { installations: Installation[] }) {
  const getIndexingBadge = (status: string) => {
    switch (status) {
      case 'DONE':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-500/10 text-green-500 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Done</span>;
      case 'IN_PROGRESS':
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-500/10 text-blue-500 flex items-center gap-1"><Zap className="w-3 h-3 animate-pulse" /> In Progress</span>;
      case 'NOT_STARTED':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/10 text-yellow-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Not Started</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-500/10 text-gray-500">No Repos</span>;
    }
  };

  return (
    <div className="border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="p-3 font-medium">Account</th>
              <th className="p-3 font-medium">Type</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Plan</th>
              <th className="p-3 font-medium">Repos</th>
              <th className="p-3 font-medium">API Key</th>
              <th className="p-3 font-medium">Indexing</th>
              <th className="p-3 font-medium">Created</th>
              <th className="p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {installations.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-foreground">
                  No installations yet
                </td>
              </tr>
            ) : (
              installations.map((inst) => (
                <tr key={inst.id} className="border-t hover:bg-muted/30">
                  <td className="p-3">
                    <div className="font-medium">{inst.accountName}</div>
                    <div className="text-xs text-muted-foreground font-mono">ID: {inst.githubInstallationId}</div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      inst.accountType === 'Organization' ? 'bg-purple-500/10 text-purple-500' : 'bg-blue-500/10 text-blue-500'
                    }`}>
                      {inst.accountType}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      inst.status === 'active' ? 'bg-green-500/10 text-green-500' : 
                      inst.status === 'suspended' ? 'bg-yellow-500/10 text-yellow-500' : 
                      'bg-red-500/10 text-red-500'
                    }`}>
                      {inst.status}
                    </span>
                  </td>
                  <td className="p-3">{inst.planName || 'Free'}</td>
                  <td className="p-3">
                    <span className="font-mono">{inst.indexedCount}/{inst.repoCount}</span>
                    <span className="text-xs text-muted-foreground ml-1">indexed</span>
                  </td>
                  <td className="p-3">
                    {inst.hasApiKey ? (
                      <span className="flex items-center gap-1 text-green-500">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-xs">{inst.provider?.toUpperCase()}</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <XCircle className="w-4 h-4" />
                        <span className="text-xs">Not Set</span>
                      </span>
                    )}
                  </td>
                  <td className="p-3">{getIndexingBadge(inst.indexingStatus)}</td>
                  <td className="p-3 text-muted-foreground whitespace-nowrap">
                    {new Date(inst.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          toast.loading('Reindexing...', { id: `reindex-${inst.id}` });
                          const result = await reindexInstallation(inst.id);
                          if (result.success) {
                            toast.success(`Queued ${result.reposCount} repos for reindexing`, { id: `reindex-${inst.id}` });
                          } else {
                            toast.error(result.error || 'Failed to reindex', { id: `reindex-${inst.id}` });
                          }
                        }}
                        className="p-1.5 rounded hover:bg-blue-500/10 text-blue-500 transition-colors"
                        title="Force Reindex"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(`Are you sure you want to delete ${inst.accountName}? This will remove all repos and vectors.`)) return;
                          toast.loading('Deleting...', { id: `delete-${inst.id}` });
                          const result = await disableInstallation(inst.id);
                          if (result.success) {
                            toast.success(`Deleted installation and ${result.deletedRepos} repos`, { id: `delete-${inst.id}` });
                          } else {
                            toast.error(result.error || 'Failed to delete', { id: `delete-${inst.id}` });
                          }
                        }}
                        className="p-1.5 rounded hover:bg-red-500/10 text-red-500 transition-colors"
                        title="Delete Installation"
                      >
                        <Ban className="w-4 h-4" />
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
