'use client';

import { useState } from 'react';
import { type ReviewComment } from '@reviewscope/llm-core';

type SeverityFilter = 'all' | 'CRITICAL' | 'MAJOR' | 'MINOR' | 'NIT';

export function FindingsToolbar({ comments }: { comments: ReviewComment[] }) {
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredComments = comments.filter(comment => {
    const matchesSeverity = severityFilter === 'all' || (comment.severity || '').toUpperCase() === severityFilter;
    const matchesSearch = searchQuery === '' || 
      (comment.message || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (comment.why || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  return (
    <div className="flex flex-col gap-3 w-full md:w-auto">
      <div className="flex items-center gap-2 flex-wrap">
        <select 
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as SeverityFilter)}
          className="px-4 py-2 border rounded-xl text-xs font-bold bg-white hover:bg-zinc-50 transition-all cursor-pointer"
        >
          <option value="all">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="MAJOR">Major</option>
          <option value="MINOR">Minor</option>
          <option value="NIT">Nit</option>
        </select>
        <input 
          type="text"
          placeholder="Search findings..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-4 py-2 border rounded-xl text-xs font-bold bg-white hover:bg-zinc-50 transition-all"
        />
      </div>
      <span className="text-[10px] text-muted-foreground font-medium">
        Showing {filteredComments.length} of {comments.length} findings
      </span>
    </div>
  );
}
