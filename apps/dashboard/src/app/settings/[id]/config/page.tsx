import { db, configs, installations, apiUsageLogs } from "@/lib/db";
import { eq, and, gt, sql } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Settings2, ShieldCheck, Zap, Sparkles } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import Link from "next/link";
import { ConfigForm } from "./config-form";
import { getUserOrgIds } from "@/lib/github";
import { getPlanLimits } from "../../../../../../worker/src/lib/plans";
import clsx from "clsx";

export default async function ConfigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user) redirect('/signin');

  // @ts-expect-error session.accessToken exists
  const accessToken = session.accessToken;
  // @ts-expect-error session.user.id
  const githubUserId = parseInt(session.user.id);

  const orgIds = accessToken ? await getUserOrgIds(accessToken) : [];
  const allAccountIds = [githubUserId, ...orgIds];

  const [installation] = await db
    .select()
    .from(installations)
    .where(eq(installations.id, id))
    .limit(1);

  if (!installation || !allAccountIds.includes(installation.githubAccountId || 0)) notFound();

  const [config] = await db
    .select()
    .from(configs)
    .where(eq(configs.installationId, id))
    .limit(1);

  const plan = installation.planName || 'None';
  const limits = getPlanLimits(installation.planId, installation.expiresAt);

  // Get monthly usage
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [usage] = await db
    .select({ count: sql<number>`count(*)` })
    .from(apiUsageLogs)
    .where(and(
      eq(apiUsageLogs.installationId, id),
      eq(apiUsageLogs.apiService, 'review-run'),
      gt(apiUsageLogs.createdAt, thirtyDaysAgo)
    ));
  const usageCount = usage?.count || 0;

  return (
    <div className="p-4 md:p-10 max-w-5xl mx-auto pb-24">
      {/* Header */}
      <header className="mb-12">
        <Link 
          href="/settings" 
          className="group inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-zinc-900 transition-colors mb-6 cursor-pointer"
        >
          <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center group-hover:bg-zinc-200 transition-colors">
            <ChevronLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
          </div>
          Back to Accounts
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center text-white shadow-xl shadow-zinc-900/10">
              <Settings2 className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-zinc-900">Configuration</h1>
              <p className="text-lg text-zinc-500 font-medium mt-1">
                Review parameters for <span className="text-zinc-900 font-bold">@{installation.accountName}</span>
              </p>
            </div>
          </div>
          
          {(plan === 'Free' || plan === 'None') && (
            <Link 
              href={`/pricing?accountId=${installation.githubAccountId}`}
              className={clsx(
                "inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm uppercase tracking-wide transition-all shadow-sm cursor-pointer",
                plan === 'None' 
                  ? "bg-red-600 text-white hover:bg-red-700 hover:shadow-red-600/20" 
                  : "bg-zinc-900 text-white hover:bg-zinc-800 hover:shadow-zinc-900/20"
              )}
            >
              <Zap className="w-4 h-4" />
              {plan === 'None' ? 'Subscribe Now' : 'Upgrade Plan'}
            </Link>
          )}
        </div>
      </header>

      <div className="space-y-8">
        {/* Plan Status Card */}
        <div className={clsx(
          "relative overflow-hidden p-6 rounded-3xl border transition-all",
          plan === 'None' 
            ? "bg-red-50/50 border-red-100" 
            : "bg-white border-zinc-200 shadow-sm"
        )}>
          <div className="flex items-start gap-5">
            <div className={clsx(
              "p-3 rounded-xl shrink-0",
              plan === 'None' ? "bg-red-100 text-red-600" : "bg-blue-50 text-blue-600"
            )}>
              {plan === 'None' ? <ShieldCheck className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h3 className={clsx(
                  "font-bold text-base",
                  plan === 'None' ? "text-red-900" : "text-zinc-900"
                )}>
                  {plan === 'None' ? 'Subscription Required' : 'Active Plan'}
                </h3>
                {plan !== 'None' && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-blue-100 text-blue-700 border border-blue-200">
                    {plan}
                  </span>
                )}
              </div>
              
              {plan === 'None' ? (
                 <p className="text-sm text-red-700 font-medium">
                   You must subscribe to a plan (even Free) to enable AI reviews.
                 </p>
              ) : (
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-zinc-600 mt-2">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-300"></span>
                    RAG snippets: <span className="font-bold text-zinc-900">{limits.ragK}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-300"></span>
                    Cooldown: <span className="font-bold text-zinc-900">{limits.cooldownMinutes}m</span>
                  </div>
                  {limits.monthlyReviewsLimit < Infinity && (
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-300"></span>
                      Monthly Reviews: 
                      <span className={clsx(
                        "font-bold",
                        usageCount >= limits.monthlyReviewsLimit ? "text-red-600" : "text-zinc-900"
                      )}>
                        {usageCount}/{limits.monthlyReviewsLimit}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Configuration Form */}
        <ConfigForm 
          key={JSON.stringify(config)}
          installationId={id}
          plan={plan}
          initialConfig={config ? {
            provider: config.provider,
            model: config.model,
            customPrompt: config.customPrompt,
            apiKeyEncrypted: config.apiKeyEncrypted,
            smartRouting: config.smartRouting,
          } : undefined} 
        />

        {/* Security Footer */}
        <div className="mt-12 p-8 rounded-3xl bg-zinc-900 text-zinc-400 flex flex-col md:flex-row items-center gap-6 shadow-xl shadow-zinc-900/10">
          <div className="p-4 rounded-2xl bg-zinc-800/50 text-emerald-400 shrink-0">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-1 text-center md:text-left">
            <h4 className="text-lg font-bold text-zinc-100">Enterprise-Grade Security</h4>
            <p className="text-sm font-medium leading-relaxed max-w-2xl">
              All API keys are encrypted with AES-256-GCM before storage. 
              We utilize zero-knowledge architecture where possible and never log your raw secrets or code snippets.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
