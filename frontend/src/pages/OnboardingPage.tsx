import React, { useState } from 'react';
import { Compass, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const OnboardingPage: React.FC = () => {
  const [selectedTrack, setSelectedTrack] = useState<'career' | 'skills' | null>(null);
  const [careerInput, setCareerInput] = useState('');
  const [skillsInput, setSkillsInput] = useState('');

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-8">
      {/* Editorial Header */}
      <div className="space-y-2">
        <span className="font-mono text-xs uppercase tracking-widest text-[#8C8C8C] dark:text-[#666666]">
          Step 1 • Target Calibration
        </span>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#171717] dark:text-[#FAFAFA]">
          Define Your Learning Trajectory
        </h1>
        <p className="text-sm text-[#666666] dark:text-[#A3A3A3] leading-relaxed max-w-xl">
          Maximus builds dynamic, verified skill graphs tailored either to an aspirational target role or your current technical capabilities.
        </p>
      </div>

      {/* Dual Pathway Choices */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Choice A: Explore a Career */}
        <div
          onClick={() => setSelectedTrack('career')}
          className={`cursor-pointer rounded-lg border p-5 transition-all duration-150 space-y-3 ${
            selectedTrack === 'career'
              ? 'border-[#7C3AED] dark:border-[#8B5CF6] bg-[#FAFAFA] dark:bg-[#111111]'
              : 'border-[#E5E5E5] dark:border-[#222222] bg-white dark:bg-[#0A0A0A] hover:border-[#D4D4D4] dark:hover:border-[#333333]'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded border border-[#E5E5E5] dark:border-[#222222] bg-[#F7F7F7] dark:bg-[#161616] text-[#171717] dark:text-[#FAFAFA]">
              <Compass className="h-4 w-4" />
            </div>
            {selectedTrack === 'career' && (
              <CheckCircle2 className="h-4 w-4 text-[#7C3AED] dark:text-[#8B5CF6]" />
            )}
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#171717] dark:text-[#FAFAFA]">
              Career-First Trajectory
            </h2>
            <p className="text-xs text-[#666666] dark:text-[#A3A3A3] mt-1 leading-relaxed">
              Target an aspirational role. The agentic system decomposes it into required competencies, prerequisites, and milestone challenges.
            </p>
          </div>

          {selectedTrack === 'career' && (
            <div className="pt-3 border-t border-[#E5E5E5] dark:border-[#222222] space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-[#8C8C8C] dark:text-[#666666] block">
                Target Role (Any Technical Career)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={careerInput}
                  onChange={(e) => setCareerInput(e.target.value)}
                  placeholder="e.g. Distributed Systems Engineer"
                  className="flex-1 rounded-md border border-[#E5E5E5] dark:border-[#222222] bg-white dark:bg-[#050505] px-3 py-1.5 text-xs text-[#171717] dark:text-[#FAFAFA] placeholder-[#8C8C8C] dark:placeholder-[#555555] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#8B5CF6]"
                />
                <Button size="sm" variant="primary" disabled={!careerInput.trim()}>
                  Save <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Choice B: Discover My Skills */}
        <div
          onClick={() => setSelectedTrack('skills')}
          className={`cursor-pointer rounded-lg border p-5 transition-all duration-150 space-y-3 ${
            selectedTrack === 'skills'
              ? 'border-[#7C3AED] dark:border-[#8B5CF6] bg-[#FAFAFA] dark:bg-[#111111]'
              : 'border-[#E5E5E5] dark:border-[#222222] bg-white dark:bg-[#0A0A0A] hover:border-[#D4D4D4] dark:hover:border-[#333333]'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded border border-[#E5E5E5] dark:border-[#222222] bg-[#F7F7F7] dark:bg-[#161616] text-[#171717] dark:text-[#FAFAFA]">
              <Sparkles className="h-4 w-4" />
            </div>
            {selectedTrack === 'skills' && (
              <CheckCircle2 className="h-4 w-4 text-[#7C3AED] dark:text-[#8B5CF6]" />
            )}
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#171717] dark:text-[#FAFAFA]">
              Skills-First Trajectory
            </h2>
            <p className="text-xs text-[#666666] dark:text-[#A3A3A3] mt-1 leading-relaxed">
              Input languages and frameworks you currently work with. Discover career roles with maximum alignment to your existing stack.
            </p>
          </div>

          {selectedTrack === 'skills' && (
            <div className="pt-3 border-t border-[#E5E5E5] dark:border-[#222222] space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-[#8C8C8C] dark:text-[#666666] block">
                Known Technologies & Tools
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  placeholder="e.g. Rust, TypeScript, PostgreSQL"
                  className="flex-1 rounded-md border border-[#E5E5E5] dark:border-[#222222] bg-white dark:bg-[#050505] px-3 py-1.5 text-xs text-[#171717] dark:text-[#FAFAFA] placeholder-[#8C8C8C] dark:placeholder-[#555555] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#8B5CF6]"
                />
                <Button size="sm" variant="primary" disabled={!skillsInput.trim()}>
                  Save <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Technical Provenance Note */}
      <div className="rounded-md border border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#080808] p-4 text-xs text-[#666666] dark:text-[#A3A3A3] space-y-1">
        <p className="font-medium text-[#171717] dark:text-[#FAFAFA]">
          Integrity & Verification Boundary
        </p>
        <p className="leading-relaxed">
          Maximus never synthesizes fake skills or hallucinates completion badges. All learning paths are backed by concrete evaluation challenges run through sandboxed runners.
        </p>
      </div>
    </div>
  );
};
