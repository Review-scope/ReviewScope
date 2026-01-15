'use client';

import { useState } from 'react';
import { AlertTriangle, Power, Pause, Play, Shield } from 'lucide-react';
import { toggleGlobalReviews, toggleGlobalIndexing } from './actions';
import { toast } from 'sonner';

export function SafetyControls() {
  const [reviewsEnabled, setReviewsEnabled] = useState(true);
  const [indexingEnabled, setIndexingEnabled] = useState(true);
  const [confirming, setConfirming] = useState<string | null>(null);

  const handleToggleReviews = async () => {
    if (confirming !== 'reviews') {
      setConfirming('reviews');
      setTimeout(() => setConfirming(null), 3000);
      return;
    }
    const result = await toggleGlobalReviews(!reviewsEnabled);
    if (result.success) {
      setReviewsEnabled(!reviewsEnabled);
      toast.success(`PR Reviews ${!reviewsEnabled ? 'enabled' : 'disabled'} globally`);
    } else {
      toast.error(result.error || 'Failed to update setting');
    }
    setConfirming(null);
  };

  const handleToggleIndexing = async () => {
    if (confirming !== 'indexing') {
      setConfirming('indexing');
      setTimeout(() => setConfirming(null), 3000);
      return;
    }
    const result = await toggleGlobalIndexing(!indexingEnabled);
    if (result.success) {
      setIndexingEnabled(!indexingEnabled);
      toast.success(`Repository Indexing ${!indexingEnabled ? 'enabled' : 'disabled'} globally`);
    } else {
      toast.error(result.error || 'Failed to update setting');
    }
    setConfirming(null);
  };

  return (
    <div className="border rounded-xl p-6 bg-card">
      <div className="flex items-start gap-3 mb-6 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
        <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
        <div className="text-sm">
          <strong className="text-yellow-500">Warning:</strong> These controls affect all users. 
          Use only in emergencies or during maintenance.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Global Reviews Toggle */}
        <div className="p-4 rounded-xl border bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <span className="font-medium">PR Reviews</span>
            </div>
            <span className={`px-2 py-1 text-xs rounded-full ${reviewsEnabled ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
              {reviewsEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Disable to stop all AI reviews globally. Webhooks will still be received but reviews will be skipped.
          </p>
          <button
            onClick={handleToggleReviews}
            className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              confirming === 'reviews'
                ? 'bg-red-500 text-white'
                : reviewsEnabled
                  ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                  : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
            }`}
          >
            {confirming === 'reviews' ? (
              <>
                <AlertTriangle className="w-4 h-4" />
                Click again to confirm
              </>
            ) : reviewsEnabled ? (
              <>
                <Pause className="w-4 h-4" />
                Disable Reviews
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Enable Reviews
              </>
            )}
          </button>
        </div>

        {/* Global Indexing Toggle */}
        <div className="p-4 rounded-xl border bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Power className="w-5 h-5 text-primary" />
              <span className="font-medium">Repository Indexing</span>
            </div>
            <span className={`px-2 py-1 text-xs rounded-full ${indexingEnabled ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
              {indexingEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Disable to stop all RAG indexing. New repos won't be indexed until re-enabled.
          </p>
          <button
            onClick={handleToggleIndexing}
            className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              confirming === 'indexing'
                ? 'bg-red-500 text-white'
                : indexingEnabled
                  ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                  : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
            }`}
          >
            {confirming === 'indexing' ? (
              <>
                <AlertTriangle className="w-4 h-4" />
                Click again to confirm
              </>
            ) : indexingEnabled ? (
              <>
                <Pause className="w-4 h-4" />
                Disable Indexing
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Enable Indexing
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
