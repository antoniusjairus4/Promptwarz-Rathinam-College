import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, Sparkles, ArrowRight, CheckCircle2, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useLearner } from '@/context/LearnerContext';

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { onboard, isLoading } = useLearner();

  const [selectedTrack, setSelectedTrack] = useState<'career' | 'skills'>('career');
  const [fullName, setFullName] = useState('Learner');
  const [careerInput, setCareerInput] = useState('');
  const [skillsInput, setSkillsInput] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<'entry' | 'mid' | 'senior'>('entry');
  const [weeklyHours, setWeeklyHours] = useState(5);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isFormValid =
    fullName.trim().length > 0 &&
    ((selectedTrack === 'career' && careerInput.trim().length > 0) ||
      (selectedTrack === 'skills' && skillsInput.trim().length > 0));

  const handleContinue = async () => {
    if (!isFormValid) return;
    setSubmitError(null);

    const parsedSkills = skillsInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    try {
      if (selectedTrack === 'career') {
        await onboard({
          full_name: fullName.trim(),
          track: 'career_first',
          target_role: careerInput.trim(),
          skills: parsedSkills,
          experience_level: experienceLevel,
          weekly_hours: Number(weeklyHours) || 5,
        });
      } else {
        await onboard({
          full_name: fullName.trim(),
          track: 'skills_first',
          skills: parsedSkills.length > 0 ? parsedSkills : ['General Engineering'],
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
        <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#7C3AED] dark:text-[#8B5CF6]">
          <span>Trajectory Calibration</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#171717] dark:text-[#FAFAFA]">
          Calibrate Your Learning Pathway
        </h1>
        <p className="text-base sm:text-lg text-[#737373] dark:text-[#A3A3A3] max-w-2xl leading-relaxed">
          Maximus creates an adaptive competency graph tailored either to an aspirational career target or to your existing technical stack. Choose how you want to start.
        </p>
      </div>

      {submitError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Unable to Complete Calibration</p>
            <p>{submitError}</p>
          </div>
        </div>
      )}

      {/* User Basic Info Form */}
      <div className="rounded-xl border border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#0A0A0A] p-6 space-y-4">
        <h3 className="text-sm font-semibold text-[#171717] dark:text-[#FAFAFA]">Learner Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#666666] dark:text-[#A3A3A3]">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Alex Mercer"
              className="w-full h-10 rounded-md border border-[#E5E5E5] dark:border-[#262626] bg-white dark:bg-[#050505] px-3.5 text-sm text-[#171717] dark:text-[#FAFAFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]/50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#666666] dark:text-[#A3A3A3]">Experience Level</label>
            <select
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value as 'entry' | 'mid' | 'senior')}
              className="w-full h-10 rounded-md border border-[#E5E5E5] dark:border-[#262626] bg-white dark:bg-[#050505] px-3.5 text-sm text-[#171717] dark:text-[#FAFAFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]/50"
            >
              <option value="entry">Entry Level (&lt; 2 yrs)</option>
              <option value="mid">Mid Level (2–5 yrs)</option>
              <option value="senior">Senior Level (5+ yrs)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#666666] dark:text-[#A3A3A3]">Weekly Learning Commitment</label>
            <select
              value={weeklyHours}
              onChange={(e) => setWeeklyHours(Number(e.target.value))}
              className="w-full h-10 rounded-md border border-[#E5E5E5] dark:border-[#262626] bg-white dark:bg-[#050505] px-3.5 text-sm text-[#171717] dark:text-[#FAFAFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]/50"
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
          className={`cursor-pointer rounded-xl border p-6 sm:p-8 transition-all duration-200 flex flex-col justify-between space-y-6 ${
            selectedTrack === 'career'
              ? 'border-[#7C3AED] dark:border-[#8B5CF6] bg-[#FAFAFA] dark:bg-[#111111] shadow-sm'
              : 'border-[#E5E5E5] dark:border-[#222222] bg-white dark:bg-[#0A0A0A] hover:border-[#D4D4D4] dark:hover:border-[#333333]'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-[#E5E5E5] dark:border-[#262626] bg-white dark:bg-[#161616] text-[#171717] dark:text-[#FAFAFA] shadow-xs">
                <Compass className="h-6 w-6 text-[#7C3AED] dark:text-[#8B5CF6]" />
              </div>
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${
                  selectedTrack === 'career'
                    ? 'border-[#7C3AED] dark:border-[#8B5CF6] bg-[#7C3AED] dark:bg-[#8B5CF6] text-white'
                    : 'border-[#D4D4D4] dark:border-[#333333]'
                }`}
              >
                {selectedTrack === 'career' && <CheckCircle2 className="h-4 w-4" />}
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight text-[#171717] dark:text-[#FAFAFA]">
                Career-First Trajectory
              </h2>
              <p className="text-sm text-[#737373] dark:text-[#A3A3A3] leading-relaxed">
                Target an aspirational technical role. The agentic system reverse-engineers the exact competencies, prerequisite dependencies, and milestone challenges needed.
              </p>
            </div>
          </div>

          {/* Input field */}
          <div className="pt-4 border-t border-[#E5E5E5] dark:border-[#222222] space-y-2.5">
            <label className="text-xs font-medium text-[#171717] dark:text-[#FAFAFA] block">
              Aspirational Career Target
            </label>
            <input
              type="text"
              value={careerInput}
              onChange={(e) => setCareerInput(e.target.value)}
              placeholder="e.g. Distributed Systems Engineer, Platform Lead, Python Backend"
              className="w-full h-11 rounded-md border border-[#E5E5E5] dark:border-[#262626] bg-white dark:bg-[#050505] px-4 text-sm text-[#171717] dark:text-[#FAFAFA] placeholder-[#8C8C8C] dark:placeholder-[#555555] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]/50 transition-colors"
            />
            <p className="text-xs text-[#8C8C8C] dark:text-[#666666]">
              Accepts any technical role title, not a restricted preset list.
            </p>
          </div>
        </div>

        {/* Choice B: Skills-First */}
        <div
          onClick={() => setSelectedTrack('skills')}
          className={`cursor-pointer rounded-xl border p-6 sm:p-8 transition-all duration-200 flex flex-col justify-between space-y-6 ${
            selectedTrack === 'skills'
              ? 'border-[#7C3AED] dark:border-[#8B5CF6] bg-[#FAFAFA] dark:bg-[#111111] shadow-sm'
              : 'border-[#E5E5E5] dark:border-[#222222] bg-white dark:bg-[#0A0A0A] hover:border-[#D4D4D4] dark:hover:border-[#333333]'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-[#E5E5E5] dark:border-[#262626] bg-white dark:bg-[#161616] text-[#171717] dark:text-[#FAFAFA] shadow-xs">
                <Sparkles className="h-6 w-6 text-[#7C3AED] dark:text-[#8B5CF6]" />
              </div>
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${
                  selectedTrack === 'skills'
                    ? 'border-[#7C3AED] dark:border-[#8B5CF6] bg-[#7C3AED] dark:bg-[#8B5CF6] text-white'
                    : 'border-[#D4D4D4] dark:border-[#333333]'
                }`}
              >
                {selectedTrack === 'skills' && <CheckCircle2 className="h-4 w-4" />}
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight text-[#171717] dark:text-[#FAFAFA]">
                Skills-First Trajectory
              </h2>
              <p className="text-sm text-[#737373] dark:text-[#A3A3A3] leading-relaxed">
                Input your existing languages, frameworks, and tools. Discover high-demand engineering trajectories that maximize your current strengths.
              </p>
            </div>
          </div>

          {/* Input field */}
          <div className="pt-4 border-t border-[#E5E5E5] dark:border-[#222222] space-y-2.5">
            <label className="text-xs font-medium text-[#171717] dark:text-[#FAFAFA] block">
              Core Languages & Technologies
            </label>
            <input
              type="text"
              value={skillsInput}
              onChange={(e) => setSkillsInput(e.target.value)}
              placeholder="e.g. Python, TypeScript, Docker, PostgreSQL"
              className="w-full h-11 rounded-md border border-[#E5E5E5] dark:border-[#262626] bg-white dark:bg-[#050505] px-4 text-sm text-[#171717] dark:text-[#FAFAFA] placeholder-[#8C8C8C] dark:placeholder-[#555555] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]/50 transition-colors"
            />
            <p className="text-xs text-[#8C8C8C] dark:text-[#666666]">
              Enter comma-separated technologies to benchmark your baseline stack.
            </p>
          </div>
        </div>
      </div>

      {/* Prominent Continue Button Area */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-[#E5E5E5] dark:border-[#222222]">
        <div className="text-xs sm:text-sm text-[#737373] dark:text-[#888888]">
          Selected Track:{' '}
          <span className="font-semibold text-[#171717] dark:text-[#FAFAFA]">
            {selectedTrack === 'career' ? 'Career-First' : 'Skills-First'}
          </span>
          {isFormValid && (
            <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-medium">
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
      <div className="rounded-lg border border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#080808] p-5 text-xs text-[#737373] dark:text-[#888888] flex items-start gap-3.5">
        <ShieldCheck className="h-5 w-5 text-[#7C3AED] dark:text-[#8B5CF6] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-[#171717] dark:text-[#FAFAFA]">
            Anti-Fabrication & Evidence Guarantee
          </p>
          <p className="leading-relaxed">
            Maximus never generates synthetic skills or fabricated scores. Every competency on your roadmap is proven through hands-on code assessments or repository evidence.
          </p>
        </div>
      </div>
    </div>
  );
};
