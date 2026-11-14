import React from 'react';
import { NavLink } from 'react-router-dom';
import { Compass, GitFork, ArrowRight, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';

export const CareerNavigatorPage: React.FC = () => {
  return (
    <div className="space-y-4">
      {/* Top Header & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5E5] dark:border-[#222222] pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-[#171717] dark:text-[#FAFAFA]">
              Career Navigator
            </h1>
            <Badge variant="outline">Interactive Graph</Badge>
          </div>
          <p className="text-[11px] text-[#8C8C8C] dark:text-[#666666] font-mono">
            Directed acyclic graph of milestones, dependencies, and target competencies
          </p>
        </div>

        {/* Canvas Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded border border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#0A0A0A]">
            <button
              title="Zoom In"
              aria-label="Zoom in"
              className="p-1.5 text-[#666666] dark:text-[#A3A3A3] hover:text-[#171717] dark:hover:text-[#FAFAFA]"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              title="Zoom Out"
              aria-label="Zoom out"
              className="p-1.5 text-[#666666] dark:text-[#A3A3A3] hover:text-[#171717] dark:hover:text-[#FAFAFA] border-l border-[#E5E5E5] dark:border-[#222222]"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              title="Fit to Screen"
              aria-label="Fit to screen"
              className="p-1.5 text-[#666666] dark:text-[#A3A3A3] hover:text-[#171717] dark:hover:text-[#FAFAFA] border-l border-[#E5E5E5] dark:border-[#222222]"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <NavLink to="/onboarding">
            <Button size="sm" variant="secondary" className="text-xs gap-1">
              <span>Change Target</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </NavLink>
        </div>
      </div>

      {/* Spacious Interactive Graph Canvas */}
      <div className="relative rounded-lg border border-[#E5E5E5] dark:border-[#222222] bg-white dark:bg-[#050505] min-h-[550px] flex flex-col justify-center items-center overflow-hidden">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[radial-gradient(#E5E5E5_1px,transparent_1px)] dark:bg-[radial-gradient(#1A1A1A_1px,transparent_1px)] [background-size:20px_20px] opacity-70 pointer-events-none" />

        {/* Empty / Readiness State */}
        <div className="relative z-10 max-w-md p-6">
          <EmptyState
            icon={Compass}
            title="Roadmap Graph Uncalibrated"
            description="The Career Navigator graph is generated from your target role and Skill DNA gap analysis. Powered by @xyflow/react."
            actionLabel="Configure Career in Onboarding"
            onAction={() => {}}
            className="border-none bg-transparent shadow-none"
          />

          <div className="mt-4 flex items-center justify-center gap-2 text-xs font-mono text-[#8C8C8C] dark:text-[#555555]">
            <GitFork className="h-3.5 w-3.5 text-[#7C3AED] dark:text-[#8B5CF6]" />
            <span>Awaiting backend endpoint GET /api/career/roadmap</span>
          </div>
        </div>
      </div>
    </div>
  );
};
