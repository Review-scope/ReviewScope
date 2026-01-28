'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Filter, Check, ChevronDown, Building2, User } from 'lucide-react';
import { clsx } from 'clsx';

interface Installation {
  id: string;
  accountName: string;
  accountType?: string; // Optional if not always available
}

interface DashboardSearchProps {
  installations?: Installation[];
}

export function DashboardSearch({ installations = [] }: DashboardSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const currentAccount = searchParams.get('account');

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      const currentQ = searchParams.get('q') || '';
      if (currentQ === searchTerm) return;

      const params = new URLSearchParams(searchParams.toString());
      if (searchTerm) {
        params.set('q', searchTerm);
      } else {
        params.delete('q');
      }
      router.replace(`?${params.toString()}`);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm, router, searchParams]);

  const handleAccountSelect = (installationId: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (installationId) {
      params.set('account', installationId);
    } else {
      params.delete('account');
    }
    router.replace(`?${params.toString()}`);
    setIsFilterOpen(false);
  };

  return (
    <div className="flex items-center gap-2 w-full md:w-auto">
      <div className="relative flex-1 md:w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter repositories..."
          className="w-full pl-10 pr-4 py-2.5 bg-white/50 backdrop-blur-sm border border-zinc-200/60 rounded-xl text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:ring-2 focus:ring-primary/10 focus:border-primary/20 outline-none transition-all shadow-sm hover:bg-white/80"
        />
      </div>
      
      <div className="relative" ref={filterRef}>
        <button 
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={clsx(
            "flex items-center gap-2 px-3 py-2.5 border rounded-xl backdrop-blur-sm transition-all shadow-sm cursor-pointer",
            isFilterOpen || currentAccount
              ? "bg-white border-zinc-300 text-zinc-900 ring-2 ring-primary/5" 
              : "bg-white/50 border-zinc-200/60 text-zinc-500 hover:text-zinc-900 hover:bg-white hover:border-zinc-300"
          )}
        >
          <Filter className="w-4 h-4" />
          {currentAccount && (
            <span className="text-xs font-bold max-w-[100px] truncate hidden sm:inline-block">
              {installations.find(i => i.id === currentAccount)?.accountName || 'Filtered'}
            </span>
          )}
          <ChevronDown className={clsx("w-3 h-3 transition-transform", isFilterOpen && "rotate-180")} />
        </button>

        {isFilterOpen && (
          <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl border border-zinc-200 shadow-xl shadow-zinc-200/50 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-2 py-1.5 mb-1">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Filter by Account</span>
            </div>
            
            <button
              onClick={() => handleAccountSelect(null)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-zinc-400" />
                <span>All Accounts</span>
              </div>
              {!currentAccount && <Check className="w-3.5 h-3.5 text-primary" />}
            </button>

            <div className="my-1 border-t border-zinc-100" />

            <div className="max-h-64 overflow-y-auto space-y-0.5">
              {installations.map((inst) => (
                <button
                  key={inst.id}
                  onClick={() => handleAccountSelect(inst.id)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <User className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                    <span className="truncate">{inst.accountName}</span>
                  </div>
                  {currentAccount === inst.id && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

