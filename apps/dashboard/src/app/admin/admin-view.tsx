'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ChevronDown, 
  ChevronRight, 
  Search, 
  RefreshCw, 
  ShieldAlert, 
  Database 
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  reindexInstallation, 
  disableInstallation, 
  reindexRepository, 
  clearRepositoryVectors,
  updateInstallationPlan
} from './actions';

const timeAgo = (date: Date | null) => {
  if (!date) return 'Never';
  const now = new Date();
  const seconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
};

type Repo = {
  id: string;
  fullName: string;
  isPrivate: boolean;
  status: 'active' | 'removed' | 'deleted';
  isActive: boolean;
  indexedAt: Date | null;
  lastReviewAt: Date | null;
};

type Installation = {
  id: string;
  githubInstallationId: number;
  accountName: string;
  accountType: 'User' | 'Organization';
  planName: string | null;
  planLimits: {
    tier: 'FREE' | 'PRO' | 'TEAM';
    maxRepos: number;
    maxMonthlyActivations: number;
  };
  swapCount: number;
  lastSwapReset: Date | null;
  status: 'active' | 'suspended' | 'inactive' | 'deleted';
  hasApiKey: boolean;
  provider: string | null;
  createdAt: Date;
  repositories: Repo[];
};

const getPlanBadgeClasses = (tier: Installation['planLimits']['tier']) => {
  if (tier === 'TEAM') {
    return 'bg-purple-500/10 text-purple-600 dark:text-purple-300';
  }
  if (tier === 'PRO') {
    return 'bg-blue-500/10 text-blue-600 dark:text-blue-300';
  }
  return 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300';
};

