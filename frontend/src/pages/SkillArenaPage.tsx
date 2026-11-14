import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Terminal,
  CheckCircle,
  Clock,
  RotateCcw,
  Sparkles,
  Loader2,
  AlertCircle,
  ArrowRight,
  Code2,
  FileCode2,
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useLearner } from '@/context/LearnerContext';
import { useTheme } from '@/context/ThemeContext';

export const SkillArenaPage: React.FC = () => {
  const {
    learner,
    assessment,
    assessmentResult,
    isLoading,
    generateAssessment,
    loadAssessment,
    submitAssessment,
    loadAssessmentResult,
  } = useLearner();

  const { actualTheme } = useTheme();

  // State
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showSandbox, setShowSandbox] = useState(false);
  const [sandboxLanguage, setSandboxLanguage] = useState<'typescript' | 'python'>('python');
  const [sandboxCode, setSandboxCode] = useState<string>(
    '# Maximus Interactive Scratchpad\n# Use this scratchpad to draft code. Code is not executed or graded.\n\ndef check_solution():\n    return "Algorithm ready for verification"\n\nprint(check_solution())'
  );

  // Load existing assessment or result on mount
  useEffect(() => {
    if (learner?.id) {
      loadAssessmentResult();
      loadAssessment();
    }
  }, [learner?.id, loadAssessment, loadAssessmentResult]);

  const handleGenerate = async () => {
    setActionError(null);
    try {
      await generateAssessment();
      setSelectedAnswers({});
      setActiveQuestionIndex(0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate assessment';
      setActionError(msg);
    }
  };

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const handleSubmit = async () => {
    if (!assessment) return;

    // Validate that all questions are answered
    const unanswered = assessment.questions.filter((q) => selectedAnswers[q.id] === undefined);
    if (unanswered.length > 0) {
      setActionError(`Please answer all questions before submitting (${unanswered.length} remaining).`);
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    try {
      await submitAssessment(selectedAnswers);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Submission failed';
      setActionError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // If no learner profile configured
  if (!learner) {
    return (
      <div className="max-w-[1000px] mx-auto py-12 text-center space-y-6">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-700 dark:text-amber-500">
          <AlertCircle className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-[#111827] dark:text-[#FAFAFA]">
            Learner Trajectory Required
          </h2>
          <p className="text-sm text-[#6B7280] dark:text-[#A3A3A3] max-w-md mx-auto">
            You must calibrate your career target or technical stack before launching an AI-tailored competency assessment.
          </p>
        </div>
        <NavLink to="/onboarding">
          <Button variant="primary" size="lg" className="gap-2 cursor-pointer shadow-xs">
            <span>Calibrate Trajectory</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </NavLink>
      </div>
    );
  }

  const questions = assessment?.questions || [];
  const currentQuestion = questions[activeQuestionIndex];
  const allAnswered = questions.length > 0 && questions.every((q) => selectedAnswers[q.id] !== undefined);
  const answeredCount = Object.keys(selectedAnswers).length;

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6">
      {/* Top Workspace Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E5E7EB] dark:border-[#222222] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#111827] dark:text-[#FAFAFA]">
              Skill Arena: Competency Verification
            </h1>
            <Badge variant="outline" className="text-xs uppercase font-mono">
              Target: {assessment?.target_role || learner.target_role || 'General Engineering'}
            </Badge>
            {assessmentResult && (
              <Badge variant="accent" className="text-xs">
                Score: {Math.round(assessmentResult.score)}%
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs sm:text-sm text-[#6B7280] dark:text-[#888888]">
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="h-4 w-4 text-[#7C3AED] dark:text-[#A78BFA]" />
              Agentic Assessment Architect
            </span>
            <span>•</span>
            <span>Zero Hallucinations • Real Benchmark Evaluation</span>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <Button
            size="md"
            variant="secondary"
            onClick={() => setShowSandbox((prev) => !prev)}
            className="gap-2 text-xs cursor-pointer"
          >
            <Code2 className="h-4 w-4" />
            <span>{showSandbox ? 'Hide Code Sandbox' : 'Open Code Sandbox'}</span>
          </Button>

          {(!assessment || assessmentResult) && (
            <Button
              size="md"
              variant="primary"
              onClick={handleGenerate}
              disabled={isLoading}
              className="gap-2 text-xs shadow-xs cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Architecting Questions...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>{assessmentResult ? 'Retake New Assessment' : 'Generate Assessment'}</span>
                </>
              )}
            </Button>
          )}

          {assessment && !assessmentResult && (
            <Button
              size="md"
              variant="primary"
              onClick={handleSubmit}
              disabled={!allAnswered || isSubmitting}
              className="gap-2 text-xs shadow-xs cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Grading Answers...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>Submit Assessment ({answeredCount}/{questions.length})</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs sm:text-sm text-red-600 dark:text-red-400 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Assessment Notice</p>
            <p>{actionError}</p>
          </div>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className={`grid grid-cols-1 ${showSandbox ? 'lg:grid-cols-12' : 'lg:grid-cols-1'} gap-6`}>
        {/* Left / Main Column: Questions or Results */}
        <div className={showSandbox ? 'lg:col-span-7 space-y-6' : 'max-w-4xl mx-auto w-full space-y-6'}>
          {/* STATE 1: No assessment generated yet */}
          {!assessment && !assessmentResult && !isLoading && (
            <div className="rounded-xl border border-[#E5E7EB] dark:border-[#222222] bg-white dark:bg-[#0A0A0A] p-8 sm:p-12 text-center space-y-6 shadow-xs">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7C3AED]/10 text-[#7C3AED] dark:text-[#A78BFA]">
                <Terminal className="h-7 w-7" />
              </div>
              <div className="space-y-2 max-w-lg mx-auto">
                <h2 className="text-xl font-semibold text-[#111827] dark:text-[#FAFAFA]">
                  Ready to Benchmark Your Knowledge?
                </h2>
                <p className="text-sm text-[#6B7280] dark:text-[#A3A3A3] leading-relaxed">
                  The Assessment Architect agent will generate tailored multiple-choice challenges targeting your selected role ({learner.target_role || 'General Engineering'}). Questions assess genuine boundary conditions and systems reasoning.
                </p>
              </div>
              <Button
                variant="primary"
                size="lg"
                onClick={handleGenerate}
                className="gap-2 cursor-pointer shadow-xs"
              >
                <Sparkles className="h-4 w-4" />
                <span>Begin Assessment Architecture</span>
              </Button>
            </div>
          )}

          {/* STATE 2: Loading / Generating with AI */}
          {isLoading && !assessmentResult && (
            <div className="rounded-xl border border-[#E5E7EB] dark:border-[#222222] bg-white dark:bg-[#0A0A0A] p-12 text-center space-y-6 shadow-xs">
              <Loader2 className="h-10 w-10 text-[#7C3AED] dark:text-[#A78BFA] animate-spin mx-auto" />
              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-lg font-semibold text-[#111827] dark:text-[#FAFAFA]">
                  Constructing Targeted Assessment
                </h3>
                <p className="text-xs text-[#6B7280] dark:text-[#A3A3A3] leading-relaxed">
                  Calling backend AI architect models. Synthesizing boundary conditions, algorithmic questions, and evaluation metrics for {learner.target_role}...
                </p>
              </div>
            </div>
          )}

          {/* STATE 3: Assessment Result Display (Graded) */}
          {assessmentResult && (
            <div className="space-y-6">
              {/* Score Header Card */}
              <div className="rounded-xl border border-[#E5E7EB] dark:border-[#222222] bg-white dark:bg-[#0A0A0A] p-6 sm:p-8 space-y-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E5E7EB] dark:border-[#222222]">
                  <div className="space-y-1">
                    <span className="text-xs font-mono uppercase text-[#7C3AED] dark:text-[#A78BFA]">
                      Assessment Complete
                    </span>
                    <h2 className="text-2xl font-bold text-[#111827] dark:text-[#FAFAFA]">
                      Audited Competency Evaluation
                    </h2>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl sm:text-4xl font-mono font-bold text-[#7C3AED] dark:text-[#A78BFA]">
                      {Math.round(assessmentResult.score)}%
                    </div>
                    <div className="text-xs text-[#6B7280] dark:text-[#888888]">
                      {assessmentResult.correct} of {assessmentResult.total} Correct
                    </div>
                  </div>
                </div>

                {assessmentResult.evidence_note && (
                  <div className="p-4 rounded-xl bg-[#FAFAFA] dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#222222] text-xs leading-relaxed text-[#6B7280] dark:text-[#A3A3A3] space-y-1">
                    <strong className="text-[#111827] dark:text-[#FAFAFA] block">Provenance & Scope Note:</strong>
                    <span>{assessmentResult.evidence_note}</span>
                  </div>
                )}

                {/* Skill Breakdown */}
                {assessmentResult.skill_scores && (
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[#111827] dark:text-[#FAFAFA]">
                      Skill Scores by Topic
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Object.entries(assessmentResult.skill_scores).map(([skill, score]) => (
                        <div
                          key={skill}
                          className="flex items-center justify-between p-3.5 rounded-lg border border-[#E5E7EB] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#070707]"
                        >
                          <span className="text-xs font-medium text-[#111827] dark:text-[#FAFAFA]">
                            {skill}
                          </span>
                          <span className="text-xs font-mono font-semibold text-[#7C3AED] dark:text-[#A78BFA]">
                            {Math.round(score)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Explanations */}
                {assessmentResult.explanations && assessmentResult.explanations.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-[#E5E7EB] dark:border-[#222222]">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[#111827] dark:text-[#FAFAFA]">
                      Question Feedback & Explanations
                    </h4>
                    <div className="space-y-3">
                      {assessmentResult.explanations.map((exp, idx) => (
                        <div
                          key={idx}
                          className={`p-4 rounded-xl border text-xs space-y-2 ${
                            exp.is_correct
                              ? 'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/10'
                              : 'border-red-500/30 bg-red-500/5 dark:bg-red-950/10'
                          }`}
                        >
                          <div className="flex items-center justify-between font-medium">
                            <span className="text-[#111827] dark:text-[#FAFAFA]">Question #{idx + 1}</span>
                            <Badge variant={exp.is_correct ? 'success' : 'outline'} className="text-[11px]">
                              {exp.is_correct ? 'Correct' : 'Needs Review'}
                            </Badge>
                          </div>
                          <p className="text-[#4B5563] dark:text-[#A3A3A3] leading-relaxed">
                            {exp.explanation}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-[#E5E7EB] dark:border-[#222222]">
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={handleGenerate}
                    className="w-full sm:w-auto gap-2 cursor-pointer"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Retake Assessment</span>
                  </Button>

                  <NavLink to="/career" className="w-full sm:w-auto">
                    <Button variant="primary" size="md" className="w-full sm:w-auto gap-2 cursor-pointer shadow-xs">
                      <span>View Adaptive Roadmap</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </NavLink>
                </div>
              </div>
            </div>
          )}

          {/* STATE 4: Active Question Flow (Unsubmitted) */}
          {assessment && !assessmentResult && currentQuestion && (
            <div className="rounded-xl border border-[#E5E7EB] dark:border-[#222222] bg-white dark:bg-[#0A0A0A] p-6 sm:p-8 space-y-6 shadow-xs">
              {/* Question Stepper Indicator */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#6B7280] dark:text-[#888888] pb-4 border-b border-[#E5E7EB] dark:border-[#222222]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-[#111827] dark:text-[#FAFAFA]">
                    Question {activeQuestionIndex + 1} of {questions.length}
                  </span>
                  <Badge variant="outline" className="text-[11px] uppercase">
                    {currentQuestion.skill}
                  </Badge>
                  <Badge variant="accent" className="text-[11px] capitalize">
                    {currentQuestion.difficulty}
                  </Badge>
                </div>

                <div className="flex items-center gap-1.5 font-mono">
                  {questions.map((q, idx) => {
                    const isAnswered = selectedAnswers[q.id] !== undefined;
                    const isActive = activeQuestionIndex === idx;
                    return (
                      <button
                        key={q.id}
                        onClick={() => setActiveQuestionIndex(idx)}
                        className={`h-7 w-7 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                          isActive
                            ? 'bg-[#7C3AED] dark:bg-[#8B5CF6] text-white shadow-xs'
                            : isAnswered
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                            : 'bg-[#FAFAFA] dark:bg-[#161616] text-[#6B7280] dark:text-[#A3A3A3] border border-[#E5E7EB] dark:border-[#262626] hover:border-[#D1D5DB]'
                        }`}
                        title={`Question ${idx + 1}: ${isAnswered ? 'Answered' : 'Unanswered'}`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Question Prompt */}
              <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-medium text-[#111827] dark:text-[#FAFAFA] leading-relaxed">
                  {currentQuestion.prompt}
                </h3>

                {/* Multiple Choice Options */}
                <div className="space-y-3 pt-2">
                  {currentQuestion.options.map((option, optIdx) => {
                    const isSelected = selectedAnswers[currentQuestion.id] === optIdx;
                    return (
                      <label
                        key={optIdx}
                        className={`flex items-start gap-3.5 p-4 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#7C3AED] dark:border-[#8B5CF6] bg-[#7C3AED]/5 dark:bg-[#8B5CF6]/10 shadow-xs'
                            : 'border-[#E5E7EB] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#070707] hover:border-[#D1D5DB] dark:hover:border-[#333333]'
                        }`}
                      >
                        <input type="radio" name={currentQuestion.id} value={optIdx} checked={isSelected} onChange={() => handleSelectOption(currentQuestion.id, optIdx)} className="sr-only" />
                        <div
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs mt-0.5 font-medium transition-colors ${
                            isSelected
                              ? 'border-[#7C3AED] dark:border-[#8B5CF6] bg-[#7C3AED] dark:bg-[#8B5CF6] text-white'
                              : 'border-[#D1D5DB] dark:border-[#333333] text-[#6B7280]'
                          }`}
                        >
                          {String.fromCharCode(65 + optIdx)}
                        </div>
                        <span className="text-sm text-[#111827] dark:text-[#FAFAFA] leading-relaxed">
                          {option}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Navigation Actions */}
              <div className="flex items-center justify-between pt-6 border-t border-[#E5E7EB] dark:border-[#222222]">
                <Button
                  variant="secondary"
                  size="md"
                  disabled={activeQuestionIndex === 0}
                  onClick={() => setActiveQuestionIndex((prev) => prev - 1)}
                  className="cursor-pointer"
                >
                  Previous Question
                </Button>

                {activeQuestionIndex < questions.length - 1 ? (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => setActiveQuestionIndex((prev) => prev + 1)}
                    className="cursor-pointer"
                  >
                    Next Question
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleSubmit}
                    disabled={!allAnswered || isSubmitting}
                    className="cursor-pointer gap-2 shadow-xs"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        <span>Submit All Answers</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Code Sandbox / Monaco Editor (Toggled or Side-by-Side) */}
        {showSandbox && (
          <div className="lg:col-span-5 flex flex-col rounded-xl border border-[#E5E7EB] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#070707] overflow-hidden shadow-xs h-[650px]">
            {/* Editor Header Bar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#E5E7EB] dark:border-[#222222] bg-white dark:bg-[#050505]">
              <div className="flex items-center gap-2">
                <FileCode2 className="h-4 w-4 text-[#7C3AED] dark:text-[#A78BFA]" />
                <span className="text-xs font-mono font-semibold text-[#111827] dark:text-[#FAFAFA]">
                  Code scratchpad (not executed)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <select aria-label="Scratchpad language"
                  value={sandboxLanguage}
                  onChange={(e) => setSandboxLanguage(e.target.value as 'typescript' | 'python')}
                  className="h-8 pl-2 pr-6 rounded-md border border-[#E5E7EB] dark:border-[#262626] bg-[#FAFAFA] dark:bg-[#111111] text-xs font-mono text-[#111827] dark:text-[#FAFAFA] cursor-pointer"
                >
                  <option value="python">Python 3</option>
                  <option value="typescript">TypeScript</option>
                </select>

                <button
                  onClick={() => setSandboxCode('')}
                  title="Clear editor"
                  className="text-xs text-[#6B7280] dark:text-[#888888] hover:text-[#111827] dark:hover:text-[#FAFAFA] p-1 cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Monaco Editor Component with Dynamic Light / Dark Theme Adaptation */}
            <div className="flex-1 w-full h-full min-h-[350px]">
              <Editor
                height="100%"
                language={sandboxLanguage}
                theme={actualTheme === 'dark' ? 'vs-dark' : 'light'}
                value={sandboxCode}
                onChange={(val) => setSandboxCode(val || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono', monospace",
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
