'use client';

import { useRouter } from 'next/navigation';
import { Github, CheckCircle2, Clock, Lock, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface RepoRowProps {
  repo: {
    id: string;
    fullName: string;
    indexedAt: Date | null;
    lastReviewAt: Date | null;
  };
  limits: {
    allowRAG: boolean;
  };
}

export function RepoRow({ repo, limits }: RepoRowProps) {
  const router = useRouter();

  const handleRowClick = () => {
    router.push(`/repositories/${repo.id}`);
  };

  return (
    <tr 
      onClick={handleRowClick}
      className="group hover:bg-zinc-50/50 transition-colors cursor-pointer"
    >
      <td className="px-3 sm:px-6 py-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-600 border border-zinc-200/50 group-hover:scale-105 transition-transform shrink-0">
            <Github className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <span className="block font-bold text-zinc-900 group-hover:text-primary transition-colors text-sm truncate">
              {repo.fullName.split('/')[1]}
            </span>
            <span className="text-xs font-medium text-zinc-400 truncate block">
              {repo.fullName.split('/')[0]}
            </span>
          </div>
        </div>
      </td>
      <td className="px-3 sm:px-6 py-4">
        {(() => {
          if (!limits.allowRAG) {
            return (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-500 border border-zinc-200 text-[10px] font-bold uppercase tracking-wider">
                <Lock className="w-3 h-3" /> Basic
              </div>
            );
          }
          return repo.indexedAt ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-50 text-green-700 border border-green-200/50 text-[10px] font-bold uppercase tracking-wider">
              <CheckCircle2 className="w-3 h-3" /> Indexed
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200/50 text-[10px] font-bold uppercase tracking-wider animate-pulse">
              <Clock className="w-3 h-3" /> Indexing
            </div>
          );
        })()}
      </td>
      <td className="px-6 py-4 hidden md:table-cell">
        {repo.lastReviewAt ? (
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-600">
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            {formatDistanceToNow(new Date(repo.lastReviewAt), { addSuffix: true })}
          </div>
        ) : (
          <span className="text-xs text-zinc-400 italic">No reviews yet</span>
        )}
      </td>
    </tr>
  );
}
