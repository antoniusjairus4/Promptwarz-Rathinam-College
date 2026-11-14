import React, { useState, useEffect } from 'react';
import {
  Search,
  Briefcase,
  ExternalLink,
  MapPin,
  Building,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Calendar,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { api, ApiClientError } from '@/services/api';
import { useLearner } from '@/context/LearnerContext';
import type { JobListing, ProviderStatus } from '@/types';

export const LiveJobExplorerPage: React.FC = () => {
  const { learner } = useLearner();

  const [searchQuery, setSearchQuery] = useState(
    learner?.target_role?.toLowerCase().includes('python')
      ? 'python'
      : learner?.target_role || 'python'
  );
  const [providerChoice, setProviderChoice] = useState<'both' | 'himalayas' | 'remotive'>('both');
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchJobs = async (query: string, provider: 'both' | 'himalayas' | 'remotive') => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.searchJobs(query.trim(), provider, 20, learner?.id);
      setJobs(res.jobs || []);
      setProviders(res.providers || []);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to search jobs.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs(searchQuery, providerChoice);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchJobs(searchQuery, providerChoice);
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E5E7EB] dark:border-[#222222] pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-[#7C3AED] dark:text-[#8B5CF6]">
              Market Intelligence
            </span>
            <Badge variant="outline" className="text-xs">
              Live External Index
            </Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#111827] dark:text-[#FAFAFA]">
            Live Job Explorer
          </h1>
          <p className="text-base text-[#6B7280] dark:text-[#A3A3A3] max-w-2xl leading-relaxed">
            Real engineering positions aggregated directly from public Remotive and Himalayas feeds. Zero synthetic or simulated listings.
          </p>
        </div>
      </div>

      {/* Filter / Search Toolbar */}
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-[#9CA3AF] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search verified positions (e.g. Python, Fullstack, Backend)..."
            className="w-full h-11 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-[#0A0A0A] pl-11 pr-4 text-sm text-[#111827] dark:text-[#FAFAFA] placeholder-[#9CA3AF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]/50"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={providerChoice}
            onChange={(e) => setProviderChoice(e.target.value as 'both' | 'himalayas' | 'remotive')}
            className="h-11 px-3.5 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-[#0A0A0A] text-xs font-mono text-[#111827] dark:text-[#FAFAFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]/50 cursor-pointer"
          >
            <option value="both">All Feeds (Both)</option>
            <option value="remotive">Remotive Only</option>
            <option value="himalayas">Himalayas Only</option>
          </select>

          <Button
            type="submit"
            size="md"
            variant="primary"
            disabled={isLoading}
            className="h-11 px-6 text-xs font-medium cursor-pointer shadow-xs"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Search Jobs</span>}
          </Button>
        </div>
      </form>

      {/* Provider Status Indicators */}
      {providers.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-[#6B7280] dark:text-[#888888]">
          {providers.map((p) => (
            <div
              key={p.provider}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#080808]"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  p.status === 'ok'
                    ? 'bg-emerald-500'
                    : p.status === 'rate_limited'
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                }`}
              />
              <span className="font-semibold capitalize text-[#111827] dark:text-[#FAFAFA]">
                {p.provider}
              </span>
              <span className="font-mono text-[11px] text-[#9CA3AF] dark:text-[#666666]">
                ({p.status})
              </span>
              {p.cached && <span className="text-[10px] text-[#7C3AED] dark:text-[#8B5CF6]">• cached</span>}
              {p.detail && <span className="text-[10px] text-[#9CA3AF] max-w-xs truncate">• {p.detail}</span>}
            </div>
          ))}
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-xs sm:text-sm text-red-600 dark:text-red-400 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold">Job Search Notice</span>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="py-16 text-center space-y-4">
          <Loader2 className="h-8 w-8 text-[#7C3AED] dark:text-[#8B5CF6] animate-spin mx-auto" />
          <p className="text-xs text-[#6B7280] dark:text-[#888888]">
            Querying live job feeds from Remotive and Himalayas...
          </p>
        </div>
      )}

      {/* Job Listings List */}
      {!isLoading && jobs.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-[#6B7280] dark:text-[#888888]">
            <span>Showing {jobs.length} verified listings</span>
            <span className="font-mono">Aggregated from public APIs</span>
          </div>

          <div className="rounded-xl border border-[#E5E7EB] dark:border-[#222222] bg-white dark:bg-[#0A0A0A] divide-y divide-[#E5E7EB] dark:divide-[#222222] overflow-hidden shadow-xs">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="p-5 sm:p-6 transition-colors hover:bg-[#FAFAFA] dark:hover:bg-[#0D0D0D] flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                <div className="space-y-2.5 max-w-3xl">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-base sm:text-lg font-semibold text-[#111827] dark:text-[#FAFAFA]">
                      {job.title}
                    </h3>
                    {job.employment_type && (
                      <Badge variant="outline" className="text-[11px] capitalize">
                        {job.employment_type}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-[#6B7280] dark:text-[#888888] flex-wrap">
                    <span className="flex items-center gap-1.5 font-medium text-[#111827] dark:text-[#FAFAFA]">
                      <Building className="h-3.5 w-3.5 text-[#9CA3AF]" />
                      {job.company}
                    </span>

                    {job.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-[#9CA3AF]" />
                        {job.location}
                      </span>
                    )}

                    {job.published_at && (
                      <span className="flex items-center gap-1 text-[11px]">
                        <Calendar className="h-3 w-3 text-[#9CA3AF]" />
                        {new Date(job.published_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {job.summary && (
                    <p className="text-xs sm:text-sm text-[#4B5563] dark:text-[#A3A3A3] line-clamp-2 leading-relaxed">
                      {job.summary}
                    </p>
                  )}

                  {/* Tags */}
                  {job.tags && job.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {job.tags.slice(0, 8).map((t, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#F3F4F6] dark:bg-[#1A1A1A] text-[#4B5563] dark:text-[#A3A3A3]"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Source Attributions */}
                  {job.sources && job.sources.length > 0 && (
                    <div className="flex items-center gap-3 pt-1 text-[11px] text-[#9CA3AF] dark:text-[#666666]">
                      <span>Source:</span>
                      {job.sources.map((src, idx) => (
                        <a
                          key={idx}
                          href={src.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="underline hover:text-[#111827] dark:hover:text-[#FAFAFA] capitalize"
                        >
                          {src.source}
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Apply Action */}
                <div className="shrink-0 flex sm:flex-col items-end gap-2">
                  <a
                    href={job.application_url}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full sm:w-auto"
                  >
                    <Button
                      variant="primary"
                      size="md"
                      className="w-full sm:w-auto gap-2 text-xs font-medium cursor-pointer shadow-xs"
                    >
                      <span>Apply Listing</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && jobs.length === 0 && !errorMessage && (
        <div className="rounded-xl border border-[#E5E7EB] dark:border-[#222222] bg-white dark:bg-[#0A0A0A] p-12 text-center space-y-4 shadow-xs">
          <Briefcase className="h-10 w-10 text-[#9CA3AF] dark:text-[#555555] mx-auto" />
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-semibold text-[#111827] dark:text-[#FAFAFA]">
              No Live Listings Found for "{searchQuery}"
            </h3>
            <p className="text-xs text-[#6B7280] dark:text-[#A3A3A3]">
              External APIs return active listings based on keywords. Try searching for common roles like "Python", "Full Stack", or "DevOps".
            </p>
          </div>
          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              setSearchQuery('python');
              fetchJobs('python', providerChoice);
            }}
            className="cursor-pointer"
          >
            Search "Python"
          </Button>
        </div>
      )}

      {/* Terms & Attribution Guarantee Notice */}
      <div className="rounded-xl border border-[#E5E7EB] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#080808] p-4 text-xs text-[#6B7280] dark:text-[#888888] flex items-start gap-3">
        <ShieldCheck className="h-4 w-4 text-[#7C3AED] dark:text-[#8B5CF6] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-[#111827] dark:text-[#FAFAFA] block">
            Third-Party Feed Compliance:
          </span>
          <p className="leading-relaxed">
            All positions are served directly through the Maximus backend proxy from Himalayas and Remotive public APIs. Original application links and provider attribution are strictly preserved. No provider endorsement is implied.
          </p>
        </div>
      </div>
    </div>
  );
};
