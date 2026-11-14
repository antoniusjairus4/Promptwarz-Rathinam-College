import React, { useState } from 'react';
import { Search, Briefcase, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import type { LiveJobListing } from '@/types';

export const LiveJobExplorerPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const listings: LiveJobListing[] = [];

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E5E5E5] dark:border-[#222222] pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-[#7C3AED] dark:text-[#8B5CF6]">
              Market Intelligence
            </span>
            <Badge variant="outline" className="text-xs">
              Live Index
            </Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#171717] dark:text-[#FAFAFA]">
            Live Job Explorer
          </h1>
          <p className="text-base text-[#737373] dark:text-[#A3A3A3] max-w-2xl leading-relaxed">
            Real market demand scraped and matched against your verified skills. Never populated with synthetic or fabricated listings.
          </p>
        </div>
      </div>

      {/* Dense Filter / Search Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-[#8C8C8C] dark:text-[#666666]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter verified postings by role title, technology, or company..."
            className="w-full h-11 rounded-md border border-[#E5E5E5] dark:border-[#262626] bg-white dark:bg-[#0A0A0A] pl-11 pr-4 text-sm text-[#171717] dark:text-[#FAFAFA] placeholder-[#8C8C8C] dark:placeholder-[#555555] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]/50 transition-colors"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button size="md" variant="secondary" className="gap-2 h-11 px-4 text-xs font-medium">
            <Filter className="h-4 w-4" />
            <span>Filter</span>
          </Button>
        </div>
      </div>

      {/* Dense Listings Viewport */}
      {listings.length === 0 ? (
        <div className="rounded-xl border border-[#E5E5E5] dark:border-[#222222] bg-white dark:bg-[#0A0A0A] p-8 shadow-xs">
          <EmptyState
            icon={Briefcase}
            title="No Live Jobs Loaded"
            description="Maximus indexes real market feeds through the backend job aggregator service (/api/v1/jobs/search). Zero simulated jobs are displayed."
          >
            <div className="mt-4 flex items-center gap-2 text-xs font-mono text-[#8C8C8C] dark:text-[#555555]">
              <span>Awaiting backend query GET /api/v1/jobs/search</span>
            </div>
          </EmptyState>
        </div>
      ) : (
        <div className="rounded-xl border border-[#E5E5E5] dark:border-[#222222] bg-white dark:bg-[#0A0A0A] divide-y divide-[#E5E5E5] dark:divide-[#222222]">
          {/* Dense rows */}
        </div>
      )}
    </div>
  );
};
