import React, { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Terminal,
  Compass,
  Briefcase,
  CheckCircle2,
  BookOpen,
  Sparkles,
  Info,
  Award,
  Layers,
  Flame,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useLearner } from '@/context/LearnerContext';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    learner,
    storageStatus,
    assessmentResult,
    roadmap,
    refreshLearner,
  } = useLearner();

  useEffect(() => {
    refreshLearner();
  }, [refreshLearner]);

  const targetCareer = learner?.target_role || null;
  const verifiedSkillsCount =
    learner?.skills?.filter((s) => s.verified).length ||
    (assessmentResult ? Object.keys(assessmentResult.skill_scores || {}).length : 0);

  const readinessScore: number | null = assessmentResult ? Math.round(assessmentResult.score) : null;

  // Find active step in roadmap
  const activeStep = roadmap?.steps?.find((s) => s.status === 'available');
  const completedStepsCount = roadmap?.steps?.filter((s) => s.status === 'completed').length || 0;
  const totalStepsCount = roadmap?.steps?.length || 0;

  const competencyGaps = assessmentResult?.gaps || [];
  const strengths = assessmentResult?.demonstrated_strengths || [];

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      {/* Storage Mode Notice */}
      {storageStatus?.mode === 'memory' && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs sm:text-sm text-amber-600 dark:text-amber-400 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Info className="h-4 w-4 shrink-0 text-amber-500" />
            <span>
              <strong>Temporary demo session:</strong> In-memory storage is active. Learner progress is preserved in this browser session but resets when the backend server restarts.
            </span>
          </div>
          <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
            mode: memory
          </span>
        </div>
      )}

      {/* TOP SECTION: Large Heading & Career Target Bar */}
      <section className="border-b border-[#E5E5E5] dark:border-[#222222] pb-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#171717] dark:text-[#FAFAFA]">
                {learner?.full_name ? `${learner.full_name}'s Workspace` : 'Maximus Overview'}
              </h1>
              {learner && (
                <Badge variant="outline" className="text-xs uppercase font-mono">
                  {learner.track === 'career_first' ? 'Career Track' : 'Skills Track'}
                </Badge>
              )}
            </div>
            <p className="text-sm sm:text-base text-[#737373] dark:text-[#A3A3A3] max-w-2xl leading-relaxed">
              Discover what you know. Prove what you can do. Build what comes next.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <NavLink to="/onboarding">
              <Button variant="primary" size="md" className="gap-2 shadow-xs cursor-pointer">
                <Sparkles className="h-4 w-4" />
                <span>{learner ? 'Re-calibrate Trajectory' : 'Calibrate Career Target'}</span>
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
              Readiness Score:{' '}
              <strong className="text-[#171717] dark:text-[#FAFAFA] font-medium font-mono">
                {readinessScore !== null ? `${readinessScore}%` : 'Unassessed'}
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
                  <span className="text-3xl font-bold font-mono text-[#7C3AED] dark:text-[#8B5CF6]">
                    {readinessScore}%
                  </span>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-6 pt-4 flex-1 flex flex-col justify-center">
              {readinessScore !== null ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-[#737373] dark:text-[#888888]">
                      <span>Target Alignment: {targetCareer}</span>
                      <span>{assessmentResult?.correct} of {assessmentResult?.total} challenges passed</span>
                    </div>
                    <div className="w-full bg-[#E5E5E5] dark:bg-[#222222] h-3 rounded-full overflow-hidden">
                      <div
                        className="bg-[#7C3AED] dark:bg-[#8B5CF6] h-full rounded-full transition-all duration-500"
                        style={{ width: `${readinessScore}%` }}
                      />
                    </div>
                  </div>

                  {assessmentResult?.evidence_note && (
                    <div className="p-3.5 rounded-lg border border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#0A0A0A] text-xs text-[#737373] dark:text-[#A3A3A3] space-y-1">
                      <span className="font-semibold text-[#171717] dark:text-[#FAFAFA]">Assessment Evidence Note:</span>
                      <p>{assessmentResult.evidence_note}</p>
                    </div>
                  )}

                  {strengths.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-[#171717] dark:text-[#FAFAFA]">Demonstrated Strengths:</span>
                      <div className="flex flex-wrap gap-2">
                        {strengths.map((str, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                            {str}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <EmptyState
                  icon={Layers}
                  title="Readiness Profile Uncalibrated"
                  description="Complete a timed coding assessment in Skill Arena or calibrate your career target in Onboarding to calculate an authentic readiness score."
                  actionLabel="Launch Assessment in Skill Arena"
                  onAction={() => navigate('/arena')}
                  secondaryActionLabel="Set Target Career"
                  onSecondaryAction={() => navigate('/onboarding')}
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

              {!learner ? (
                <>
                  <h2 className="text-lg font-semibold text-[#171717] dark:text-[#FAFAFA] tracking-tight">
                    Calibrate Career Trajectory
                  </h2>
                  <p className="text-sm text-[#737373] dark:text-[#A3A3A3] leading-relaxed">
                    Set up your learner profile and target technical role to unlock personalized roadmaps and assessments.
                  </p>
                  <div className="pt-2">
                    <NavLink to="/onboarding" className="block">
                      <Button variant="primary" size="md" className="w-full justify-between h-11 px-4 cursor-pointer">
                        <span>Start Calibration</span>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </NavLink>
                  </div>
                </>
              ) : !assessmentResult ? (
                <>
                  <h2 className="text-lg font-semibold text-[#171717] dark:text-[#FAFAFA] tracking-tight">
                    Take Baseline Assessment
                  </h2>
                  <p className="text-sm text-[#737373] dark:text-[#A3A3A3] leading-relaxed">
                    Take the AI-generated assessment in Skill Arena. Your answers establish verified competencies and reveal gap priorities.
                  </p>
                  <div className="pt-2">
                    <NavLink to="/arena" className="block">
                      <Button variant="primary" size="md" className="w-full justify-between h-11 px-4 cursor-pointer">
                        <span>Enter Skill Arena</span>
                        <Terminal className="h-4 w-4" />
                      </Button>
                    </NavLink>
                  </div>
                </>
              ) : !roadmap ? (
                <>
                  <h2 className="text-lg font-semibold text-[#171717] dark:text-[#FAFAFA] tracking-tight">
                    Generate Adaptive Roadmap
                  </h2>
                  <p className="text-sm text-[#737373] dark:text-[#A3A3A3] leading-relaxed">
                    Transform your assessment results into an adaptive, step-by-step competency curriculum in Career Navigator.
                  </p>
                  <div className="pt-2">
                    <NavLink to="/career" className="block">
                      <Button variant="primary" size="md" className="w-full justify-between h-11 px-4 cursor-pointer">
                        <span>View Career Navigator</span>
                        <Compass className="h-4 w-4" />
                      </Button>
                    </NavLink>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold text-[#171717] dark:text-[#FAFAFA] tracking-tight">
                    {activeStep ? activeStep.title : 'Roadmap In Progress'}
                  </h2>
                  <p className="text-sm text-[#737373] dark:text-[#A3A3A3] leading-relaxed">
                    {activeStep
                      ? activeStep.objective
                      : `${completedStepsCount} of ${totalStepsCount} milestones achieved.`}
                  </p>
                  <div className="pt-2">
                    <NavLink to="/career" className="block">
                      <Button variant="primary" size="md" className="w-full justify-between h-11 px-4 cursor-pointer">
                        <span>Continue Roadmap</span>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </NavLink>
                  </div>
                </>
              )}
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
            {activeStep ? (
              <div className="p-4 rounded-md border border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#080808] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-[#7C3AED] dark:text-[#8B5CF6]">
                    {activeStep.skill}
                  </span>
                  <span className="text-xs text-[#8C8C8C] dark:text-[#666666]">
                    ~{activeStep.estimated_hours}h
                  </span>
                </div>
                <p className="text-sm font-semibold text-[#171717] dark:text-[#FAFAFA]">{activeStep.title}</p>
                <p className="text-xs text-[#737373] dark:text-[#A3A3A3] line-clamp-2">{activeStep.practice_task}</p>
              </div>
            ) : (
              <div className="space-y-4 py-2">
                <p className="text-sm text-[#737373] dark:text-[#A3A3A3] leading-relaxed">
                  {roadmap
                    ? 'All active milestones completed! Retake assessment or calibrate a higher role.'
                    : 'Milestones are dynamically generated after calibrating your career target and taking an assessment.'}
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

        {/* Card 2: Competency Gaps */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Competency Gap Overview</CardTitle>
            <CardDescription>Critical proficiencies for target trajectory</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center">
            {competencyGaps.length > 0 ? (
              <div className="space-y-2">
                {competencyGaps.map((gap, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-[#E5E5E5] dark:border-[#222222]">
                    <span className="text-[#171717] dark:text-[#FAFAFA] font-medium">{gap}</span>
                    <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-500/30">
                      Gap Priority
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4 py-2">
                <p className="text-sm text-[#737373] dark:text-[#A3A3A3] leading-relaxed">
                  {learner
                    ? 'No gaps benchmarked yet. Complete an initial assessment in Skill Arena.'
                    : 'Configure a career target in Onboarding to generate verified competency gaps against market requirements.'}
                </p>
                <NavLink
                  to={learner ? '/arena' : '/onboarding'}
                  className="text-xs sm:text-sm font-medium text-[#7C3AED] dark:text-[#8B5CF6] hover:underline inline-flex items-center gap-1.5"
                >
                  {learner ? 'Take Assessment' : 'Configure Career Target'} <ArrowRight className="h-3.5 w-3.5" />
                </NavLink>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 3: Recent Assessment Results / Proof */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Proof-of-Work Log</CardTitle>
            <CardDescription>Audited challenge verification proofs</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center">
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2.5 text-sm text-[#737373] dark:text-[#A3A3A3]">
                {assessmentResult ? (
                  <>
                    <Award className="h-5 w-5 text-emerald-500 shrink-0" />
                    <span className="font-medium text-[#171717] dark:text-[#FAFAFA]">
                      1 assessment submitted ({assessmentResult.score}% score)
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-[#8C8C8C] dark:text-[#666666] shrink-0" />
                    <span>0 assessments completed</span>
                  </>
                )}
              </div>
              <p className="text-xs text-[#8C8C8C] dark:text-[#666666] leading-relaxed">
                Completed challenges in Skill Arena receive immutable evaluation proofs stored on the backend.
              </p>
              <NavLink
                to="/arena"
                className="text-xs sm:text-sm font-medium text-[#7C3AED] dark:text-[#8B5CF6] hover:underline inline-flex items-center gap-1.5"
              >
                {assessmentResult ? 'Retake assessment' : 'Start an assessment'} <ArrowRight className="h-3.5 w-3.5" />
              </NavLink>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* LOWER SECTION: Market Alignment, Learning Hub, AI Mentor */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">Live Job Explorer</CardTitle>
              <CardDescription className="text-sm mt-0.5">
                Real engineering positions from external feeds
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
                Targeted curriculum & official documentation
              </CardDescription>
            </div>
            <BookOpen className="h-5 w-5 text-[#8C8C8C] dark:text-[#666666]" />
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[#737373] dark:text-[#A3A3A3] leading-relaxed">
              Review official documentation benchmarks and structured modules from MIT OCW, freeCodeCamp, and YouTube.
            </p>
            <NavLink
              to="/learning"
              className="text-xs sm:text-sm font-medium text-[#7C3AED] dark:text-[#8B5CF6] hover:underline inline-flex items-center gap-1.5"
            >
              Browse curated resources <ArrowRight className="h-3.5 w-3.5" />
            </NavLink>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">AI Adaptive Mentor</CardTitle>
              <CardDescription className="text-sm mt-0.5">
                Context-aware guidance on your roadmap
              </CardDescription>
            </div>
            <Flame className="h-5 w-5 text-[#8C8C8C] dark:text-[#666666]" />
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[#737373] dark:text-[#A3A3A3] leading-relaxed">
              Ask technical questions, request milestone hints, or debug challenges with your agentic career mentor.
            </p>
            <NavLink
              to="/mentor"
              className="text-xs sm:text-sm font-medium text-[#7C3AED] dark:text-[#8B5CF6] hover:underline inline-flex items-center gap-1.5"
            >
              Chat with AI Mentor <ArrowRight className="h-3.5 w-3.5" />
            </NavLink>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};
