import { db, configs, installations, repositories } from "@/lib/db";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Settings2, ShieldCheck, Zap, Sparkles } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import Link from "next/link";
import { ConfigForm } from "./config-form";
import { RepoList } from "./repo-list";
import { getUserOrgIds } from "@/lib/github";
import { getPlanLimits } from "../../../../../../worker/src/lib/plans";

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

  const installationRepos = await db
    .select({
      id: repositories.id,
      fullName: repositories.fullName,
      status: repositories.status,
      isActive: repositories.isActive
    })
    .from(repositories)
    .where(eq(repositories.installationId, id));

  const plan = installation.planName || 'None';
  const limits = getPlanLimits(installation.planId, installation.expiresAt);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-12">
      {/* Form */}
      <div className="space-y-12">
        <header className="space-y-6">
          <Link 
            href="/settings" 
            className="group inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Accounts
          </Link>
          <div className="flex items-center gap-6">
            <div className="p-4 rounded-3xl bg-primary text-primary-foreground shadow-xl shadow-primary/20">
              <Settings2 className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tighter uppercase italic leading-none">Configuration</h1>
              <p className="text-xl text-muted-foreground font-medium mt-2">
                Review parameters for <span className="text-foreground font-bold italic">@{installation.accountName}</span>
              </p>
            </div>
          </div>
        </header>

        <div className="relative">
          <div className="absolute -left-4 top-0 bottom-0 w-1 bg-linear-to-b from-primary to-transparent rounded-full opacity-20"></div>
          
          {/* Plan Limits Info Banner */}
          <div className={`p-6 mb-8 rounded-2xl border-2 flex flex-col gap-4 ${
            plan === 'None' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg mt-0.5 ${
                plan === 'None' ? 'bg-red-100' : 'bg-blue-100'
              }`}>
                {plan === 'None' ? (
                  <ShieldCheck className="w-5 h-5 text-red-600" />
                ) : (
                  <Sparkles className="w-5 h-5 text-blue-600" />
                )}
              </div>
              <div>
                <h3 className={`font-bold text-sm ${
                  plan === 'None' ? 'text-red-900' : 'text-blue-900'
                }`}>
                  {plan === 'None' ? 'Subscription Required' : `Your ${plan} Plan Includes:`}
                </h3>
                {plan === 'None' ? (
                   <p className="text-xs text-red-700 mt-1 leading-relaxed">
                     You must subscribe to a plan (even Free) to enable AI reviews.
                   </p>
                ) : (
                  <div className="flex flex-col gap-1">
                    <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                      PR file limit: <span className="font-bold">{limits.maxFiles >= 999999 ? 'Unlimited' : limits.maxFiles}</span> • 
                      RAG snippets: <span className="font-bold">{limits.ragK}</span> • 
                      Chat: <span className="font-bold">{limits.chatPerPRLimit === 'unlimited' ? 'Unlimited' : limits.chatPerPRLimit}</span>
                    </p>
                    <p className="text-xs text-blue-700 leading-relaxed">
                      Daily Reviews: <span className="font-bold">{limits.dailyReviewsLimit}</span> • 
                      Reviews/PR: <span className="font-bold">{limits.reviewsPerPR}</span> • 
                      Cooldown: <span className="font-bold">{limits.cooldownMinutes}m</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
            {(plan === 'Free' || plan === 'None') && (
              <Link 
                href={`/pricing?accountId=${installation.githubAccountId}`}
                className={`inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg font-bold text-xs uppercase tracking-wide transition-colors w-fit ${
                  plan === 'None' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                {plan === 'None' ? 'Subscribe Now' : 'Upgrade for More Capacity'}
              </Link>
            )}
          </div>
          
          <ConfigForm 
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

          <RepoList 
            installationId={id} 
            repos={installationRepos.map(r => ({
              id: r.id,
              fullName: r.fullName,
              status: r.status,
              isActive: r.isActive
            }))} 
          />
        </div>

        <div className="p-8 rounded-4xl bg-zinc-900 text-zinc-100 flex flex-col md:flex-row items-center gap-6 shadow-2xl">
          <div className="p-4 rounded-2xl bg-zinc-800 text-primary">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-1 text-center md:text-left">
            <h4 className="text-lg font-bold">Enterprise-Grade Security</h4>
            <p className="text-sm text-zinc-400 font-medium">
              All API keys are encrypted with AES-256-GCM before being stored in our database. 
              We never log or expose your raw secrets.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
