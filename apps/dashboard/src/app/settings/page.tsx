import { db, installations, repositories } from "@/lib/db";
import { Activity, ArrowRight, Building2, Github, LayoutGrid, LogIn, Settings, Shield, Sparkles, User } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import { eq, and, desc, count, inArray } from "drizzle-orm";
import Link from "next/link";
import { getUserOrgIds } from "@/lib/github";
import { getPlanLimits } from "../../../../worker/src/lib/plans";
import clsx from "clsx";

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="bg-zinc-50 p-8 rounded-3xl mb-8 border border-zinc-100 shadow-sm">
          <Github className="w-16 h-16 text-zinc-300" />
        </div>
        <h1 className="text-3xl font-black tracking-tight mb-4 text-zinc-900">Access Denied</h1>
        <p className="text-zinc-500 max-w-md mb-10 font-medium">
          Sign in to your account to manage your AI review installations.
        </p>
        <Link 
          href="/signin"
          className="inline-flex items-center gap-3 px-8 py-3 bg-zinc-900 text-white rounded-xl font-bold text-sm uppercase tracking-wide hover:bg-zinc-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
        >
          <LogIn className="w-4 h-4" />
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
    <div className="p-6 md:p-12 max-w-6xl mx-auto space-y-12">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-100 pb-8">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-100 text-zinc-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-zinc-200">
            <Settings className="w-3 h-3" />
            Workspace Settings
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight text-zinc-900">Connected Accounts</h1>
            <p className="text-lg text-zinc-500 font-medium mt-2 max-w-2xl">
              Manage your GitHub installations and configure AI review settings for each workspace.
            </p>
          </div>
        </div>
        <a 
          href="/docs"
          target="_blank"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-zinc-200 text-zinc-700 rounded-xl font-bold text-sm hover:bg-zinc-50 hover:border-zinc-300 transition-all"
        >
          <Github className="w-4 h-4" />
          Documentation
        </a>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        {userInstallations.map((inst) => (
          <div 
            key={inst.id} 
            className="group relative bg-white border border-zinc-200 rounded-3xl p-8 flex flex-col gap-8 transition-all hover:border-zinc-300 hover:shadow-xl hover:shadow-zinc-200/50"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center text-white shadow-lg shadow-zinc-900/10">
                  <Github className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-zinc-900 tracking-tight truncate max-w-[200px]">{inst.accountName}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={clsx(
                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border",
                      inst.accountType === 'User' 
                        ? "bg-blue-50 text-blue-600 border-blue-100" 
                        : "bg-purple-50 text-purple-600 border-purple-100"
                    )}>
                      {inst.accountType}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-zinc-100 text-zinc-600 border border-zinc-200">
                      {inst.planName || 'Free'} Plan
                    </span>
                  </div>
                </div>
              </div>
              
              <Link 
                href={`/settings/${inst.id}/config`}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-400 hover:text-zinc-900 hover:bg-white hover:border-zinc-300 transition-all"
              >
                <ArrowRight className="w-5 h-5 -rotate-45 group-hover:rotate-0 transition-transform duration-300" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100/50">
                <div className="flex items-center gap-2 text-zinc-400 mb-1">
                  <Activity className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Repos</span>
                </div>
                <span className="text-2xl font-black text-zinc-900">{countsMap[inst.id] || 0}</span>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100/50">
                <div className="flex items-center gap-2 text-zinc-400 mb-1">
                  <Shield className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Status</span>
                </div>
                <span className="text-sm font-bold text-emerald-600 flex items-center gap-1.5 mt-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              </div>
            </div>

            <Link 
              href={`/settings/${inst.id}/config`}
              className="mt-auto w-full py-4 bg-zinc-900 text-white rounded-xl font-bold text-sm uppercase tracking-wide hover:bg-zinc-800 transition-all text-center shadow-lg shadow-zinc-900/10 hover:shadow-xl hover:shadow-zinc-900/20 hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
            >
              Configure Settings
            </Link>
          </div>
        ))}

        {userInstallations.length === 0 && (
          <div className="col-span-full py-24 text-center border-2 border-dashed border-zinc-200 rounded-[3rem] bg-zinc-50/50">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-zinc-100">
              <Sparkles className="w-10 h-10 text-zinc-300" />
            </div>
            <h3 className="text-2xl font-black text-zinc-900 mb-2">No Connections Found</h3>
            <p className="text-zinc-500 max-w-sm mx-auto mb-8">
              Install the ReviewScope GitHub App to see your organizations here.
            </p>
            <a 
              href="https://github.com/Review-scope/ReviewScope"
              target="_blank"
              className="inline-flex items-center gap-2 px-8 py-4 bg-zinc-900 text-white rounded-2xl font-bold text-sm uppercase tracking-wide hover:bg-zinc-800 transition-all shadow-xl hover:-translate-y-1"
            >
              <Github className="w-4 h-4" />
              Install App
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
