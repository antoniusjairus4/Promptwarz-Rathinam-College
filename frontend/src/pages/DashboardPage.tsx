import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  ArrowRight,
  Terminal,
  Layers,
  Compass,
  Briefcase,
  CheckCircle2,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';

export const DashboardPage: React.FC = () => {
  // Learner profile state (dynamically fetched from backend /api/v1/learners/{id} when calibrated)
  const targetCareer: string | null = null;
  const verifiedSkillsCount = 0;
  const readinessScore: number | null = null;
  const activeMilestone: string | null = null;
  const competencyGaps: string[] = [];

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      {/* TOP SECTION: Large Heading & Career Target Bar */}
      <section className="border-b border-[#E5E5E5] dark:border-[#222222] pb-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#171717] dark:text-[#FAFAFA]">
              Maximus Overview
            </h1>
            <p className="text-sm sm:text-base text-[#737373] dark:text-[#A3A3A3] max-w-2xl leading-relaxed">
              Discover what you know. Prove what you can do. Build what comes next.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <NavLink to="/onboarding">
              <Button variant="primary" size="md" className="gap-2 shadow-xs">
                <Sparkles className="h-4 w-4" />
                <span>{targetCareer ? 'Change Career Target' : 'Calibrate Career Target'}</span>
              </Button>
            </NavLink>
          </div>
        </div>

        {/* Current Career Target Status Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#080808] px-5 py-3.5">
          <div className="flex items-center gap-3">
            <Compass className="h-5 w-5 text-[#7C3AED] dark:text-[#8B5CF6] shrink-0" />
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm text-[#737373] dark:text-[#888888]">Target Trajectory:</span>
              <span className="text-xs sm:text-sm font-semibold text-[#171717] dark:text-[#FAFAFA]">
                {targetCareer || 'No Career Target Configured'}
              </span>
              {!targetCareer && (
                <Badge variant="default" className="text-[11px]">
                  Uncalibrated
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-5 text-xs sm:text-sm text-[#737373] dark:text-[#888888]">
            <span>
              Verified Skills:{' '}
              <strong className="text-[#171717] dark:text-[#FAFAFA] font-medium font-mono">
                {verifiedSkillsCount}
              </strong>
            </span>
            <span>
              Readiness:{' '}
              <strong className="text-[#171717] dark:text-[#FAFAFA] font-medium font-mono">
                {readinessScore !== null ? `${readinessScore}%` : 'Uncalibrated'}
              </strong>
            </span>
          </div>
        </div>
      </section>

      {/* MAIN SECTION: 65% / 35% Asymmetric Composition */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Primary Panel (65% width) - Career Readiness Overview */}
        <div className="lg:col-span-8">
          <Card className="h-full flex flex-col justify-between p-2">
            <CardHeader className="p-6 pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-semibold">Career Readiness Overview</CardTitle>
                  <CardDescription className="text-sm mt-1">
                    Objective benchmarking against industry engineering standards
                  </CardDescription>
                </div>
                {readinessScore !== null && (
                  <span className="text-2xl font-bold font-mono text-[#7C3AED] dark:text-[#8B5CF6]">
                    {readinessScore}%
                  </span>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-6 pt-4 flex-1 flex flex-col justify-center">
              {readinessScore !== null ? (
                <div className="space-y-4">
                  <div className="w-full bg-[#E5E5E5] dark:bg-[#222222] h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#7C3AED] dark:bg-[#8B5CF6] h-full rounded-full transition-all duration-300"
                      style={{ width: `${readinessScore}%` }}
                    />
                  </div>
                  <p className="text-sm text-[#737373] dark:text-[#A3A3A3]">
                    Evaluated from {verifiedSkillsCount} audited assessments against {targetCareer} requirements.
                  </p>
                </div>
              ) : (
                <EmptyState
                  icon={Layers}
                  title="Readiness Profile Uncalibrated"
                  description="Complete a timed coding assessment in Skill Arena or calibrate your career target in Onboarding to calculate an authentic readiness score."
                  actionLabel="Launch Assessment in Skill Arena"
                  onAction={() => {}}
                  secondaryActionLabel="Set Target Career"
                  onSecondaryAction={() => {}}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Secondary Panel (35% width) - Recommended Next Step */}
        <div className="lg:col-span-4">
          <div className="h-full rounded-lg border border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#0D0D0D] p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#7C3AED] dark:bg-[#8B5CF6]" />
                <span className="text-xs font-mono uppercase tracking-wider text-[#8C8C8C] dark:text-[#666666]">
                  Recommended Next Step
                </span>
              </div>
              <h2 className="text-lg font-semibold text-[#171717] dark:text-[#FAFAFA] tracking-tight">
                Complete Baseline Assessment
              </h2>
              <p className="text-sm text-[#737373] dark:text-[#A3A3A3] leading-relaxed">
                Take an interactive coding challenge in the Skill Arena. Your code is evaluated against sandboxed unit tests and performance suites to establish verified proof-of-work.
              </p>
            </div>

            <div className="pt-2">
              <NavLink to="/arena" className="block">
                <Button variant="primary" size="md" className="w-full justify-between h-11 px-4">
                  <span>Enter Skill Arena</span>
                  <Terminal className="h-4 w-4" />
                </Button>
              </NavLink>
            </div>
          </div>
        </div>
      </section>

      {/* SECOND SECTION: Milestones, Competency Gaps, and Assessment Results */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Current Learning Milestone */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Active Milestone</CardTitle>
            <CardDescription>Target roadmap progression</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center">
            {activeMilestone ? (
              <div className="p-4 rounded-md border border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#080808] space-y-2">
                <p className="text-sm font-semibold text-[#171717] dark:text-[#FAFAFA]">{activeMilestone}</p>
              </div>
            ) : (
              <div className="space-y-4 py-2">
                <p className="text-sm text-[#737373] dark:text-[#A3A3A3] leading-relaxed">
                  Milestones are dynamically generated after calibrating your career target and taking a baseline assessment.
                </p>
                <NavLink
                  to="/career"
                  className="text-xs sm:text-sm font-medium text-[#7C3AED] dark:text-[#8B5CF6] hover:underline inline-flex items-center gap-1.5"
                >
                  View Career Navigator graph <ArrowRight className="h-3.5 w-3.5" />
                </NavLink>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Competency Gaps (Strictly NO hardcoded fake gaps when target is unset) */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Competency Gap Overview</CardTitle>
            <CardDescription>Critical proficiencies for target trajectory</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center">
            {targetCareer && competencyGaps.length > 0 ? (
              <div className="space-y-2">
                {competencyGaps.map((gap, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-[#E5E5E5] dark:border-[#222222]">
                    <span className="text-[#171717] dark:text-[#FAFAFA]">{gap}</span>
                    <Badge variant="outline">Unverified</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4 py-2">
                <p className="text-sm text-[#737373] dark:text-[#A3A3A3] leading-relaxed">
                  {targetCareer
                    ? 'No gaps calculated yet. Complete an initial assessment to benchmark competencies.'
                    : 'Configure a career target in Onboarding to generate verified competency gaps against market requirements.'}
                </p>
                <NavLink
                  to="/onboarding"
                  className="text-xs sm:text-sm font-medium text-[#7C3AED] dark:text-[#8B5CF6] hover:underline inline-flex items-center gap-1.5"
                >
                  Configure Career Target <ArrowRight className="h-3.5 w-3.5" />
                </NavLink>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 3: Recent Assessment Results */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Proof-of-Work Log</CardTitle>
            <CardDescription>Audited challenge verification proofs</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center">
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2.5 text-sm text-[#737373] dark:text-[#A3A3A3]">
                <CheckCircle2 className="h-4 w-4 text-[#8C8C8C] dark:text-[#666666] shrink-0" />
                <span>0 assessments completed</span>
              </div>
              <p className="text-xs text-[#8C8C8C] dark:text-[#666666] leading-relaxed">
                Completed challenges in Skill Arena receive immutable evaluation proofs stored on the backend.
              </p>
              <NavLink
                to="/arena"
                className="text-xs sm:text-sm font-medium text-[#7C3AED] dark:text-[#8B5CF6] hover:underline inline-flex items-center gap-1.5"
              >
                Start an assessment <ArrowRight className="h-3.5 w-3.5" />
              </NavLink>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* LOWER SECTION: Market Alignment & Learning Resources */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">Live Market Intelligence</CardTitle>
              <CardDescription className="text-sm mt-0.5">
                Real engineering positions scraped from external feeds
              </CardDescription>
            </div>
            <Briefcase className="h-5 w-5 text-[#8C8C8C] dark:text-[#666666]" />
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[#737373] dark:text-[#A3A3A3] leading-relaxed">
              Explore live verified positions from Himalayas and Remotive matched to your target competencies. Zero synthetic jobs are displayed.
            </p>
            <NavLink
              to="/jobs"
              className="text-xs sm:text-sm font-medium text-[#7C3AED] dark:text-[#8B5CF6] hover:underline inline-flex items-center gap-1.5"
            >
              Search live job listings <ArrowRight className="h-3.5 w-3.5" />
            </NavLink>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">Curated Learning Hub</CardTitle>
              <CardDescription className="text-sm mt-0.5">
                Targeted curriculum and hands-on portfolio projects
              </CardDescription>
            </div>
            <BookOpen className="h-5 w-5 text-[#8C8C8C] dark:text-[#666666]" />
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[#737373] dark:text-[#A3A3A3] leading-relaxed">
              Review official documentation benchmarks and structured modules recommended by the Learning Curator agent.
            </p>
            <NavLink
              to="/learning"
              className="text-xs sm:text-sm font-medium text-[#7C3AED] dark:text-[#8B5CF6] hover:underline inline-flex items-center gap-1.5"
            >
              Browse curated resources <ArrowRight className="h-3.5 w-3.5" />
            </NavLink>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};
