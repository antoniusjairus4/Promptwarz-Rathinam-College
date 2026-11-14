import React, { useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { Compass, Sparkles, ArrowRight, CheckCircle2, ShieldCheck, Loader2, AlertCircle, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useLearner } from '@/context/LearnerContext';

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { learner, onboard, isLoading } = useLearner();

  const [selectedTrack, setSelectedTrack] = useState<'career' | 'skills'>(
    learner?.track === 'skills_first' ? 'skills' : 'career'
  );
  const [fullName, setFullName] = useState(learner?.full_name || 'Learner');
  const [careerInput, setCareerInput] = useState(learner?.target_role || '');
  const [skillsInput, setSkillsInput] = useState(
    learner?.skills?.map((s) => s.skill).join(', ') || ''
  );
  const [interestsInput, setInterestsInput] = useState(
    learner?.interests?.join(', ') || ''
  );
  const [experienceLevel, setExperienceLevel] = useState<'entry' | 'mid' | 'senior'>(
    (learner?.experience_level as 'entry' | 'mid' | 'senior') || 'entry'
  );
  const [weeklyHours, setWeeklyHours] = useState(learner?.weekly_hours || 5);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isFormValid =
    fullName.trim().length > 0 &&
    ((selectedTrack === 'career' && careerInput.trim().length > 0) ||
      (selectedTrack === 'skills' && (skillsInput.trim().length > 0 || interestsInput.trim().length > 0)));

  const handleContinue = async () => {
    if (!isFormValid) return;
    setSubmitError(null);

    const parsedSkills = skillsInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const parsedInterests = interestsInput
      .split(',')
      .map((i) => i.trim())
      .filter((i) => i.length > 0);

    try {
      if (selectedTrack === 'career') {
        await onboard({
          full_name: fullName.trim(),
          track: 'career_first',
          target_role: careerInput.trim(),
          skills: parsedSkills,
          interests: parsedInterests,
          experience_level: experienceLevel,
          weekly_hours: Number(weeklyHours) || 5,
        });
      } else {
        await onboard({
          full_name: fullName.trim(),
          track: 'skills_first',
          skills: parsedSkills,
          interests: parsedInterests,
          experience_level: experienceLevel,
          weekly_hours: Number(weeklyHours) || 5,
        });
      }
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Onboarding failed. Please try again.';
      setSubmitError(msg);
    }
  };

  return (
    <div className="max-w-[1100px] mx-auto py-6 sm:py-10 space-y-10">
      {/* Editorial Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#7C3AED] dark:text-[#A78BFA]">
          <span>Trajectory Calibration</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#111827] dark:text-[#FAFAFA]">
          Calibrate Your Learning Pathway
        </h1>
        <p className="text-base sm:text-lg text-[#6B7280] dark:text-[#A3A3A3] max-w-2xl leading-relaxed">
          Maximus creates an adaptive competency graph tailored either to an aspirational career target or to your existing technical stack. Choose how you want to start.
        </p>

        {learner && (
          <div className="flex items-center gap-2 text-xs text-[#6B7280] dark:text-[#888888] pt-1">
            <span>Currently calibrated as: <strong className="text-[#111827] dark:text-[#FAFAFA]">{learner.full_name} ({learner.target_role || 'Skills-first'})</strong></span>
            <span>•</span>
            <NavLink to="/dashboard" className="text-[#7C3AED] dark:text-[#A78BFA] hover:underline font-medium">
              Return to Dashboard →
            </NavLink>
          </div>
        )}
      </div>

      {submitError && (
        <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Unable to Complete Calibration</p>
            <p>{submitError}</p>
          </div>
        </div>
      )}

      {/* User Basic Info Form */}
      <div className="rounded-xl border border-[#E5E7EB] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#0A0A0A] p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#111827] dark:text-[#FAFAFA]">
          <User className="h-4 w-4 text-[#7C3AED] dark:text-[#A78BFA]" />
          <span>Learner Profile</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#4B5563] dark:text-[#A3A3A3]" htmlFor="full-name">Full Name</label>
            <input
              type="text"
              id="full-name" value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Alex Mercer"
              className="w-full h-10 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-[#050505] px-3.5 text-sm text-[#111827] dark:text-[#FAFAFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]/50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#4B5563] dark:text-[#A3A3A3]" htmlFor="experience-level">Experience Level</label>
            <select
              id="experience-level" value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value as 'entry' | 'mid' | 'senior')}
              className="w-full h-10 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-[#050505] px-3.5 text-sm text-[#111827] dark:text-[#FAFAFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]/50 cursor-pointer"
            >
              <option value="entry">Entry Level (&lt; 2 yrs)</option>
              <option value="mid">Mid Level (2–5 yrs)</option>
              <option value="senior">Senior Level (5+ yrs)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#4B5563] dark:text-[#A3A3A3]" htmlFor="weekly-hours">Weekly Learning Commitment</label>
            <select
              id="weekly-hours" value={weeklyHours}
              onChange={(e) => setWeeklyHours(Number(e.target.value))}
              className="w-full h-10 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-[#050505] px-3.5 text-sm text-[#111827] dark:text-[#FAFAFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]/50 cursor-pointer"
            >
              <option value={5}>5 hours / week (Focused pace)</option>
              <option value={10}>10 hours / week (Accelerated)</option>
              <option value={20}>20+ hours / week (Intensive)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Two Substantial Trajectory Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        {/* Choice A: Career-First */}
        <div
          onClick={() => setSelectedTrack('career')}
          role="group" aria-label="Career-first track"
          className={`cursor-pointer rounded-xl border p-6 sm:p-8 transition-all duration-200 flex flex-col justify-between space-y-6 ${
            selectedTrack === 'career'
              ? 'border-[#7C3AED] dark:border-[#8B5CF6] bg-[#FFFFFF] dark:bg-[#111111] shadow-sm ring-1 ring-[#7C3AED]/20'
              : 'border-[#E5E7EB] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#0A0A0A] hover:border-[#D1D5DB] dark:hover:border-[#333333]'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#E5E7EB] dark:border-[#262626] bg-[#FFFFFF] dark:bg-[#161616] text-[#111827] dark:text-[#FAFAFA] shadow-xs">
                <Compass className="h-6 w-6 text-[#7C3AED] dark:text-[#A78BFA]" />
              </div>
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${
                  selectedTrack === 'career'
                    ? 'border-[#7C3AED] dark:border-[#8B5CF6] bg-[#7C3AED] dark:bg-[#8B5CF6] text-white'
                    : 'border-[#D1D5DB] dark:border-[#333333]'
                }`}
              >
                {selectedTrack === 'career' && <CheckCircle2 className="h-4 w-4" />}
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight text-[#111827] dark:text-[#FAFAFA]">
                <button type="button" aria-pressed={selectedTrack === 'career'} onClick={() => setSelectedTrack('career')}>{"Career-First Trajectory"}</button>
              </h2>
              <p className="text-sm text-[#6B7280] dark:text-[#A3A3A3] leading-relaxed">
                Target an aspirational technical role. The agentic system reverse-engineers the exact competencies, prerequisite dependencies, and milestone challenges needed.
              </p>
            </div>
          </div>

          {/* Input field */}
          <div className="pt-4 border-t border-[#E5E7EB] dark:border-[#222222] space-y-2.5">
            <label className="text-xs font-medium text-[#111827] dark:text-[#FAFAFA] block">
              Aspirational Career Target
            </label>
            <input
              type="text"
              value={careerInput}
              onChange={(e) => setCareerInput(e.target.value)}
              aria-label="e.g. Distributed Systems Engineer, Platform Lead, Python Backend"
              placeholder="e.g. Distributed Systems Engineer, Platform Lead, Python Backend"
              className="w-full h-11 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-[#050505] px-4 text-sm text-[#111827] dark:text-[#FAFAFA] placeholder-[#9CA3AF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]/50 transition-colors"
            />
            <p className="text-xs text-[#6B7280] dark:text-[#A3A3A3]">
              Accepts any technical role title, not a restricted preset list.
            </p>
          </div>
        </div>

        {/* Choice B: Skills-First */}
        <div
          onClick={() => setSelectedTrack('skills')}
          role="group" aria-label="Skills-first track"
          className={`cursor-pointer rounded-xl border p-6 sm:p-8 transition-all duration-200 flex flex-col justify-between space-y-6 ${
            selectedTrack === 'skills'
              ? 'border-[#7C3AED] dark:border-[#8B5CF6] bg-[#FFFFFF] dark:bg-[#111111] shadow-sm ring-1 ring-[#7C3AED]/20'
              : 'border-[#E5E7EB] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#0A0A0A] hover:border-[#D1D5DB] dark:hover:border-[#333333]'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#E5E7EB] dark:border-[#262626] bg-[#FFFFFF] dark:bg-[#161616] text-[#111827] dark:text-[#FAFAFA] shadow-xs">
                <Sparkles className="h-6 w-6 text-[#7C3AED] dark:text-[#A78BFA]" />
              </div>
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${
                  selectedTrack === 'skills'
                    ? 'border-[#7C3AED] dark:border-[#8B5CF6] bg-[#7C3AED] dark:bg-[#8B5CF6] text-white'
                    : 'border-[#D1D5DB] dark:border-[#333333]'
                }`}
              >
                {selectedTrack === 'skills' && <CheckCircle2 className="h-4 w-4" />}
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight text-[#111827] dark:text-[#FAFAFA]">
                <button type="button" aria-pressed={selectedTrack === 'skills'} onClick={() => setSelectedTrack('skills')}>{"Skills-First Trajectory"}</button>
              </h2>
              <p className="text-sm text-[#6B7280] dark:text-[#A3A3A3] leading-relaxed">
                Input your existing languages, frameworks, and technical interests. Discover high-demand engineering trajectories that maximize your current strengths.
              </p>
            </div>
          </div>

          {/* Input fields */}
          <div className="pt-4 border-t border-[#E5E7EB] dark:border-[#222222] space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#111827] dark:text-[#FAFAFA] block">
                Core Languages & Technologies
              </label>
              <input
                type="text"
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
                aria-label="e.g. Python, TypeScript, Docker, PostgreSQL"
                placeholder="e.g. Python, TypeScript, Docker, PostgreSQL"
                className="w-full h-10 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-[#050505] px-4 text-sm text-[#111827] dark:text-[#FAFAFA] placeholder-[#9CA3AF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]/50 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#111827] dark:text-[#FAFAFA] block">
                Technical Interests (Optional)
              </label>
              <input
                type="text"
                value={interestsInput}
                onChange={(e) => setInterestsInput(e.target.value)}
                aria-label="e.g. Distributed Systems, Machine Learning, Web3, Cloud Security"
                placeholder="e.g. Distributed Systems, Machine Learning, Web3, Cloud Security"
                className="w-full h-10 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-[#050505] px-4 text-sm text-[#111827] dark:text-[#FAFAFA] placeholder-[#9CA3AF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]/50 transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Prominent Continue Button Area */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-[#E5E7EB] dark:border-[#222222]">
        <div className="text-xs sm:text-sm text-[#6B7280] dark:text-[#888888]">
          Selected Track:{' '}
          <span className="font-semibold text-[#111827] dark:text-[#FAFAFA]">
            {selectedTrack === 'career' ? 'Career-First' : 'Skills-First'}
          </span>
          {isFormValid && (
            <span className="ml-2 text-emerald-700 dark:text-emerald-400 font-medium">
              • Ready to calibrate
            </span>
          )}
        </div>

        <Button
          size="lg"
          variant="primary"
          onClick={handleContinue}
          disabled={!isFormValid || isLoading}
          className="w-full sm:w-auto h-12 px-8 text-base font-medium gap-2 shadow-xs cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Calibrating with Backend...</span>
            </>
          ) : (
            <>
              <span>Continue to Workspace</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>

      {/* Trust & Provenance Notice */}
      <div className="rounded-xl border border-[#E5E7EB] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#080808] p-5 text-xs text-[#6B7280] dark:text-[#888888] flex items-start gap-3.5">
        <ShieldCheck className="h-5 w-5 text-[#7C3AED] dark:text-[#A78BFA] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-[#111827] dark:text-[#FAFAFA]">
            Anti-Fabrication & Evidence Guarantee
          </p>
          <p className="leading-relaxed">
            Maximus never generates synthetic skills or fabricated scores. Quiz scores reflect this assessment only. Self-reports, source observations, and learner-reported practice do not independently verify competence.
          </p>
        </div>
      </div>
    </div>
  );
};
