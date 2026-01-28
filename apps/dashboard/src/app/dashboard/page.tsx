import { db, repositories, installations, configs, reviews } from "@/lib/db";
import { Github, CheckCircle2, AlertCircle, Clock, ArrowRight, Key, Sparkles, Lock, Zap, Activity, MoreHorizontal, Calendar } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/authOptions";
import { eq, isNotNull, and, inArray, sql, desc } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserOrgIds } from "@/lib/github";
import { DashboardSearch } from "./dashboard-search";
import { getPlanLimits, PlanTier } from "../../../../worker/src/lib/plans";
import { formatDistanceToNow } from "date-fns";

export const dynamic = 'force-dynamic';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; account?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || '';
  const accountFilter = params.account;
  const normalizedQuery = query.trim().toLowerCase();
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/');
  }

  // @ts-expect-error session.accessToken exists
  const accessToken = session.accessToken;
  // @ts-expect-error session.user.id
  const githubUserId = parseInt(session.user.id);

  // LONG TERM FIX: Fetch user's organizations to include those installations
  const orgIds = accessToken ? await getUserOrgIds(accessToken) : [];
  const allAccountIds = [githubUserId, ...orgIds];

  // Fetch user's installations (Personal + Orgs)
  const userInstallations = await db
    .select()
    .from(installations)
    .where(
      and(
        inArray(installations.githubAccountId, allAccountIds),
        eq(installations.status, 'active')
      )
    );

  // SELF-HEALING: Re-associate repositories with the latest active installation
  for (const inst of userInstallations) {
    const accountId = inst.githubAccountId;
    if (!accountId) continue;

    const allInstIdsForAccount = await db
      .select({ id: installations.id })
      .from(installations)
      .where(eq(installations.githubAccountId, accountId));
    
    const ids = allInstIdsForAccount.map(i => i.id);
    
    if (ids.length > 1) {
      await db.update(repositories)
        .set({ installationId: inst.id })
        .where(
          and(
            inArray(repositories.installationId, ids),
            eq(repositories.status, 'active')
          )
        );
    }
  }

  const userRepos = await db
    .select({
      id: repositories.id,
      fullName: repositories.fullName,
      indexedAt: repositories.indexedAt,
      installationId: repositories.installationId,
      githubAccountId: installations.githubAccountId,
      hasApiKey: isNotNull(configs.apiKeyEncrypted),
      status: repositories.status,
      planId: installations.planId,
      expiresAt: installations.expiresAt,
    })
    .from(repositories)
    .innerJoin(installations, eq(repositories.installationId, installations.id))
    .leftJoin(configs, eq(repositories.installationId, configs.installationId))
    .where(
      and(
        inArray(installations.githubAccountId, allAccountIds),
        eq(installations.status, 'active'),
        eq(repositories.status, 'active')
      )
    );

  // Fetch latest review timestamp for each repo
  let reviewMap = new Map<string, Date>();
  
  if (userRepos.length > 0) {
    const latestReviews = await db
      .select({
        repositoryId: reviews.repositoryId,
        lastReviewAt: sql<string>`max(${reviews.createdAt})`,
      })
      .from(reviews)
      .where(inArray(reviews.repositoryId, userRepos.map(r => r.id)))
      .groupBy(reviews.repositoryId);
      
    latestReviews.forEach(r => {
      if (r.lastReviewAt) {
        reviewMap.set(r.repositoryId, new Date(r.lastReviewAt));
      }
    });
  }

  // Merge and sort by latest activity
  const reposWithActivity = userRepos.map(repo => ({
    ...repo,
    lastReviewAt: reviewMap.get(repo.id) || null
  }));

  const sortedRepos = reposWithActivity.sort((a, b) => {
    // Sort by lastReviewAt desc (latest first), then by id
    const dateA = a.lastReviewAt?.getTime() || 0;
    const dateB = b.lastReviewAt?.getTime() || 0;
    return dateB - dateA;
  });

  const filteredUserRepos = normalizedQuery
    ? sortedRepos.filter(r => r.fullName.toLowerCase().includes(normalizedQuery))
    : sortedRepos;

  const finalFilteredRepos = accountFilter
    ? filteredUserRepos.filter(r => r.installationId === accountFilter)
    : filteredUserRepos;

  const reposForStats = accountFilter
    ? sortedRepos.filter(r => r.installationId === accountFilter)
    : sortedRepos;

  const totalActiveRepos = reposForStats.length;
    
  const reposMissingConfig = finalFilteredRepos.filter(r => !r.hasApiKey);
  const configuredRepos = finalFilteredRepos.filter(r => r.hasApiKey);
  
  // Dummy stats for now - in a real app these would be aggregated from DB
  const stats = [
    { 
      label: "Active Repositories", 
      value: `${totalActiveRepos}`, 
      icon: <Github className="w-5 h-5 text-zinc-900" />,
      change: "+2 this week"
    },
    { 
      label: "Code Reviews", 
      value: "1.2k", 
      icon: <Activity className="w-5 h-5 text-blue-600" />,
      change: "+12% vs last month"
    },
    { 
      label: "Issues Detected", 
      value: "342", 
      icon: <AlertCircle className="w-5 h-5 text-amber-600" />,
      change: "8 critical fixed"
    },
    { 
      label: "Time Saved", 
      value: "84h", 
      icon: <Zap className="w-5 h-5 text-purple-600" />,
      change: "Est. manual time"
    },
  ];
  
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-zinc-900">Dashboard</h1>
          <p className="text-zinc-500 font-medium">
            Welcome back, <span className="text-zinc-900 font-bold">{session.user.name}</span>. Here's what's happening.
          </p>
        </div>
        <div className="flex items-center gap-2">
           {/* Future Actions */}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="group p-5 bg-white border border-zinc-200/60 rounded-2xl shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-100 group-hover:bg-zinc-100 transition-colors">
                {stat.icon}
              </div>
              {stat.change && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 bg-zinc-50 px-2 py-1 rounded-full border border-zinc-100">
                  {stat.change}
                </span>
              )}
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-black tracking-tight text-zinc-900">{stat.value}</div>
              <div className="text-sm font-semibold text-zinc-500">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Split */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column: Repositories (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Action Required Banner */}
          {reposMissingConfig.length > 0 && (
            <div className="bg-amber-50/50 border border-amber-200/60 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3 text-amber-900">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-lg">Configuration Required</h3>
              </div>
              <p className="text-sm text-amber-800/80 font-medium leading-relaxed">
                The following repositories need an API key to enable AI reviews. 
                Without this, ReviewScope cannot analyze your pull requests.
              </p>
              <div className="grid gap-3">
                {reposMissingConfig.map((repo) => (
                  <div key={repo.id} className="flex items-center justify-between p-4 bg-white border border-amber-100 rounded-xl shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                        <Key className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-amber-950">{repo.fullName}</span>
                    </div>
                    <Link 
                      href={`/settings/${repo.installationId}/config`}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors"
                    >
                      Setup Key
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Repositories List */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                <Github className="w-5 h-5" />
                Repositories
              </h2>
              <DashboardSearch 
                installations={userInstallations.map(inst => ({
                  id: inst.id,
                  accountName: inst.accountName
                }))}
              />
            </div>

            <div className="bg-white border border-zinc-200/60 rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-100 text-[10px] font-bold uppercase tracking-wider text-zinc-500 bg-zinc-50/50">
                    <th className="px-6 py-4 font-black text-zinc-400">Repository</th>
                    <th className="px-6 py-4 font-black text-zinc-400">AI Status</th>
                    <th className="px-6 py-4 font-black text-zinc-400 hidden sm:table-cell">Last Review</th>
                    <th className="px-6 py-4 font-black text-zinc-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {configuredRepos.length === 0 && reposMissingConfig.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-12 text-center space-y-4">
                        <div className="w-16 h-16 mx-auto bg-zinc-50 rounded-full flex items-center justify-center border border-zinc-100">
                          <Github className="w-8 h-8 text-zinc-300" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-lg font-bold text-zinc-900">No repositories found</h3>
                          <p className="text-zinc-500">Connect a GitHub repository to get started.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    configuredRepos.map((repo) => {
                      const limits = getPlanLimits(repo.planId, repo.expiresAt);
                      
                      return (
                        <tr key={repo.id} className="group hover:bg-zinc-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-600 border border-zinc-200/50 group-hover:scale-105 transition-transform">
                                <Github className="w-5 h-5" />
                              </div>
                              <div>
                                <Link
                                  href={`/repositories/${repo.id}`}
                                  className="block font-bold text-zinc-900 hover:text-primary transition-colors text-sm"
                                >
                                  {repo.fullName.split('/')[1]}
                                </Link>
                                <span className="text-xs font-medium text-zinc-400">
                                  {repo.fullName.split('/')[0]}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                             {(() => {
                              if (!limits.allowRAG) {
                                return (
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-500 border border-zinc-200 text-[10px] font-bold uppercase tracking-wider">
                                    <Lock className="w-3 h-3" /> Basic
                                  </div>
                                );
                              }
                              return repo.indexedAt ? (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-50 text-green-700 border border-green-200/50 text-[10px] font-bold uppercase tracking-wider">
                                  <CheckCircle2 className="w-3 h-3" /> Indexed
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200/50 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                                  <Clock className="w-3 h-3" /> Indexing
                                </div>
                              );
                            })()}
                          </td>
                          <td className="px-6 py-4 hidden sm:table-cell">
                            {repo.lastReviewAt ? (
                              <div className="flex items-center gap-2 text-xs font-medium text-zinc-600">
                                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                                {formatDistanceToNow(repo.lastReviewAt, { addSuffix: true })}
                              </div>
                            ) : (
                              <span className="text-xs text-zinc-400 italic">No reviews yet</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                             <Link
                              href={`/repositories/${repo.id}`}
                              className="inline-flex items-center gap-1 text-xs font-bold text-zinc-400 hover:text-primary transition-colors"
                            >
                              Details <ArrowRight className="w-3 h-3" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
                
              {/* Install New Repo CTA */}
              <a
                href={`https://github.com/apps/review-scope/installations/new`}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 bg-zinc-50/50 hover:bg-primary/5 transition-colors text-center border-t border-zinc-100 group"
              >
                <span className="inline-flex items-center gap-2 text-sm font-bold text-zinc-600 group-hover:text-primary transition-colors">
                  <Sparkles className="w-4 h-4" />
                  Connect another repository
                </span>
              </a>
            </div>
          </div>
        </div>

        {/* Right Column: Engine Intel (1/3 width) */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-zinc-900">Installations</h2>
            <Link href="/settings" className="text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-colors">
              Manage
            </Link>
          </div>

          <div className="space-y-4">
            {userInstallations.length > 0 ? (
              userInstallations
                .filter(inst => inst.status === 'active')
                .map((inst) => {
                  const plan = (inst.planName === 'None' || !inst.planName) ? 'Free' : inst.planName;
                  const limits = getPlanLimits(inst.planId, inst.expiresAt);
                  const activeRepos = userRepos.filter(r => r.installationId === inst.id).length;

                  const planStyles = {
                    [PlanTier.FREE]: "bg-zinc-100 text-zinc-600 border border-zinc-200",
                    [PlanTier.PRO]: "bg-blue-50 text-blue-700 border border-blue-200",
                    [PlanTier.TEAM]: "bg-violet-50 text-violet-700 border border-violet-200",
                  };

                  return (
                    <div key={inst.id} className="bg-white border border-zinc-200/60 rounded-2xl p-5 shadow-sm space-y-4 hover:border-zinc-300 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-zinc-900 text-sm">{inst.accountName}</h4>
                          <span className="text-xs font-medium text-zinc-400">GitHub Account</span>
                        </div>
                        <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${planStyles[limits.tier]}`}>
                          {plan}
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-zinc-100">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-500 font-medium">Repositories</span>
                          <span className="font-bold text-zinc-900">{activeRepos} Active</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-500 font-medium">Context Window</span>
                          <span className="font-bold text-zinc-900">{limits.ragK}</span>
                        </div>
                        {limits.tier === PlanTier.TEAM && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-500 font-medium">Features</span>
                            <span className="font-bold text-primary flex items-center gap-1">
                              <Zap className="w-3 h-3" /> Priority
                            </span>
                          </div>
                        )}
                      </div>

                      <Link
                        href={`/settings/${inst.id}/config`}
                        className="block w-full py-2 text-center text-xs font-bold text-zinc-600 bg-zinc-50 hover:bg-zinc-100 rounded-xl border border-zinc-200/50 transition-colors"
                      >
                        Configure Settings
                      </Link>
                    </div>
                  );
                })
            ) : (
              <div className="p-6 bg-white border border-zinc-200/60 rounded-2xl text-center space-y-3">
                <p className="text-sm text-zinc-500">No active installations found.</p>
                <a
                  href={`https://github.com/apps/review-scope/installations/new`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-xs font-bold rounded-xl hover:bg-zinc-800 transition-colors"
                >
                  <Github className="w-3 h-3" />
                  Install App
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
