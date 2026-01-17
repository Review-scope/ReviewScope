import { db, configs, installations } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { notFound, redirect } from 'next/navigation';
import { ChevronLeft, Settings2, ShieldCheck, Zap, Sparkles } from 'lucide-react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Link from 'next/link';
import { ConfigForm } from './config-form';

export default async function ConfigPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user) redirect('/signin');

  // @ts-expect-error session.user.id
  const githubUserId = parseInt(session.user.id);

  const [installation] = await db
    .select()
    .from(installations)
    .where(eq(installations.id, id))
    .limit(1);

  if (!installation || installation.githubAccountId !== githubUserId) notFound();

  const [config] = await db
    .select()
    .from(configs)
    .where(eq(configs.installationId, id))
    .limit(1);

  const plan = installation.planName || 'Free';
  const limits = {
    'Free': { files: 30, rag: 2, chat: 5, repos: 3, batch: false },
    'Pro': { files: 100, rag: 5, chat: 20, repos: 5, batch: false },
    'Team': { files: 'Unlimited', rag: 8, chat: 'Unlimited', repos: 'Unlimited', batch: true }
  }[plan as 'Free' | 'Pro' | 'Team'];

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
          <div className="p-6 mb-8 rounded-2xl bg-blue-50 border-2 border-blue-200 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg mt-0.5">
                <Sparkles className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-blue-900">Your {plan} Plan Includes:</h3>
                <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                  PR file limit: <span className="font-bold">{limits?.files}</span> • 
                  RAG snippets: <span className="font-bold">{limits?.rag}</span> • 
                  Chat iterations: <span className="font-bold">{limits?.chat}</span> • 
                  Repositories: <span className="font-bold">{limits?.repos}</span>
                </p>
              </div>
            </div>
            {plan === 'Free' && (
              <Link 
                href="/pricing"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs uppercase tracking-wide transition-colors w-fit"
              >
                <Zap className="w-3.5 h-3.5" />
                Upgrade for More Capacity
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
