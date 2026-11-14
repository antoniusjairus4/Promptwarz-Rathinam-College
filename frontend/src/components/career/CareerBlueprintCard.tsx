import React, { useState } from 'react';
import { Compass, Sparkles, Loader2, AlertCircle, Layers } from 'lucide-react';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useLearner } from '@/context/LearnerContext';
import type { BlueprintSkill } from '@/types';

export const CareerBlueprintCard: React.FC = () => {
  const { learner, blueprint, generateBlueprint, isLoading } = useLearner();
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      await generateBlueprint();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Blueprint generation failed';
      setErrorMsg(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!learner) return null;

  return (
    <Card className="p-6 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB] dark:border-[#222222]">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7C3AED]/10 text-[#7C3AED] dark:text-[#A78BFA]">
              <Compass className="h-4 w-4" />
            </div>
            <CardTitle className="text-xl font-semibold">AI Career Blueprint</CardTitle>
            <Badge variant="outline" className="text-xs uppercase font-mono">
              Career Architect
            </Badge>
          </div>
          <CardDescription className="text-sm">
            Architectural competency decomposition for {learner.target_role || 'your technical pathway'}
          </CardDescription>
        </div>

        {!blueprint && (
          <Button
            size="md"
            variant="primary"
            onClick={handleGenerate}
            disabled={isGenerating || isLoading}
            className="gap-2 text-xs shadow-xs cursor-pointer shrink-0"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Synthesizing Blueprint...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>Generate Blueprint</span>
              </>
            )}
          </Button>
        )}
      </div>

      {errorMsg && (
        <div role="alert" className="p-3.5 rounded-lg border border-red-500/30 bg-red-500/10 text-xs text-red-600 dark:text-red-400 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold">Blueprint Notice:</span>
            <p>{errorMsg}</p>
          </div>
        </div>
      )}

      {/* When blueprint exists */}
      {blueprint ? (
        <div className="space-y-6">
          <div className="p-4 rounded-xl border border-[#E5E7EB] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#070707] space-y-2">
            <div className="flex items-center justify-between text-xs text-[#6B7280] dark:text-[#888888] font-mono">
              <span>Goal: {blueprint.target_role}</span>
              {blueprint.provider && (
                <span>Engine: {blueprint.provider} / {blueprint.model || 'llm'}</span>
              )}
            </div>
            <p className="text-sm text-[#111827] dark:text-[#FAFAFA] leading-relaxed">
              {blueprint.rationale}
            </p>
          </div>

          {/* Skill Breakdown */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#111827] dark:text-[#FAFAFA]">
                Target Competencies ({blueprint.skills.length})
              </h4>
              <span className="text-xs text-[#6B7280] dark:text-[#888888]">
                AI-suggested learning priorities
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {blueprint.skills.map((skill: BlueprintSkill, idx: number) => {
                const isCore = skill.priority === 'core';
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-lg border border-[#E5E7EB] dark:border-[#222222] bg-white dark:bg-[#0A0A0A] space-y-2.5 transition-colors hover:border-[#D1D5DB] dark:hover:border-[#333333]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#111827] dark:text-[#FAFAFA]">
                          {skill.name}
                        </span>
                        <Badge
                          variant={isCore ? 'accent' : 'outline'}
                          className="text-[10px] uppercase"
                        >
                          {skill.priority}
                        </Badge>
                      </div>
                      <Badge variant="default" className="text-[10px] capitalize">
                        {skill.difficulty}
                      </Badge>
                    </div>

                    <p className="text-xs text-[#6B7280] dark:text-[#A3A3A3] leading-relaxed">
                      {skill.rationale}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="py-8 text-center space-y-3">
          <Layers className="h-9 w-9 text-[#6B7280] dark:text-[#A3A3A3] mx-auto" />
          <p className="text-sm text-[#6B7280] dark:text-[#A3A3A3] max-w-md mx-auto">
            Click "Generate Blueprint" to have the Career Architect decompose your target role into suggested core and supporting skills.
          </p>
        </div>
      )}
    </Card>
  );
};
