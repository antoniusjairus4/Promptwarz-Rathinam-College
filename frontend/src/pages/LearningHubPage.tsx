import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  ExternalLink,
  Search,
  Video,
  FileText,
  GraduationCap,
  Loader2,
  Calendar,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api, ApiClientError } from '@/services/api';
import { useLearner } from '@/context/LearnerContext';
import type { LearningResource, ProviderStatus } from '@/types';

export const LearningHubPage: React.FC = () => {
  const { learner } = useLearner();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [includeYoutube, setIncludeYoutube] = useState(true);
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchResources = async (searchQuery: string, withYoutube: boolean) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.getLearningResources(searchQuery.trim(), withYoutube, learner?.id);
      setResources(res.resources || []);
      setProviders(res.providers || []);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to fetch learning resources.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResources(initialQuery, includeYoutube);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams(query ? { q: query } : {});
    fetchResources(query, includeYoutube);
  };

  const getKindIcon = (kind: string) => {
    switch (kind) {
      case 'video':
        return <Video className="h-4 w-4 text-red-500" />;
      case 'documentation':
        return <FileText className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />;
      case 'course':
      default:
        return <GraduationCap className="h-4 w-4 text-[#7C3AED] dark:text-[#8B5CF6]" />;
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E5E7EB] dark:border-[#222222] pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-[#7C3AED] dark:text-[#8B5CF6]">
              Curriculum & Reference
            </span>
            <Badge variant="outline" className="text-xs">
              Curated Catalog
            </Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#111827] dark:text-[#FAFAFA]">
            Learning Hub
          </h1>
          <p className="text-base text-[#6B7280] dark:text-[#A3A3A3] max-w-2xl leading-relaxed">
            Targeted official documentation, accredited open-courseware (MIT OCW, freeCodeCamp, MDN), and YouTube technical benchmarks.
          </p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="h-4 w-4 absolute left-3.5 top-3.5 text-[#9CA3AF] pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search topics (e.g. Python, Algorithms, Web Design)..."
            className="w-full h-11 pl-10 pr-4 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-[#0A0A0A] text-sm text-[#111827] dark:text-[#FAFAFA] placeholder-[#9CA3AF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]/50"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="flex items-center gap-2 text-xs text-[#6B7280] dark:text-[#888888] cursor-pointer select-none px-2">
            <input
              type="checkbox"
              checked={includeYoutube}
              onChange={(e) => setIncludeYoutube(e.target.checked)}
              className="rounded border-[#D1D5DB] dark:border-[#333333] text-[#7C3AED] focus:ring-[#8B5CF6]"
            />
            <span className="flex items-center gap-1 font-medium">
              <Video className="h-3.5 w-3.5 text-red-500" />
              Include YouTube
            </span>
          </label>

          <Button type="submit" variant="primary" size="md" disabled={isLoading} className="h-11 px-6 cursor-pointer shadow-xs">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Search</span>}
          </Button>
        </div>
      </form>

      {/* Provider Status Banners if applicable */}
      {providers.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-[#6B7280] dark:text-[#888888]">
          {providers.map((p) => (
            <div
              key={p.provider}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#0A0A0A]"
            >
              <span className={`h-2 w-2 rounded-full ${p.status === 'ok' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="capitalize font-mono font-medium text-[#111827] dark:text-[#FAFAFA]">{p.provider}: {p.status}</span>
              {p.cached && <span className="text-[10px] text-[#7C3AED] dark:text-[#8B5CF6]">• cached</span>}
            </div>
          ))}
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-xs sm:text-sm text-red-600 dark:text-red-400 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold">Unable to Load Resources</span>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="py-16 text-center space-y-4">
          <Loader2 className="h-8 w-8 text-[#7C3AED] dark:text-[#8B5CF6] animate-spin mx-auto" />
          <p className="text-xs text-[#6B7280] dark:text-[#888888]">Fetching official curriculum and video benchmarks...</p>
        </div>
      )}

      {/* Resource Cards Grid */}
      {!isLoading && resources.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((item) => (
            <Card key={item.id} className="hover:border-[#D1D5DB] dark:hover:border-[#333333] transition-colors p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-[#6B7280] dark:text-[#888888]">
                    {getKindIcon(item.kind)}
                    <span className="capitalize">{item.kind}</span>
                  </div>
                  <Badge variant="outline" className="text-[11px]">
                    {item.provider}
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-base font-semibold text-[#111827] dark:text-[#FAFAFA] line-clamp-2 leading-snug">
                    {item.title}
                  </h3>
                  {item.channel && (
                    <p className="text-xs text-[#6B7280] dark:text-[#888888] font-medium">
                      Channel: {item.channel}
                    </p>
                  )}
                </div>

                {item.topics && item.topics.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {item.topics.map((t, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#F3F4F6] dark:bg-[#1A1A1A] text-[#4B5563] dark:text-[#A3A3A3]"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#222222] flex items-center justify-between text-xs">
                {item.reviewed_on ? (
                  <span className="flex items-center gap-1 text-[#9CA3AF] dark:text-[#666666] text-[11px]">
                    <Calendar className="h-3 w-3" />
                    Audited {item.reviewed_on}
                  </span>
                ) : (
                  <span className="text-[#9CA3AF] dark:text-[#666666] text-[11px]">
                    {item.provenance === 'youtube_api' ? 'YouTube Search API' : 'Official Catalog'}
                  </span>
                )}

                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-[#7C3AED] dark:text-[#8B5CF6] hover:underline inline-flex items-center gap-1"
                >
                  <span>Open Resource</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && resources.length === 0 && !errorMessage && (
        <Card className="p-8 text-center space-y-4">
          <BookOpen className="h-10 w-10 text-[#9CA3AF] dark:text-[#555555] mx-auto" />
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-semibold text-[#111827] dark:text-[#FAFAFA]">
              No Resources Found for "{query}"
            </h3>
            <p className="text-xs text-[#6B7280] dark:text-[#A3A3A3]">
              Try searching for general programming terms such as "Python", "Web", or clear the query to view the entire curated baseline catalog.
            </p>
          </div>
          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              setQuery('');
              fetchResources('', includeYoutube);
            }}
            className="cursor-pointer"
          >
            Reset Query
          </Button>
        </Card>
      )}

      {/* Catalog Guarantee Notice */}
      <div className="rounded-xl border border-[#E5E7EB] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#080808] p-4 text-xs text-[#6B7280] dark:text-[#888888] flex items-start gap-3">
        <ShieldCheck className="h-4 w-4 text-[#7C3AED] dark:text-[#8B5CF6] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-[#111827] dark:text-[#FAFAFA] block">
            Accredited Catalog Integrity:
          </span>
          <p className="leading-relaxed">
            Resources link to original open platforms (MIT OpenCourseWare, freeCodeCamp, MDN Web Docs, and verified YouTube technical tutorials). Maximus does not resell content or award synthetic micro-credentials.
          </p>
        </div>
      </div>
    </div>
  );
};