export function AdminView({ 
  data, 
  page, 
  totalPages 
}: { 
  data: Installation[], 
  page: number, 
  totalPages: number 
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const normalizedSearch = searchTerm.trim().toLowerCase();

  // Debounce search update
  useEffect(() => {
    const handler = setTimeout(() => {
      const currentQ = searchParams.get('q') || '';
      if (currentQ === searchTerm) return; // Prevent redundant update

      const params = new URLSearchParams(searchParams.toString());
      if (searchTerm) {
        params.set('q', searchTerm);
      } else {
        params.delete('q');
      }
      params.set('page', '1'); // Reset to page 1 on search
      router.replace(`?${params.toString()}`); // Use replace to avoid history stack spam
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm, router, searchParams]);

  useEffect(() => {
    if (!normalizedSearch) return;
    if (expandedIds.size > 0) return;
    if (!data.length) return;
    setExpandedIds(new Set(data.map(inst => inst.id)));
  }, [normalizedSearch, data, expandedIds]);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedIds(newExpanded);
  };

  const handleAction = async (actionFn: Function, id: string, name: string) => {
    if (!confirm(`Are you sure you want to perform this action on ${name}?`)) return;
    setIsLoading(id);
    try {
      const result = await actionFn(id);
      if (result.success) {
        toast.success('Action completed successfully');
        router.refresh();
      } else {
        toast.error(result.error || 'Action failed');
      }
    } catch (e) {
      toast.error('Unexpected error');
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* --- Search Bar --- */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search accounts, repo names, or installation IDs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* --- Main Installations Table --- */}
      <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
        <div className="grid grid-cols-[auto_2fr_1fr_1fr_1fr_1.5fr_auto] gap-4 p-4 bg-muted/30 font-medium text-sm border-b">
          <div className="w-6"></div>
          <div>Account</div>
          <div>Status</div>
          <div>API Key</div>
          <div>Plan</div>
          <div>Created</div>
          <div className="text-right">Actions</div>
        </div>

        {data.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">No installations found.</div>
        )}

        {data.map((inst) => (
          <div key={inst.id} className="border-b last:border-0">
            {/* Top Row: Installation */}
            <div className={`grid grid-cols-[auto_2fr_1fr_1fr_1fr_1.5fr_auto] gap-4 p-4 items-center hover:bg-muted/10 transition-colors ${expandedIds.has(inst.id) ? 'bg-muted/20' : ''}`}>
              <button onClick={() => toggleExpand(inst.id)} className="p-1 hover:bg-muted rounded-sm transition-colors cursor-pointer">
                {expandedIds.has(inst.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              
              <div>
                <div className="font-semibold flex items-center gap-2">
                  {inst.accountName}
                  <span className="text-[10px] font-normal text-muted-foreground bg-secondary px-2 py-0.5 rounded-full capitalize border border-border/50">
                    {inst.accountType}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground font-mono mt-0.5">ID: {inst.githubInstallationId}</div>
              </div>

              <div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  inst.status === 'active' ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 
                  inst.status === 'suspended' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' :
                  'bg-red-500/10 text-red-600 dark:text-red-400'
                }`}>
                  {inst.status.toUpperCase()}
                </span>
              </div>

              <div className="text-sm">
                {inst.hasApiKey ? (
                  <span className="text-green-600 dark:text-green-400 flex items-center gap-1.5 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"/> 
                    {inst.provider?.toUpperCase()}
                  </span>
                ) : (
                  <span className="text-muted-foreground/70 italic text-xs">Not Configured</span>
                )}
              </div>

              <div className="text-sm">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide ${getPlanBadgeClasses(inst.planLimits.tier)}`}
                    >
                      {inst.planName || 'Free'}
                    </span>
                    <select
                      value={inst.planName || 'Free'}
                      onChange={(e) => {
                        const newPlan = e.target.value;
                        handleAction(
                          async () => updateInstallationPlan(inst.id, newPlan),
                          inst.id,
                          `Plan change to ${newPlan} for ${inst.accountName}`
                        );
                      }}
                      disabled={isLoading === inst.id}
                      className="text-xs font-medium px-2 py-1 rounded-md border border-border/60 bg-muted/40 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                    >
                      <option value="Free">Free</option>
                      <option value="Pro">Pro</option>
                      <option value="Team">Team</option>
                    </select>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {inst.planLimits.maxRepos >= 999999 ? 'Unlimited repos' : `${inst.planLimits.maxRepos} repos`} • {inst.planLimits.maxMonthlyActivations >= 999999 ? 'Unlimited activations' : `${inst.planLimits.maxMonthlyActivations} activations/mo`}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Swaps used this period: {inst.swapCount}
                  </span>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">{timeAgo(inst.createdAt)}</div>

              <div className="flex justify-end gap-2">
                <button 
                  onClick={() => handleAction(reindexInstallation, inst.id, inst.accountName)}
                  disabled={isLoading === inst.id}
                  className="p-2 hover:bg-blue-500/10 text-blue-500 hover:text-blue-600 rounded-md disabled:opacity-50 transition-colors cursor-pointer"
                  title="Reindex All Repositories"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading === inst.id ? 'animate-spin' : ''}`} />
                </button>
                <button 
                  onClick={() => handleAction(disableInstallation, inst.id, inst.accountName)}
                  disabled={isLoading === inst.id}
                  className="p-2 hover:bg-red-500/10 text-red-500 hover:text-red-600 rounded-md disabled:opacity-50 transition-colors cursor-pointer"
                  title="Disable Installation"
                >
                  <ShieldAlert className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Nested Row: Repositories */}
            {expandedIds.has(inst.id) && (
              <div className="bg-zinc-50/50 dark:bg-zinc-900/30 p-4 border-t shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
                <div className="mb-3 text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 px-2">
                  <Database className="h-3 w-3" /> Repositories ({inst.repositories.length})
                </div>
                
                {inst.repositories.length === 0 ? (
                  <div className="text-sm text-muted-foreground italic pl-6 py-2">No repositories found.</div>
                ) : (
                  <div className="rounded-md border bg-background overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/30">
                        <tr className="text-left text-muted-foreground border-b border-border/50">
                          <th className="py-2.5 pl-4 font-medium">Name</th>
                          <th className="py-2.5 font-medium">Status</th>
                          <th className="py-2.5 font-medium">Indexed At</th>
                          <th className="py-2.5 pr-4 text-right font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inst.repositories.map(repo => (
                          <tr key={repo.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                            <td className="py-2.5 pl-4">
                              <div className="flex items-center gap-2 font-mono text-xs md:text-sm">
                                {repo.fullName}
                                {repo.isPrivate && (
                                  <span className="text-[9px] border px-1 rounded-sm bg-muted text-muted-foreground font-sans">Pv</span>
                                )}
                              </div>
                            </td>
                            <td className="py-2">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-medium ${
                                repo.status !== 'active' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                !repo.isActive ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' :
                                'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                              }`}>
                                {repo.status !== 'active' ? repo.status : (!repo.isActive ? 'inactive' : 'active')}
                              </span>
                            </td>
                            <td className="py-2 text-muted-foreground text-xs">
                              {timeAgo(repo.indexedAt)}
                            </td>
                            <td className="py-2 pr-4 text-right">
                              <button 
                                onClick={() => handleAction(reindexRepository, repo.id, repo.fullName)}
                                className="p-1.5 hover:bg-blue-100 text-muted-foreground hover:text-blue-600 rounded-md transition-colors mr-1"
                                title="Reindex this repo"
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                              </button>
                              <button 
                                onClick={() => handleAction(clearRepositoryVectors, repo.id, repo.fullName)}
                                className="p-1.5 hover:bg-red-100 text-muted-foreground hover:text-red-600 rounded-md transition-colors"
                                title="Clear Vectors"
                              >
                                <Database className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* --- Pagination --- */}
      <div className="flex items-center justify-between border-t pt-4">
         <div className="text-sm text-muted-foreground">
             Showing {data.length} results
         </div>
         <div className="flex gap-2">
            <button
            disabled={page <= 1}
            onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set('page', String(page - 1));
                router.push(`?${params.toString()}`);
            }}
            className="px-3 py-1.5 border rounded-md disabled:opacity-50 hover:bg-muted text-sm font-medium transition-colors cursor-pointer"
            >
            Previous
            </button>
            <span className="px-3 py-1.5 text-sm font-medium flex items-center bg-muted/20 rounded-md">
            Page {page} of {totalPages}
            </span>
            <button
            disabled={page >= totalPages}
            onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set('page', String(page + 1));
                router.push(`?${params.toString()}`);
            }}
            className="px-3 py-1.5 border rounded-md disabled:opacity-50 hover:bg-muted text-sm font-medium transition-colors cursor-pointer"
            >
            Next
            </button>
         </div>
      </div>
    </div>
  );
}
