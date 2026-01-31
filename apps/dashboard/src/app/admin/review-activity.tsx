'use client';

import { CheckCircle, XCircle, Clock, Activity, AlertTriangle } from 'lucide-react';

interface ReviewStats {
  reviewsToday: number;
  reviewsWeek: number;
  failedReviews: number;
  pendingReviews: number;
  completedReviews: number;
}

interface RecentReview {
  id: string;
  repositoryId: string;
  prNumber: number;
  status: string;
  error: string | null;
  createdAt: Date;
  processedAt: Date | null;
  repoName: string;
}

export function ReviewActivity({ 
  stats, 
  recentReviews 
}: { 
  stats: ReviewStats; 
  recentReviews: RecentReview[];
}) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'processing': return <Activity className="w-4 h-4 text-blue-500 animate-pulse" />;
      default: return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getAverageReviewTime = () => {
    const completed = recentReviews.filter(r => r.status === 'completed' && r.processedAt);
    if (completed.length === 0) return '—';
    
    const totalMs = completed.reduce((sum, r) => {
      const duration = new Date(r.processedAt!).getTime() - new Date(r.createdAt).getTime();
      return sum + duration;
    }, 0);
    
    const avgMs = totalMs / completed.length;
    if (avgMs < 1000) return `${Math.round(avgMs)}ms`;
    if (avgMs < 60000) return `${Math.round(avgMs / 1000)}s`;
    return `${Math.round(avgMs / 60000)}min`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Stats */}
      <div className="border rounded-xl p-6 bg-card space-y-4">
        <h3 className="font-medium text-muted-foreground">Metrics</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-green-500">{stats.reviewsToday}</div>
            <div className="text-xs text-muted-foreground">Reviews Today</div>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-blue-500">{stats.reviewsWeek}</div>
            <div className="text-xs text-muted-foreground">Reviews This Week</div>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-red-500">{stats.failedReviews}</div>
            <div className="text-xs text-muted-foreground">Failed Reviews</div>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-yellow-500">{stats.pendingReviews}</div>
            <div className="text-xs text-muted-foreground">Queue Depth</div>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 col-span-2">
            <div className="text-2xl font-bold">{getAverageReviewTime()}</div>
            <div className="text-xs text-muted-foreground">Avg Review Time</div>
          </div>
        </div>
        
        {/* Health Indicators */}
        <div className="pt-4 border-t space-y-2">
          <h4 className="text-sm font-medium">Health Status</h4>
          <div className="flex flex-wrap gap-2">
            <HealthBadge 
              label="Queue" 
              healthy={stats.pendingReviews < 10} 
              warning={stats.pendingReviews >= 5}
            />
            <HealthBadge 
              label="Failures" 
              healthy={stats.failedReviews < 5} 
              warning={stats.failedReviews >= 2}
            />
          </div>
        </div>
      </div>

      {/* Recent Reviews */}
      <div className="border rounded-xl p-6 bg-card">
        <h3 className="font-medium text-muted-foreground mb-4">Recent Reviews</h3>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {recentReviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reviews yet</p>
          ) : (
            recentReviews.map((review) => (
              <a 
                key={review.id} 
                href={`https://github.com/${review.repoName}/pull/${review.prNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(review.status)}
                  <div>
                    <div className="text-sm font-mono group-hover:text-primary transition-colors">{review.repoName}</div>
                    <div className="text-xs text-muted-foreground">PR #{review.prNumber}</div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(review.createdAt).toLocaleTimeString()}
                </div>
              </a>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function HealthBadge({ label, healthy, warning }: { label: string; healthy: boolean; warning?: boolean }) {
  const color = healthy 
    ? 'bg-green-500/10 text-green-500' 
    : warning 
      ? 'bg-yellow-500/10 text-yellow-500'
      : 'bg-red-500/10 text-red-500';
  
  return (
    <span className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 ${color}`}>
      {healthy ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
      {label}
    </span>
  );
}
