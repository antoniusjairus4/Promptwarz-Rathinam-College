import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  ArrowRight,
  Terminal,
  Layers,
  Compass,
  Briefcase,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';

export const DashboardPage: React.FC = () => {
  // Current learner state (uninitialized in setup phase, connects to backend profile API)
  const targetCareer: string | null = null;
  const verifiedSkillsCount = 0;
  const readinessScore: number | null = null;
  const activeMilestone: string | null = null;

  return (
    <div className="space-y-8">
      {/* TOP SECTION: Editorial Header & Career Goal */}
      <section className="border-b border-[#E5E5E5] dark:border-[#222222] pb-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-widest text-[#8C8C8C] dark:text-[#666666]">
                Learner Workspace
              </span>
              <span className="h-1 w-1 rounded-full bg-[#E5E5E5] dark:bg-[#333333]" />
              <span className="font-mono text-xs text-[#8C8C8C] dark:text-[#666666]">
                Setup Phase
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#171717] dark:text-[#FAFAFA]">
              Maximus Overview
            </h1>
            <p className="text-xs md:text-sm text-[#666666] dark:text-[#A3A3A3] max-w-2xl leading-relaxed">
              Discover what you know. Prove what you can do. Build what comes next.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <NavLink to="/onboarding">
              <Button variant="primary" size="sm" className="gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{targetCareer ? 'Modify Target' : 'Define Target Career'}</span>
              </Button>
            </NavLink>
          </div>
        </div>

        {/* Current Career Target Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#080808] px-4 py-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Compass className="h-4 w-4 text-[#7C3AED] dark:text-[#8B5CF6] shrink-0" />
            <div>
              <span className="text-[#666666] dark:text-[#A3A3A3]">Aspirational Target: </span>
              <span className="font-medium text-[#171717] dark:text-[#FAFAFA]">
                {targetCareer || 'None configured yet'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[#8C8C8C] dark:text-[#666666] font-mono text-[11px]">
            <span>Verified stack: {verifiedSkillsCount} skills</span>
            <span>Readiness: {readinessScore !== null ? `${readinessScore}%` : 'Uncalibrated'}</span>
          </div>
        </div>
      </section>

      {/* MAIN ASYMMETRIC GRID (7 cols : 5 cols on large screens) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN (7 cols): Readiness & Milestone & Skill Gap */}
        <div className="lg:col-span-7 space-y-6">
          {/* Career Readiness Overview */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Career Readiness Overview</CardTitle>
                <CardDescription>
                  Benchmarked against live tech market requirements
                </CardDescription>
              </div>
              <Badge variant="outline">Evaluation</Badge>
            </CardHeader>
            <CardContent>
              {readinessScore !== null ? (
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-semibold font-mono tracking-tight">{readinessScore}%</span>
                    <span className="text-xs text-[#666666] dark:text-[#A3A3A3]">Target: {targetCareer}</span>
                  </div>
                  <div className="w-full bg-[#E5E5E5] dark:bg-[#222222] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#7C3AED] dark:bg-[#8B5CF6] h-full rounded-full transition-all duration-300"
                      style={{ width: `${readinessScore}%` }}
                    />
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={Layers}
                  title="Readiness Uncalibrated"
                  description="Complete a timed assessment in Skill Arena or inventory your capabilities to calculate an objective readiness score."
                  actionLabel="Enter Skill Arena"
                  onAction={() => {}}
                  className="p-6"
                />
              )}
            </CardContent>
          </Card>

          {/* Current Learning Milestone */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Current Learning Milestone</CardTitle>
                <CardDescription>
                  Sequential roadmap progression based on dependency graph
                </CardDescription>
              </div>
              <Badge variant="outline">Milestone</Badge>
            </CardHeader>
            <CardContent>
              {activeMilestone ? (
                <div className="p-4 rounded-md border border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#0A0A0A] space-y-2">
                  <span className="text-xs font-semibold text-[#171717] dark:text-[#FAFAFA]">{activeMilestone}</span>
                </div>
              ) : (
                <div className="space-y-3 py-1">
                  <div className="flex items-start gap-3 p-3.5 rounded-md border border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#080808]">
                    <Clock className="h-4 w-4 text-[#8C8C8C] dark:text-[#666666] shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-[#171717] dark:text-[#FAFAFA]">
                        Milestone Generation Standby
                      </p>
                      <p className="text-xs text-[#666666] dark:text-[#A3A3A3] leading-relaxed">
                        Milestones are constructed dynamically once your career target and current skill inventory are established.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <NavLink
                      to="/career"
                      className="text-xs font-medium text-[#7C3AED] dark:text-[#8B5CF6] hover:underline inline-flex items-center gap-1"
                    >
                      Open Career Navigator graph <ArrowRight className="h-3 w-3" />
                    </NavLink>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Skill Gap Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Competency Gap Overview</CardTitle>
              <CardDescription>
                High-priority technical proficiencies required for your chosen trajectory
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border border-[#E5E5E5] dark:border-[#222222] rounded-md divide-y divide-[#E5E5E5] dark:divide-[#222222] text-xs">
                <div className="p-3 bg-[#FAFAFA] dark:bg-[#0A0A0A] font-mono text-[11px] text-[#8C8C8C] dark:text-[#666666] grid grid-cols-12">
                  <span className="col-span-6">Competency Area</span>
                  <span className="col-span-3">Status</span>
                  <span className="col-span-3 text-right">Action</span>
                </div>
                <div className="p-3 grid grid-cols-12 items-center text-[#666666] dark:text-[#A3A3A3]">
                  <span className="col-span-6 font-medium text-[#171717] dark:text-[#FAFAFA]">Systems Architecture</span>
                  <span className="col-span-3 font-mono text-[11px]">Unverified</span>
                  <span className="col-span-3 text-right">
                    <NavLink to="/arena" className="text-[#7C3AED] dark:text-[#8B5CF6] hover:underline">
                      Verify
                    </NavLink>
                  </span>
                </div>
                <div className="p-3 grid grid-cols-12 items-center text-[#666666] dark:text-[#A3A3A3]">
                  <span className="col-span-6 font-medium text-[#171717] dark:text-[#FAFAFA]">Concurrent Programming</span>
                  <span className="col-span-3 font-mono text-[11px]">Unverified</span>
                  <span className="col-span-3 text-right">
                    <NavLink to="/arena" className="text-[#7C3AED] dark:text-[#8B5CF6] hover:underline">
                      Verify
                    </NavLink>
                  </span>
                </div>
                <div className="p-3 grid grid-cols-12 items-center text-[#666666] dark:text-[#A3A3A3]">
                  <span className="col-span-6 font-medium text-[#171717] dark:text-[#FAFAFA]">Distributed Consensus</span>
                  <span className="col-span-3 font-mono text-[11px]">Unverified</span>
                  <span className="col-span-3 text-right">
                    <NavLink to="/arena" className="text-[#7C3AED] dark:text-[#8B5CF6] hover:underline">
                      Verify
                    </NavLink>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN (5 cols): Next Action & Assessments & Jobs */}
        <div className="lg:col-span-5 space-y-6">
          {/* Next Recommended Action */}
          <div className="rounded-lg border border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#0D0D0D] p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#7C3AED] dark:bg-[#8B5CF6]" />
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#8C8C8C] dark:text-[#666666]">
                Recommended Next Step
              </span>
            </div>
            <h3 className="text-sm font-semibold text-[#171717] dark:text-[#FAFAFA]">
              Complete Initial Baseline Assessment
            </h3>
            <p className="text-xs text-[#666666] dark:text-[#A3A3A3] leading-relaxed">
              Proof-of-work challenges evaluate your actual code implementation inside the sandboxed editor. Results form your immutable Skill DNA.
            </p>
            <div className="pt-2">
              <NavLink to="/arena">
                <Button variant="primary" size="sm" className="w-full justify-between">
                  <span>Open Skill Arena</span>
                  <Terminal className="h-3.5 w-3.5" />
                </Button>
              </NavLink>
            </div>
          </div>

          {/* Recent Assessment Results */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Proof-of-Work Log</CardTitle>
              <CardDescription>
                Audited coding challenges and score provenance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-md border border-dashed border-[#E5E5E5] dark:border-[#222222] text-center space-y-2">
                <CheckCircle2 className="h-4 w-4 text-[#8C8C8C] dark:text-[#666666] mx-auto" />
                <p className="text-xs font-medium text-[#171717] dark:text-[#FAFAFA]">
                  No Assessments Completed Yet
                </p>
                <p className="text-[11px] text-[#666666] dark:text-[#A3A3A3]">
                  Verified badges appear here with cryptographic execution proofs.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Relevant Live Market Positions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Market Alignment</CardTitle>
                <CardDescription>Live positions matching your verified stack</CardDescription>
              </div>
              <Briefcase className="h-4 w-4 text-[#8C8C8C] dark:text-[#666666]" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-xs text-[#666666] dark:text-[#A3A3A3] leading-relaxed">
                  Market opportunities are indexed live from external scrapers. No simulated listings are shown.
                </p>
                <NavLink
                  to="/jobs"
                  className="text-xs font-medium text-[#7C3AED] dark:text-[#8B5CF6] hover:underline inline-flex items-center gap-1"
                >
                  Explore live positions <ArrowRight className="h-3 w-3" />
                </NavLink>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
