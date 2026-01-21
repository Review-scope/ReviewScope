import { db, repositories, reviews, installations, configs } from "@/lib/db";
import { eq, desc, and, isNotNull, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../../api/auth/[...nextauth]/authOptions";
import { ChevronLeft, GitPullRequest, CheckCircle2, XCircle, Clock, ExternalLink, Hash, Calendar, ArrowRight, Key } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import { getUserOrgIds } from "@/lib/github";

import { ActivationToggle } from './activation-toggle';

export const dynamic = 'force-dynamic';

export default async function RepositoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user) return notFound();

  // @ts-expect-error session.accessToken exists
  const accessToken = session.accessToken;
  // @ts-expect-error session.user.id
  const githubUserId = parseInt(session.user.id);

  const orgIds = accessToken ? await getUserOrgIds(accessToken) : [];
  const allAccountIds = [githubUserId, ...orgIds];

  const repo = await db.query.repositories.findFirst({
    where: and(
      eq(repositories.id, id),
      eq(repositories.status, 'active')
    ),
    with: { installation: true },
  });

  
  if (!repo || !allAccountIds.includes(repo.installation.githubAccountId || 0) || repo.installation.status !== 'active') return notFound();

  const [config] = await db
    .select({ hasApiKey: isNotNull(configs.apiKeyEncrypted) })
    .from(configs)
    .where(eq(configs.installationId, repo.installationId))
    .limit(1);

  const repoReviews = await db
    .select()
    .from(reviews)
    .where(eq(reviews.repositoryId, id))
    .orderBy(desc(reviews.createdAt));

  return (
    <div className="p-4 md:p-8 max-7xl mx-auto space-y-8">
      <header className="space-y-4">
        <Link 
          href="/" 
          className="group inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Repositories
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
               <GitPullRequest className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight">{repo.fullName.split('/')[1]}</h1>
              <p className="text-muted-foreground font-medium flex items-center gap-2">
                {repo.fullName.split('/')[0]} <span className="text-border">/</span> <span className="text-primary/70">{repoReviews.length} Reviews Total</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ActivationToggle repoId={repo.id} isActive={repo.isActive} />
            <a 
              href={`https://github.com/${repo.fullName}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold border-2 hover:bg-accent transition-all shadow-sm"
            >
              Open GitHub <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      {!config?.hasApiKey && (
        <div className="bg-orange-50 border-2 border-orange-100 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="flex items-center gap-4 text-orange-600 font-bold">
            <div className="p-3 bg-orange-100 rounded-2xl border border-orange-200">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-orange-900 text-lg">AI Reviewing Disabled</h3>
              <p className="text-orange-700 font-medium">You haven&apos;t configured an API key for this installation. We cannot perform automated reviews.</p>
            </div>
          </div>
          <Link 
            href={`/settings/${repo.installationId}/config`}
            className="whitespace-nowrap px-6 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-all shadow-lg"
          >
            Fix Configuration
          </Link>
        </div>
      )}

      <div className="bg-card border-2 rounded-3xl overflow-hidden shadow-xl shadow-zinc-200/50 dark:shadow-none border-border/60">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className="p-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Pull Request</th>
                <th className="p-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Status</th>
                <th className="p-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Created</th>
                <th className="p-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] text-right">Feedback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {repoReviews.map((review) => (
                <tr key={review.id} className="group hover:bg-accent/30 transition-colors">
                  <td className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center font-bold text-sm text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                        <Hash className="w-4 h-4 opacity-50" /> {review.prNumber}
                      </div>
                      <div>
                        <span className="font-bold text-base block group-hover:text-primary transition-colors">#{review.prNumber}</span>
                        <span className="text-xs text-muted-foreground">Pull Request</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <StatusBadge status={review.status} />
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                      <Calendar className="w-4 h-4 opacity-50" />
                      {new Date(review.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </td>
                  <td className="p-6 text-right">
                    <Link 
                      href={`/reviews/${review.id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-primary/5 text-primary hover:bg-primary hover:text-primary-foreground transition-all group-hover:shadow-md"
                    >
                      View Report <ArrowRight className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
              {repoReviews.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-20 text-center">
                    <div className="max-w-xs mx-auto space-y-2">
                       <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-4 opacity-20" />
                       <h4 className="font-bold text-lg">No reviews yet</h4>
                       <p className="text-sm text-muted-foreground">ReviewScope will automatically post feedback when a new PR is opened or updated.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: any, label: string, color: string }> = {
    completed: { icon: CheckCircle2, label: 'Completed', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
    failed: { icon: XCircle, label: 'Failed', color: 'bg-destructive/10 text-destructive border-destructive/20' },
    processing: { icon: Clock, label: 'Processing', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20 animate-pulse' },
    pending: { icon: Clock, label: 'Pending', color: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20' }
  };

  const { icon: Icon, label, color } = config[status] || config.pending;

  return (
    <span className={clsx("inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider", color)}>
      <Icon className="w-3.5 h-3.5" /> {label}
    </span>
  );
}
