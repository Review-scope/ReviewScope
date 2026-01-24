import { db, repositories, installations, configs, reviews } from "@/lib/db";
import { Github, CheckCircle2, AlertCircle, Clock, ArrowRight, Key, Zap, BarChart3, ShieldCheck, Sparkles, Lock, Gauge, Layers, MessageSquare, Check, Power, RefreshCw, Book, Server } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/authOptions";
import { eq, isNotNull, and, count, desc, inArray, or } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ActivationToggle } from "../repositories/[id]/activation-toggle";
import { getUserOrgIds } from "@/lib/github";
import { DashboardSearch } from "./dashboard-search";
import { getPlanLimits, PlanTier } from "../../../../worker/src/lib/plans";

export const dynamic = 'force-dynamic';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || '';
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
  // This fixes orphaned repos from uninstalls/reinstalls
  for (const inst of userInstallations) {
    const accountId = inst.githubAccountId;
    if (!accountId) continue;

    // Get all installation IDs for this account
    const allInstIdsForAccount = await db
      .select({ id: installations.id })
      .from(installations)
      .where(eq(installations.githubAccountId, accountId));
    
    const ids = allInstIdsForAccount.map(i => i.id);
    
    if (ids.length > 1) {
      // If there are multiple installations (old ones), move all active repos to the current active one
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
      isActive: repositories.isActive,
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

  const totalActiveRepos = userRepos.filter(r => r.isActive).length;
  const totalCapacity = userInstallations.reduce((sum, inst) => {
    const limits = getPlanLimits(inst.planId, inst.expiresAt);
    return sum + limits.maxRepos;
  }, 0);
  const filteredUserRepos = normalizedQuery
    ? userRepos.filter(r => r.fullName.toLowerCase().includes(normalizedQuery))
    : userRepos;
  const reposMissingConfig = filteredUserRepos.filter(r => !r.hasApiKey);
  const configuredRepos = filteredUserRepos.filter(r => r.hasApiKey);
  const stats = [
    { 
      label: "Active Repos", 
      value: `${totalActiveRepos}/${totalCapacity}`, 
      icon: <Github className="w-5 h-5 text-blue-500" /> 
    },
    { label: "AI Reviews", value: "1.2k", icon: <Sparkles className="w-5 h-5 text-amber-500" /> },
    { label: "Issues Caught", value: 342, icon: <AlertCircle className="w-5 h-5 text-red-500" /> },
    { label: "Time Saved", value: "84h", icon: <Clock className="w-5 h-5 text-green-500" /> },
  ];
  
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-12">
      {/* Premium Header */}
      <header className="relative overflow-hidden rounded-[2.5rem] bg-zinc-900 text-white p-8 md:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-linear-to-l from-primary/20 to-transparent"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="space-y-4 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold uppercase tracking-widest text-primary-foreground/80">
              <ShieldCheck className="w-3 h-3" />
              Verified Developer
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter italic uppercase">
              Developer <span className="text-primary">Control Center</span>
            </h1>
            <p className="text-lg text-zinc-400 font-medium max-w-xl">
              Monitor <span className="text-white font-bold italic">your personal</span> AI code review infrastructure and project health across <span className="text-white font-bold">@{session.user.name}</span>&apos;s ecosystem.
            </p>
          </div>
          <div className="flex flex-col items-center gap-4">
             <img src="/logo1.png" alt="ReviewScope logo" className="w-32 h-32 object-contain drop-shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
          </div>
        </div>

        {/* Floating Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 md:p-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{stat.label}</span>
                {stat.icon}
              </div>
              <div className="text-2xl md:text-3xl font-black tracking-tight">{stat.value}</div>
            </div>
          ))}
        </div>
      </header>

      {/* Plan Quota Warning Banners */}
      {userInstallations
        .map((inst) => {
          const activeCount = userRepos.filter(r => r.installationId === inst.id && r.isActive).length;
          const planName = (inst.planName === 'None' || !inst.planName) ? 'Free' : inst.planName;
          const limits = getPlanLimits(inst.planId, inst.expiresAt);
          const limit = limits.maxRepos;
          const isAtLimit = activeCount >= limit;
          
          return isAtLimit ? (
            <div 
              key={inst.id}
              className="rounded-2xl border-2 border-orange-200 bg-orange-50 p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm"
            >
              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-orange-100 rounded-lg mt-0.5">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-bold text-orange-900">Active Repository Limit Reached</h3>
                  <p className="text-sm text-orange-700 mt-1">
                    You&apos;ve activated all <span className="font-bold">{limit}</span> repositories allowed on the {planName} plan for @{inst.accountName}. Deactivate one to turn on another, or upgrade.
                  </p>
                </div>
              </div>
              <Link
                href={`/pricing?accountId=${inst.githubAccountId}`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold text-sm uppercase tracking-wide transition-colors whitespace-nowrap cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                Upgrade Plan
              </Link>
            </div>
          ) : activeCount >= limit - 1 ? (
            <div 
              key={inst.id}
              className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm"
            >
              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-amber-100 rounded-lg mt-0.5">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-amber-900">Approaching Active Limit</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    You&apos;re using <span className="font-bold">{activeCount}/{limit}</span> active repositories on the {planName} plan for @{inst.accountName}.
                  </p>
                </div>
              </div>
              <Link
                href={`/pricing?accountId=${inst.githubAccountId}`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-sm uppercase tracking-wide transition-colors whitespace-nowrap cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                Upgrade Plan
              </Link>
            </div>
          ) : null;
        })}

      {/* Main Content Area */}
      <main className="space-y-12">
        {/* Urgent Attention if Missing Config */}
        {reposMissingConfig.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2 text-orange-500">
                <AlertCircle className="w-5 h-5" />
                Action Required ({reposMissingConfig.length})
              </h3>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {reposMissingConfig.map((repo) => (
                <div key={repo.id} className="relative group overflow-hidden bg-orange-50/50 border-2 border-orange-200/50 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 transition-all hover:bg-orange-50 hover:border-orange-300">
                   <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-100 text-orange-600 rounded-2xl border border-orange-200 group-hover:scale-110 transition-transform">
                      <Key className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-orange-900">{repo.fullName.split('/')[1]}</h4>
                      <p className="text-xs text-orange-700/70 font-medium italic">Missing AI configuration Layer</p>
                    </div>
                  </div>
                  <Link 
                    href={`/settings/${repo.installationId}/config`}
                    className="w-full md:w-auto px-6 py-2.5 bg-orange-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-200 hover:bg-orange-700 transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                  >
                    Setup Key
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}



        {/* Repositories Grid */}
        <section className="space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h3 className="text-2xl font-black uppercase tracking-tighter italic">Repositories</h3>
            <DashboardSearch />
          </div>

          <div className="border border-border/60 rounded-xl md:rounded-3xl md:border-2 md:overflow-hidden md:bg-card md:shadow-sm">
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 text-[11px] font-black uppercase tracking-widest text-muted-foreground/80 bg-muted/60">
              <span className="col-span-5">Repository</span>
              <span className="col-span-2">Owner</span>
              <span className="col-span-2">Status</span>
              <span className="col-span-2">Activation</span>
              <span className="col-span-1 text-right">Actions</span>
            </div>

            <div className="divide-y divide-border/70">
              {configuredRepos.map((repo) => (
                <div
                  key={repo.id}
                  className="group px-4 md:px-6 py-4 flex flex-col gap-3 md:grid md:grid-cols-12 md:items-center md:gap-4 md:hover:bg-muted/40 transition-colors"
                >
                  <div className="md:col-span-5 flex items-center gap-3">
                    <Link
                      href={`/repositories/${repo.id}`}
                      className="p-3 rounded-2xl bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-inner cursor-pointer"
                    >
                      <Github className="w-5 h-5" />
                    </Link>
                    <div className="space-y-1">
                      <Link
                        href={`/repositories/${repo.id}`}
                        className="font-black text-lg tracking-tight truncate group-hover:text-primary transition-colors cursor-pointer"
                      >
                        {repo.fullName.split('/')[1]}
                      </Link>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
                        {repo.fullName.split('/')[0]}
                      </p>
                    </div>
                  </div>

                  <div className="md:col-span-2 text-sm font-mono text-muted-foreground/90">
                    @{repo.fullName.split('/')[0]}
                  </div>

                  <div className="md:col-span-2 flex items-center gap-2">
                    {!repo.isActive ? (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 text-zinc-500 text-[10px] font-black uppercase tracking-widest border border-zinc-200 w-fit">
                        —
                      </div>
                    ) : repo.indexedAt ? (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-widest border border-green-200 w-fit">
                        <CheckCircle2 className="w-3 h-3" /> Indexed
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest border border-blue-200 animate-pulse w-fit">
                        <Clock className="w-3 h-3" /> Indexing
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-2 flex items-center gap-2">
                    <div className="scale-90 origin-left cursor-pointer">
                      <ActivationToggle repoId={repo.id} isActive={repo.isActive} />
                    </div>
                    <span className="sr-only">Toggle activation</span>
                  </div>

                  <div className="md:col-span-1 flex md:justify-end">
                    <Link
                      href={`/repositories/${repo.id}`}
                      className="flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors cursor-pointer"
                    >
                      Explore <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}

              {(() => {
                const canConnect = userInstallations.some(inst => {
                  const limits = getPlanLimits(inst.planId, inst.expiresAt);
                  // Allow connecting more repos than the active limit to enable swapping
                  // Only block if the plan effectively has 0 allowed repos (e.g. None/Expired)
                  const limit = limits.maxRepos > 0 ? 100 : 0;
                  const count = userRepos.filter(r => r.installationId === inst.id).length;
                  return count < limit;
                });

                if (canConnect) {
                  return (
                    <a
                      href={`https://github.com/apps/review-scope/installations/new`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 md:px-6 py-5 flex flex-col gap-2 md:grid md:grid-cols-12 md:items-center md:gap-4 bg-muted/20 md:bg-muted/30 md:hover:bg-primary/10 transition-colors cursor-pointer rounded-b-xl md:rounded-none"
                    >
                      <div className="md:col-span-5 flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-muted flex items-center justify-center group-hover:bg-primary/20 text-primary transition-all">
                          <Sparkles className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <div className="font-black text-base uppercase tracking-tight italic">Connect New Repository</div>
                          <p className="text-xs text-muted-foreground font-medium max-w-xl">Expand your AI coverage by installing the GitHub App.</p>
                        </div>
                      </div>
                      <div className="md:col-span-2 text-sm font-mono text-muted-foreground/90">Available slot</div>
                      <div className="md:col-span-2 flex items-center gap-2 text-sm font-semibold text-primary">Ready</div>
                      <div className="md:col-span-2"></div>
                      <div className="md:col-span-1 flex md:justify-end">
                        <span className="text-[11px] font-black uppercase tracking-widest text-primary">Install</span>
                      </div>
                    </a>
                  );
                }
                return (
                  <Link
                    href={`/pricing?accountId=${userInstallations[0]?.githubAccountId}`}
                    className="px-4 md:px-6 py-5 flex flex-col gap-2 md:grid md:grid-cols-12 md:items-center md:gap-4 bg-amber-50/80 md:bg-amber-50/60 md:hover:bg-amber-100 transition-colors cursor-pointer rounded-b-xl md:rounded-none"
                  >
                    <div className="md:col-span-5 flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <div className="font-black text-base uppercase tracking-tight italic text-amber-900">Repository Limit Reached</div>
                        <p className="text-xs text-amber-800 font-medium max-w-xl">Upgrade your plan to add more repositories to ReviewScope.</p>
                      </div>
                    </div>
                    <div className="md:col-span-2 text-sm font-mono text-amber-800/90">Upgrade needed</div>
                    <div className="md:col-span-2 flex items-center gap-2 text-sm font-semibold text-amber-700">Locked</div>
                    <div className="md:col-span-2"></div>
                    <div className="md:col-span-1 flex md:justify-end">
                      <span className="text-[11px] font-black uppercase tracking-widest text-amber-700">Upgrade</span>
                    </div>
                  </Link>
                );
              })()}
            </div>
          </div>
        </section>

        {/* Engine Intel Summary */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black uppercase tracking-tighter italic">Engine Intel</h3>
            <Link 
              href="/settings"
              className="text-xs font-bold uppercase tracking-wide text-primary hover:text-primary/80 transition-colors flex items-center gap-1 cursor-pointer"
            >
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          
          {userInstallations.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {userInstallations
                .filter(inst => inst.status === 'active')
                .map((inst) => {
                  const plan = (inst.planName === 'None' || !inst.planName) ? 'Free' : inst.planName;
                  const limits = getPlanLimits(inst.planId, inst.expiresAt);

                  return (
                    <div key={inst.id} className="bg-card border-2 border-border/50 rounded-2xl p-6 space-y-4">
                      <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
                          <Sparkles className="w-3 h-3" />
                          {plan} Plan
                        </div>
                        <h4 className="font-bold text-sm">{inst.accountName}</h4>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <Github className="w-3.5 h-3.5 text-purple-500" />
                            <span className="font-medium">Repos</span>
                          </div>
                          <span className="font-bold">
                            {userRepos.filter(r => r.installationId === inst.id && r.isActive).length}/{limits.maxRepos > 1000 ? 'Unlimited' : limits.maxRepos}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <RefreshCw className="w-3.5 h-3.5 text-green-600" />
                            <span className="font-medium">Swaps</span>
                          </div>
                          <span className="font-bold">
                            {inst.swapCount}/{limits.maxMonthlyActivations > 1000 ? 'Unlimited' : limits.maxMonthlyActivations}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <Gauge className="w-3.5 h-3.5 text-primary" />
                            <span className="font-medium">PR Size</span>
                          </div>
                          <span className="font-bold">{limits.maxFiles > 1000 ? 'Unlimited' : limits.maxFiles}</span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5 text-blue-500" />
                            <span className="font-medium">RAG Depth</span>
                          </div>
                          <span className="font-bold">{limits.ragK}</span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                            <span className="font-medium">Chat Iter</span>
                          </div>
                          <span className="font-bold">{limits.chatPerPRLimit === 'unlimited' ? 'Unlimited' : limits.chatPerPRLimit}</span>
                        </div>

                        {limits.tier === PlanTier.TEAM && (
                          <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg text-xs">
                            <Check className="w-3 h-3 text-primary" />
                            <span className="font-bold text-primary">Batching</span>
                          </div>
                        )}
                      </div>

                      <Link
                        href={`/settings/${inst.id}/config`}
                        className="w-full mt-2 py-2 px-2 text-center text-xs font-bold uppercase tracking-wide bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors cursor-pointer"
                      >
                        Configure
                      </Link>
                    </div>
                  );
                })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
