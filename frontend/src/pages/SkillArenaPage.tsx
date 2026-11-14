import React, { useState } from 'react';
import { Terminal, Play, CheckCircle, Code, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';

export const SkillArenaPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'problem' | 'tests' | 'provenance'>('problem');
  const [activeChallenge] = useState<null | {
    id: string;
    title: string;
    category: string;
    difficulty: string;
    timeLimitMinutes: number;
    prompt: string;
  }>(null);

  return (
    <div className="space-y-4">
      {/* Workspace Top Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5E5] dark:border-[#222222] pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded border border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#111111] text-[#171717] dark:text-[#FAFAFA]">
            <Terminal className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-[#171717] dark:text-[#FAFAFA]">
                Skill Arena
              </h1>
              <Badge variant="outline" className="text-[10px]">
                Sandboxed Runner
              </Badge>
            </div>
            <p className="text-[11px] text-[#8C8C8C] dark:text-[#666666] font-mono">
              Distraction-free proof-of-work assessment workspace
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" disabled className="gap-1 text-xs">
            <Play className="h-3 w-3" />
            <span>Run Tests</span>
          </Button>
          <Button size="sm" variant="primary" disabled className="gap-1 text-xs">
            <CheckCircle className="h-3 w-3" />
            <span>Submit Verification</span>
          </Button>
        </div>
      </div>

      {/* Main Workspace Layout (2 columns: Brief & Editor) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-170px)] min-h-[500px]">
        {/* Left Column: Challenge Brief & Constraints (5 cols) */}
        <div className="lg:col-span-5 flex flex-col rounded-lg border border-[#E5E5E5] dark:border-[#222222] bg-white dark:bg-[#0A0A0A] overflow-hidden">
          {/* Tabs */}
          <div className="flex items-center border-b border-[#E5E5E5] dark:border-[#222222] px-3 bg-[#FAFAFA] dark:bg-[#050505] text-xs font-mono">
            <button
              onClick={() => setActiveTab('problem')}
              className={`py-2 px-3 border-b-2 font-medium transition-colors ${
                activeTab === 'problem'
                  ? 'border-[#7C3AED] dark:border-[#8B5CF6] text-[#171717] dark:text-[#FAFAFA]'
                  : 'border-transparent text-[#8C8C8C] dark:text-[#666666] hover:text-[#171717] dark:hover:text-[#FAFAFA]'
              }`}
            >
              Specification
            </button>
            <button
              onClick={() => setActiveTab('tests')}
              className={`py-2 px-3 border-b-2 font-medium transition-colors ${
                activeTab === 'tests'
                  ? 'border-[#7C3AED] dark:border-[#8B5CF6] text-[#171717] dark:text-[#FAFAFA]'
                  : 'border-transparent text-[#8C8C8C] dark:text-[#666666] hover:text-[#171717] dark:hover:text-[#FAFAFA]'
              }`}
            >
              Test Cases
            </button>
            <button
              onClick={() => setActiveTab('provenance')}
              className={`py-2 px-3 border-b-2 font-medium transition-colors ${
                activeTab === 'provenance'
                  ? 'border-[#7C3AED] dark:border-[#8B5CF6] text-[#171717] dark:text-[#FAFAFA]'
                  : 'border-transparent text-[#8C8C8C] dark:text-[#666666] hover:text-[#171717] dark:hover:text-[#FAFAFA]'
              }`}
            >
              Verification Proof
            </button>
          </div>

          {/* Tab Content Viewport */}
          <div className="flex-1 p-5 overflow-y-auto">
            {activeChallenge ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold">{activeChallenge.title}</h3>
                  <Badge variant="accent">{activeChallenge.difficulty}</Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-[#8C8C8C] dark:text-[#666666] font-mono">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {activeChallenge.timeLimitMinutes} min
                  </span>
                  <span>Category: {activeChallenge.category}</span>
                </div>
                <div className="text-xs leading-relaxed text-[#666666] dark:text-[#A3A3A3]">
                  {activeChallenge.prompt}
                </div>
              </div>
            ) : (
              <EmptyState
                icon={Code}
                title="No Assessment Challenge Active"
                description="Challenge briefs stream securely from the backend assessment orchestrator. No local answer keys or mock questions exist."
                className="h-full border-none bg-transparent justify-center"
              />
            )}
          </div>
        </div>

        {/* Right Column: Code Editor & Execution Console (7 cols) */}
        <div className="lg:col-span-7 flex flex-col rounded-lg border border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#070707] overflow-hidden">
          {/* Editor Header Bar */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#E5E5E5] dark:border-[#222222] bg-white dark:bg-[#050505] text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-[#171717] dark:text-[#FAFAFA] font-medium">solution.ts</span>
            </div>
            <span className="text-[11px] text-[#8C8C8C] dark:text-[#555555]">
              Monaco Editor Engine
            </span>
          </div>

          {/* Monaco Editor Container Viewport */}
          <div className="flex-1 p-4 bg-white dark:bg-[#0A0A0A] font-mono text-xs text-[#666666] dark:text-[#A3A3A3] overflow-auto">
            <div className="p-4 rounded border border-[#E5E5E5] dark:border-[#1E1E1E] bg-[#FAFAFA] dark:bg-[#0D0D0D] space-y-1">
              <p className="text-[#8C8C8C] dark:text-[#555555]">// Maximus Proof-of-Work Code Arena</p>
              <p className="text-[#8C8C8C] dark:text-[#555555]">// Evaluated strictly against sandbox unit and performance test suites.</p>
              <p className="pt-2 text-[#7C3AED] dark:text-[#8B5CF6]">export async function evaluateProof(input: unknown): Promise&lt;boolean&gt; &#123;</p>
              <p className="pl-4 text-[#171717] dark:text-[#FAFAFA]">// Awaiting challenge load from backend orchestrator</p>
              <p className="pl-4 text-[#171717] dark:text-[#FAFAFA]">return true;</p>
              <p className="text-[#7C3AED] dark:text-[#8B5CF6]">&#125;</p>
            </div>
          </div>

          {/* Console / Output Drawer */}
          <div className="h-32 border-t border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#050505] p-3 font-mono text-[11px] text-[#8C8C8C] dark:text-[#666666] flex flex-col justify-between">
            <div className="flex items-center justify-between pb-1 border-b border-[#E5E5E5] dark:border-[#1A1A1A]">
              <span>Execution Output</span>
              <span>0 test cases passed</span>
            </div>
            <div className="flex-1 pt-1 overflow-y-auto">
              <span>Ready for test execution.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
