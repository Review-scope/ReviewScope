'use client';

import { useState } from 'react';
import { GitBranch, RefreshCw, CheckCircle2, AlertCircle, Database } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { syncRepositories } from './actions';
import clsx from 'clsx';

type Repo = {
  id: string;
  fullName: string;
  status: string;
  isActive: boolean;
};

export function RepoList({ 
  installationId, 
  repos 
}: { 
  installationId: string;
  repos: Repo[];
}) {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await syncRepositories(installationId);
      if (res.success) {
        toast.success(`Synced ${res.count} repositories`);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to sync repositories');
      }
    } catch {
      toast.error('Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="bg-card border border-border/60 rounded-[2.5rem] shadow-xl p-10 space-y-8 mt-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-3">
            <Database className="w-6 h-6" />
            Connected Repositories
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Repositories accessible to this installation.
          </p>
        </div>
        
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="inline-flex items-center gap-2 px-5 py-3 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg"
        >
          <RefreshCw className={clsx("w-4 h-4", isSyncing && "animate-spin")} />
          {isSyncing ? 'Syncing...' : 'Sync Repositories'}
        </button>
      </div>

      <div className="grid gap-3">
        {repos.length === 0 ? (
          <div className="p-8 text-center bg-muted/20 rounded-2xl border-2 border-dashed border-muted">
            <GitBranch className="w-8 h-8 mx-auto text-muted-foreground mb-3 opacity-50" />
            <p className="text-muted-foreground font-medium">No repositories found.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Click "Sync Repositories" to fetch from GitHub.
            </p>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {repos.map((repo) => (
              <div 
                key={repo.id}
                className="flex items-center justify-between p-4 rounded-xl border bg-muted/10 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    "p-2 rounded-lg",
                    repo.status === 'active' ? "bg-green-100 text-green-600" : "bg-zinc-100 text-zinc-500"
                  )}>
                    <GitBranch className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-sm font-mono">{repo.fullName}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className={clsx(
                    "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                    repo.status === 'active' 
                      ? "bg-green-100 text-green-700" 
                      : "bg-zinc-100 text-zinc-500"
                  )}>
                    {repo.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground flex items-center gap-2 bg-blue-50 p-3 rounded-xl border border-blue-100 text-blue-700">
        <AlertCircle className="w-4 h-4 shrink-0" />
        If a repository is missing, ensure the GitHub App is installed on it and click Sync.
      </p>
    </div>
  );
}
