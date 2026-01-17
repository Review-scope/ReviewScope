import { db, repositories, installations, configs, reviews } from '@/lib/db';
import { Github, CheckCircle2, AlertCircle, Clock, ArrowRight, Key, Zap, BarChart3, ShieldCheck, Search, Filter, Sparkles, Lock, Gauge, Layers, MessageSquare, Check } from 'lucide-react';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]/route';
import { eq, isNotNull, and, count, desc } from 'drizzle-orm';
import Link from 'next/link';
import { redirect } from 'next/navigation';

// Plan limits mapping (match worker/lib/plans.ts)
const planLimits: { [key: string]: { maxRepos: number } } = {
  Free: { maxRepos: 3 },
  Pro: { maxRepos: 5 },
  Team: { maxRepos: 999999 }
};

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/');
  }

  // @ts-expect-error session.user.id
  const githubUserId = parseInt(session.user.id);

  // Fetch user's installations to check plan limits
  const userInstallations = await db
    .select()
    .from(installations)
    .where(
      and(
        eq(installations.githubAccountId, githubUserId),
        eq(installations.status, 'active')
      )
    );

  // Fetch repositories with config and review counts
  const userRepos = await db
    .select({
      id: repositories.id,
      fullName: repositories.fullName,
      indexedAt: repositories.indexedAt,
      installationId: repositories.installationId,
      hasApiKey: isNotNull(configs.apiKeyEncrypted),
      status: repositories.status,
    })
    .from(repositories)
    .innerJoin(installations, eq(repositories.installationId, installations.id))
    .leftJoin(configs, eq(repositories.installationId, configs.installationId))
    .where(
      and(
        eq(installations.githubAccountId, githubUserId),
        eq(installations.status, 'active'),
        eq(repositories.status, 'active')
      )
    );

  const reposMissingConfig = userRepos.filter(r => !r.hasApiKey);
  const reposActive = userRepos.filter(r => r.hasApiKey);

  // Mock stats (Real stats would involve deeper joins or separate queries)
  const stats = [
    { label: "Active Repos", value: userRepos.length, icon: <Github className="w-5 h-5 text-blue-500" /> },
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
              Monitor your AI code review infrastructure and project health across <span className="text-white font-bold">@{session.user.name}</span>&apos;s ecosystem.
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

      {/* Plan Quota Warning Banner */}
      {userInstallations
        .filter(inst => inst.planName === 'Free' || !inst.planName)
        .map((inst) => {
          const repoCount = userRepos.filter(r => r.installationId === inst.id).length;
          const limit = planLimits[inst.planName || 'Free'].maxRepos;
          const isAtLimit = repoCount >= limit;
          
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
                  <h3 className="font-bold text-orange-900">Repository Limit Reached</h3>
                  <p className="text-sm text-orange-700 mt-1">
                    You've added all <span className="font-bold">{limit}</span> repositories allowed on the Free plan. Upgrade to add more.
                  </p>
                </div>
              </div>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold text-sm uppercase tracking-wide transition-colors whitespace-nowrap"
              >
                <Zap className="w-4 h-4" />
                Upgrade Plan
              </Link>
            </div>
          ) : repoCount >= limit - 1 ? (
            // Warning when at limit - 1
            <div 
              key={inst.id}
              className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm"
            >
              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-amber-100 rounded-lg mt-0.5">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-amber-900">Approaching Repository Limit</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    You're using <span className="font-bold">{repoCount}/{limit}</span> repositories on the Free plan. Plan ahead to upgrade.
                  </p>
                </div>
              </div>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-sm uppercase tracking-wide transition-colors whitespace-nowrap"
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
                    href={`/settings`}
                    className="w-full md:w-auto px-6 py-2.5 bg-orange-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-200 hover:bg-orange-700 transition-all hover:translate-y-[-2px] active:translate-y-0"
                  >
                    Setup Key
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Active Grid */}
        <section className="space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h3 className="text-2xl font-black uppercase tracking-tighter italic">Active Repositories</h3>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Filter repositories..." 
                  className="w-full pl-10 pr-4 py-2 bg-card border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" 
                />
              </div>
              <button className="p-2 border rounded-xl bg-card hover:bg-accent transition-colors">
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {reposActive.map((repo) => (
              <Link 
                href={`/repositories/${repo.id}`}
                key={repo.id} 
                className="group relative border-2 border-transparent hover:border-primary/20 rounded-[2rem] p-8 bg-card shadow-sm hover:shadow-2xl transition-all hover:-translate-y-1 overflow-hidden"
              >
                {/* Background Accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/2 rounded-full -mr-16 -mt-16 group-hover:bg-primary/5 transition-colors"></div>
                
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-8">
                    <div className="p-4 rounded-3xl bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-inner">
                      <Github className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {repo.indexedAt ? (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 text-[9px] font-black uppercase tracking-widest border border-green-200">
                          <CheckCircle2 className="w-3 h-3" /> Indexed
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-[9px] font-black uppercase tracking-widest border border-blue-200 animate-pulse">
                          <Clock className="w-3 h-3" /> Indexing
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <h2 className="font-black text-2xl tracking-tight truncate group-hover:text-primary transition-colors">
                      {repo.fullName.split('/')[1]}
                    </h2>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-60">
                      {repo.fullName.split('/')[0]}
                    </p>
                  </div>

                  <div className="mt-8 pt-6 border-t flex items-center justify-between">
                    <div className="flex -space-x-2">
                       {[1, 2, 3].map(i => (
                         <div key={`${repo.id}-avatar-${i}`} className="w-6 h-6 rounded-full border-2 border-background bg-zinc-200" />
                       ))}
                       <div className="w-6 h-6 rounded-full border-2 border-background bg-zinc-100 flex items-center justify-center text-[8px] font-bold">+12</div>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-black uppercase tracking-widest text-primary opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1">
                      Explore <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}

            {/* Connect New Repository / Upgrade CTA based on quota */}
            {(() => {
              // If any installation has remaining capacity, allow connect; otherwise show upgrade CTA
              const installCap = userInstallations.map(inst => {
                const limit = planLimits[inst.planName || 'Free'].maxRepos;
                const count = userRepos.filter(r => r.installationId === inst.id).length;
                return count < limit;
              });
              const canConnect = installCap.includes(true);
              if (canConnect) {
                return (
                  <a 
                    href={`https://github.com/apps/review-scope/installations/new`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative border-2 border-dashed border-border rounded-[2rem] p-8 flex flex-col items-center justify-center text-center space-y-4 hover:border-primary/50 hover:bg-primary/5 transition-all min-h-[250px]"
                  >
                    <div className="w-16 h-16 rounded-3xl bg-muted group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center transition-all">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-black text-lg uppercase tracking-tight italic">Connect New <br />Repository</h3>
                      <p className="text-xs text-muted-foreground font-medium max-w-[180px]">Expand your AI coverage by installing the GitHub App.</p>
                    </div>
                  </a>
                );
              }
              return (
                <Link 
                  href="/pricing"
                  className="group relative border-2 border-dashed border-amber-300 rounded-[2rem] p-8 flex flex-col items-center justify-center text-center space-y-4 bg-amber-50/50 hover:bg-amber-100 transition-all min-h-[250px]"
                >
                  <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center transition-all">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-black text-lg uppercase tracking-tight italic text-amber-900">Repository Limit Reached</h3>
                    <p className="text-xs text-amber-800 font-medium max-w-[220px]">Upgrade your plan to add more repositories to ReviewScope.</p>
                  </div>
                </Link>
              );
            })()}
          </div>
        </section>

        {/* Engine Intel Summary */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black uppercase tracking-tighter italic">Engine Intel</h3>
            <Link 
              href="/settings"
              className="text-xs font-bold uppercase tracking-wide text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
            >
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          
          {userInstallations.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {userInstallations
                .filter(inst => inst.status === 'active')
                .map((inst) => {
                  const plan = inst.planName || 'Free';
                  const limits = {
                    'Free': { files: 30, rag: 2, chat: 5, repos: 3, batch: false },
                    'Pro': { files: 100, rag: 5, chat: 20, repos: 5, batch: false },
                    'Team': { files: 'Unlimited', rag: 8, chat: 'Unlimited', repos: 'Unlimited', batch: true }
                  }[plan as 'Free' | 'Pro' | 'Team'];

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
                          <span className="font-bold">{userRepos.filter(r => r.installationId === inst.id).length}/{limits?.repos}</span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <Gauge className="w-3.5 h-3.5 text-primary" />
                            <span className="font-medium">PR Size</span>
                          </div>
                          <span className="font-bold">{limits?.files}</span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5 text-blue-500" />
                            <span className="font-medium">RAG Depth</span>
                          </div>
                          <span className="font-bold">{limits?.rag}</span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                            <span className="font-medium">Chat Iter</span>
                          </div>
                          <span className="font-bold">{limits?.chat}</span>
                        </div>

                        {limits?.batch && (
                          <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg text-xs">
                            <Check className="w-3 h-3 text-primary" />
                            <span className="font-bold text-primary">Batching</span>
                          </div>
                        )}
                      </div>

                      <Link
                        href={`/settings/${inst.id}/config`}
                        className="w-full mt-2 py-2 px-2 text-center text-xs font-bold uppercase tracking-wide bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors"
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

