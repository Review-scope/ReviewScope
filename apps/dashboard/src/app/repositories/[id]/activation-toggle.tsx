'use client';

import { useState, useTransition } from 'react';
import { toggleRepoActivation } from '@/lib/actions/repoActions';
import { Loader2, Power } from 'lucide-react';
import { clsx } from 'clsx';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface ActivationToggleProps {
  repoId: string;
  isActive: boolean;
}

export function ActivationToggle({ repoId, isActive: initialIsActive }: ActivationToggleProps) {
  const [isActive, setIsActive] = useState(initialIsActive);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleToggle = () => {
    const newState = !isActive;
    
    startTransition(async () => {
      // Optimistic update
      setIsActive(newState);
      
      const result = await toggleRepoActivation(repoId, newState);
      
      if (!result.success) {
        // Revert on failure
        setIsActive(!newState);
        toast.error(result.error || 'Failed to update status');
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleToggle}
        disabled={isPending}
        className={clsx(
          "relative inline-flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-lg active:scale-95 disabled:opacity-70 disabled:pointer-events-none cursor-pointer",
          isActive 
            ? "bg-green-500 text-white hover:bg-green-600 shadow-green-500/20" 
            : "bg-zinc-200 text-zinc-500 hover:bg-zinc-300 shadow-zinc-500/10"
        )}
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
        {isActive ? 'Active' : 'Inactive'}
      </button>
    </div>
  );
}
