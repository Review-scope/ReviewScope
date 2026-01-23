import { db, installations, repositories } from "@/lib/db";
import { Activity, AlertCircle, ArrowRight, Building2, Github, LayoutGrid, LogIn, Settings, Shield, Sparkles, User } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import { eq, and, desc, count, inArray } from "drizzle-orm";
import Link from "next/link";
import { getUserOrgIds } from "@/lib/github";

// Plan limits mapping
const planLimits: { [key: string]: { maxRepos: number } } = {
  'None': { maxRepos: 0 },
  'Free': { maxRepos: 3 },
  'Pro': { maxRepos: 5 },
  'Team': { maxRepos: 999999 }
};

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="bg-zinc-100 p-6 rounded-3xl mb-8">
          <Github className="w-16 h-16 text-zinc-400" />
        </div>
        <h1 className="text-4xl font-black tracking-tight mb-4 uppercase italic">Access Denied</h1>
        <p className="text-xl text-muted-foreground max-w-md mb-10 font-medium">
          Sign in to your account to manage your AI review installations.
        </p>
        <Link 
          href="/signin"
          className="inline-flex items-center gap-3 px-10 py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-primary/20"
        >
          <LogIn className="w-5 h-5" />
          Authorize
        </Link>
      </div>
    );
  }

  // @ts-expect-error session.accessToken exists
  const accessToken = session.accessToken;
  // @ts-expect-error session.user.id
  const githubUserId = parseInt(session.user.id);

  const orgIds = accessToken ? await getUserOrgIds(accessToken) : [];
  const allAccountIds = [githubUserId, ...orgIds];

  const userInstallations = await db
    .select()
    .from(installations)
    .where(
      and(
        inArray(installations.githubAccountId, allAccountIds),
        eq(installations.status, 'active')
      )
    )
    .orderBy(desc(installations.createdAt));

  // Fetch repo counts per installation
  const repoCounts = await Promise.all(
    userInstallations.map(async (inst) => {
      const [result] = await db
        .select({ value: count() })
        .from(repositories)
        .where(and(eq(repositories.installationId, inst.id), eq(repositories.status, 'active')));
      return { id: inst.id, count: result.value };
    })
  );

  const countsMap = Object.fromEntries(repoCounts.map(c => [c.id, c.count]));
  
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-12">
      {/* Premium Header */}
      <header className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="p-4 rounded-3xl bg-primary text-primary-foreground shadow-xl shadow-primary/20">
              <LayoutGrid className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tighter uppercase italic leading-none">Connected Accounts</h1>
              <p className="text-xl text-muted-foreground font-medium mt-2">
                Manage your GitHub installations and configure AI review settings for each workspace.
              </p>
            </div>
          </div>
          <a 
            href="https://github.com/apps/review-scope/installations/new"
            target="_blank"
            className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-all shadow-lg text-sm shrink-0"
          >
            <Github className="w-4 h-4" />
            Add Organization
          </a>
        </div>
      </header>

      <div className="grid gap-8">
        {userInstallations.map((inst) => (
          <div 
            key={inst.id} 
            className="group relative bg-card border-2 border-border/50 rounded-[2.5rem] p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-10 transition-all hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5 shadow-sm overflow-hidden"
          >
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/2 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-primary/5 transition-all"></div>

            <div className="flex items-center gap-8 w-full">
              <div className="relative shrink-0">
                <div className="p-1 bg-linear-to-tr from-primary to-orange-400 rounded-4xl shadow-xl">
                  <div className="w-24 h-24 rounded-[1.8rem] bg-zinc-900 flex items-center justify-center text-white">
                    <Github className="w-10 h-10" />
                  </div>
                </div>
                <div className="absolute -bottom-3 -right-3 p-2.5 bg-white border border-zinc-100 rounded-2xl shadow-2xl group-hover:scale-110 transition-transform">
                  {inst.accountType === 'User' ? (
                    <User className="w-5 h-5 text-blue-500" />
                  ) : (
                    <Building2 className="w-5 h-5 text-purple-500" />
                  )}
                </div>
              </div>
              
              <div className="space-y-3 min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-3xl font-black tracking-tight truncate">{inst.accountName}</h2>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-inner ${
                    inst.accountType === 'User' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-purple-50 text-purple-600 border-purple-100'
                  }`}>
                    {inst.accountType} Account
                  </span>
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-zinc-900 text-white border-none shadow-lg">
                    {inst.planName || 'None'} Tier
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground font-medium">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 opacity-50 text-primary" />
                    <span className="font-bold text-foreground">{countsMap[inst.id] || 0}</span>
                    <span className="opacity-60">/</span>
                    <span className="font-bold opacity-70">{planLimits[inst.planName || 'None'].maxRepos}</span>
                    <span className="opacity-60">Repositories</span>
                    {(countsMap[inst.id] || 0) >= planLimits[inst.planName || 'None'].maxRepos && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 border border-orange-200 rounded-lg ml-2">
                        <AlertCircle className="w-3.5 h-3.5 text-orange-600" />
                        <span className="text-xs font-bold text-orange-700 uppercase tracking-wide">Limit Reached</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <Shield className="w-4 h-4" />
                    <span className="font-bold">Active Engine</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto relative z-10">
              <Link 
                href={`/settings/${inst.id}/config`}
                className="flex-1 md:flex-initial inline-flex items-center justify-center gap-3 px-10 py-5 bg-zinc-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs hover:bg-zinc-800 transition-all active:scale-[0.98] shadow-2xl hover:translate-y-[-2px]"
              >
                <Settings className="w-4 h-4" />
                Configure
              </Link>
              <a 
                href="https://github.com/apps/review-scope/installations/new"
                target="_blank"
                className="p-5 bg-white text-zinc-600 rounded-3xl hover:bg-zinc-50 transition-all border-2 border-zinc-100 hover:border-zinc-200 shadow-xl group-hover:translate-x-1"
              >
                <ArrowRight className="w-6 h-6" />
              </a>
            </div>
          </div>
        ))}

        {userInstallations.length === 0 && (
          <div className="group flex flex-col items-center justify-center py-20 border-4 border-dashed border-zinc-100 rounded-[3rem] bg-zinc-50/30 hover:bg-white hover:border-primary/30 transition-all space-y-6">
            <Sparkles className="w-12 h-12 text-zinc-200" />
            <h3 className="text-xl font-black uppercase italic">No Connections Found</h3>
            <a 
              href="https://github.com/apps/review-scope/installations/new"
              target="_blank"
              className="px-8 py-3 bg-zinc-900 text-white rounded-2xl text-[10px] font-black uppercase"
            >
              Connect GitHub
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
