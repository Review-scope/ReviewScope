'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Filter } from 'lucide-react';

export function DashboardSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');

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

  return (
    <div className="flex items-center gap-2 w-full md:w-auto">
      <div className="relative flex-1 md:w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter repositories..."
          className="w-full pl-10 pr-4 py-2 bg-card border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
        />
      </div>
      <button className="p-2 border rounded-xl bg-card hover:bg-accent transition-colors cursor-pointer">
        <Filter className="w-4 h-4" />
      </button>
    </div>
  );
}

