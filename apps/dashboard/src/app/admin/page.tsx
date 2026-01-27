import { db, installations, repositories, reviews, configs, marketplaceEvents } from "@/lib/db";
import { getServerSession } from "next-auth";
import { Suspense } from "react";
import { authOptions } from "../api/auth/[...nextauth]/authOptions";
import { redirect } from "next/navigation";
import { count, desc, sql, eq, gte, and, isNotNull, ilike, or, inArray } from "drizzle-orm";
import { 
  Shield, 
  Users, 
  GitBranch, 
  MessageSquare, 
  Key, 
  Activity,
  Database,
  Settings,
  AlertOctagon,
  Server
} from 'lucide-react';
import Link from 'next/link';

import { AdminView } from './admin-view';
import { ReviewActivity } from './review-activity';
import { SafetyControls } from './safety-controls';
import { SystemInfo } from './system-info';
import { getGlobalSettings, getSystemConfigStatus } from './actions';
import { getPlanLimits } from '../../../../worker/src/lib/plans';

export const dynamic = 'force-dynamic';

// Add your GitHub user ID here to restrict admin access
const ADMIN_GITHUB_IDS = [
  '134628559', // paras-verma7454
];
const ITEMS_PER_PAGE = 10;

export default async function AdminPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;
  
  // @ts-expect-error session.user.id
  const userId = session?.user?.id;
  
  if (!session?.user || !ADMIN_GITHUB_IDS.includes(userId)) {
    redirect('/');
  }

  const query = params.q || '';
  const page = Number(params.page) || 1;
  const offset = (page - 1) * ITEMS_PER_PAGE;

  // Date calculations
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const whereClause = query ? or(
    ilike(installations.accountName, `%${query}%`),
    !isNaN(Number(query)) ? eq(installations.githubInstallationId, Number(query)) : undefined,
    sql`${installations.id} IN (
      SELECT installation_id FROM repositories 
      WHERE full_name ILIKE ${`%${query}%`}
    )`
  ) : undefined;

  const repoWhereClause = query ? ilike(repositories.fullName, `%${query}%`) : undefined;

  // Fetch comprehensive stats
  const [
    installationsCount,
    repositoriesCount,
    reviewsCount,
    configsCount,
    paginatedInstallations,
    allRepositories,
    recentReviewsData,
    reviewsToday,
    reviewsWeek,
    failedReviewsData,
    pendingReviewsData,
    completedReviewsData,
    totalItemsData,
    systemConfig,
    globalSettings
  ] = await Promise.all([
    db.select({ count: count() }).from(installations),
    db.select({ count: count() }).from(repositories),
    db.select({ count: count() }).from(reviews),
    db.select({ count: count() }).from(configs),
    
    // Paginated installations with repositories
    db.query.installations.findMany({
      where: whereClause,
      limit: ITEMS_PER_PAGE,
      offset: offset,
      orderBy: [desc(installations.createdAt)],
      with: {
        repositories: {
          where: repoWhereClause,
          orderBy: [desc(repositories.indexedAt)],
        },
      },
    }),
    
    // Stats repos
    db.select({
      id: repositories.id,
      installationId: repositories.installationId,
      githubRepoId: repositories.githubRepoId,
      fullName: repositories.fullName,
      isPrivate: repositories.isPrivate,
      indexedAt: repositories.indexedAt,
      createdAt: repositories.createdAt,
    }).from(repositories).orderBy(desc(repositories.createdAt)).limit(50),
    
    // Recent reviews
    db.select({
      id: reviews.id,
      repositoryId: reviews.repositoryId,
      prNumber: reviews.prNumber,
      status: reviews.status,
      error: reviews.error,
      createdAt: reviews.createdAt,
      processedAt: reviews.processedAt,
    }).from(reviews).orderBy(desc(reviews.createdAt)).limit(20),
    
    // Stats reviews
    db.select({ count: count() }).from(reviews).where(gte(reviews.createdAt, todayStart)),
    db.select({ count: count() }).from(reviews).where(gte(reviews.createdAt, weekStart)),
    db.select({ count: count() }).from(reviews).where(eq(reviews.status, 'failed')),
    db.select({ count: count() }).from(reviews).where(eq(reviews.status, 'pending')),
    db.select({ count: count() }).from(reviews).where(eq(reviews.status, 'completed')),

    // Pagination count
    db.select({ value: count() })
      .from(installations)
      .where(whereClause),

    // Statuses
    getSystemConfigStatus(),
    getGlobalSettings()
  ]);

  const totalItems = totalItemsData[0]?.value || 0;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);


  // Get config info for PAGINATED installations only
  const installationIds = paginatedInstallations.map(i => i.id);
  
  // Only fetch configs if we have installations
  let configMap = new Map();
  
  if (installationIds.length > 0) {
    const relevantConfigs = await db.select({
        installationId: configs.installationId,
        provider: configs.provider,
        apiKey: configs.apiKeyEncrypted,
    }).from(configs).where(sql`${configs.installationId} IN ${installationIds}`);
    
    configMap = new Map(relevantConfigs.map(c => [c.installationId, c]));
  }

  // Transform for AdminView
  const transformedData = paginatedInstallations.map(inst => {
    const limits = getPlanLimits(inst.planId, inst.expiresAt);
    const config = configMap.get(inst.id);
    
    return {
      id: inst.id,
      githubInstallationId: inst.githubInstallationId,
      accountName: inst.accountName,
      accountType: inst.accountType,
      planName: inst.planName,
      planLimits: {
        tier: limits.tier,
      },
      swapCount: inst.swapCount,
      lastSwapReset: inst.lastSwapReset,
      status: inst.status,
      createdAt: inst.createdAt,
      hasApiKey: !!config?.apiKey,
      provider: config?.provider || null,
      repositories: inst.repositories.map(repo => ({
        id: repo.id,
        fullName: repo.fullName,
        isPrivate: !!repo.isPrivate, // ensure boolean
        status: repo.status || 'active', // default if missing
        isActive: repo.isActive,
        indexedAt: repo.indexedAt,
        lastReviewAt: null // repo.lastReviewAt is not in schema/query unless we fetch it. AdminView handles null.
      }))
    };
  });


  // Transform reviews for activity component
  // Fetch repo names for the reviews to ensure we have them all (recentReviews might be for older repos not in allRepositories)
  const reviewRepoIds = Array.from(new Set(recentReviewsData.map(r => r.repositoryId)));
  
  let reviewRepos: { id: string; fullName: string }[] = [];
  if (reviewRepoIds.length > 0) {
    reviewRepos = await db.select({
      id: repositories.id,
      fullName: repositories.fullName
    }).from(repositories).where(inArray(repositories.id, reviewRepoIds));
  }

  const repoMap = new Map([
    ...allRepositories.map(r => [r.id, r.fullName] as [string, string]),
    ...reviewRepos.map(r => [r.id, r.fullName] as [string, string])
  ]);

  const recentReviewsForActivity = recentReviewsData.map(r => ({
    id: r.id,
    repositoryId: r.repositoryId,
    prNumber: r.prNumber,
    status: r.status,
    error: r.error,
    createdAt: r.createdAt,
    processedAt: r.processedAt,
    repoName: repoMap.get(r.repositoryId) || 'Unknown',
  }));

  const reviewStats = {
    reviewsToday: reviewsToday[0]?.count || 0,
    reviewsWeek: reviewsWeek[0]?.count || 0,
    failedReviews: failedReviewsData[0]?.count || 0,
    pendingReviews: pendingReviewsData[0]?.count || 0,
    completedReviews: completedReviewsData[0]?.count || 0,
  };

  const stats = [
    { 
      label: 'Installations', 
      value: installationsCount[0]?.count || 0, 
      icon: Users,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10'
    },
    { 
      label: 'Repositories', 
      value: repositoriesCount[0]?.count || 0, 
      icon: GitBranch,
      color: 'text-green-500',
      bg: 'bg-green-500/10'
    },
    { 
      label: 'Total Reviews', 
      value: reviewsCount[0]?.count || 0, 
      icon: MessageSquare,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10'
    },
    { 
      label: 'API Keys Set', 
      value: configsCount[0]?.count || 0, 
      icon: Key,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10'
    },
  ];

  // Error logs (failed reviews)
  const errorLogs = recentReviewsData.filter(r => r.status === 'failed' && r.error);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">System overview, monitoring & controls</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link 
            href="/users"
            className="px-4 py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-all flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="border rounded-xl p-5 bg-card">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1">{stat.value}</div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Installations and Repositories Management */}
      <section>
        <Suspense fallback={
          <div className="h-96 flex items-center justify-center border rounded-xl bg-muted/10">
            <Activity className="w-8 h-8 text-primary animate-spin" />
          </div>
        }>
          <AdminView 
            data={transformedData as any}
            page={page}
            totalPages={totalPages}
          />
        </Suspense>
      </section>

      {/* Review Activity */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Review Activity
        </h2>
        <ReviewActivity stats={reviewStats} recentReviews={recentReviewsForActivity} />
      </section>

      {/* Error Logs */}
      {errorLogs.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-red-500" />
            Error Logs ({errorLogs.length})
          </h2>
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="p-3 font-medium">Time</th>
                  <th className="p-3 font-medium">Repository</th>
                  <th className="p-3 font-medium">PR</th>
                  <th className="p-3 font-medium">Error</th>
                </tr>
              </thead>
              <tbody>
                {errorLogs.map((log) => (
                  <tr key={log.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3 font-mono text-xs">
                      {repoMap.get(log.repositoryId) || 'Unknown'}
                    </td>
                    <td className="p-3">#{log.prNumber}</td>
                    <td className="p-3 text-red-500 font-mono text-xs max-w-md truncate">
                      {log.error}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Safety Controls */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <AlertOctagon className="w-5 h-5 text-yellow-500" />
          Safety Controls
        </h2>
        <SafetyControls initialSettings={globalSettings} />
      </section>

      {/* System Info */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Server className="w-5 h-5 text-primary" />
          System Information
        </h2>
        <SystemInfo config={systemConfig} />
      </section>

      {/* Quick Actions */}
      <div className="border rounded-xl p-6 bg-card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" />
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link 
            href="/users"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-all"
          >
            Manage Settings
          </Link>
          <Link 
            href="/support"
            className="px-4 py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-all"
          >
            View Support Page
          </Link>
          <a 
            href="https://github.com/Review-scope/ReviewScope"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-all"
          >
            GitHub Repository
          </a>
        </div>
      </div>
    </div>
  );
}
