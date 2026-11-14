import React from 'react';
import { NavLink } from 'react-router-dom';
import { Layers, Terminal, ArrowUpRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';

export const SkillDnaPage: React.FC = () => {
  const verifiedCategories: { category: string; score: number; verified: boolean; benchmark: number }[] = [];

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E5E5E5] dark:border-[#222222] pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-[#7C3AED] dark:text-[#8B5CF6]">
              Competency Matrix
            </span>
            <Badge variant="outline" className="text-xs">
              Verified Evidence
            </Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#171717] dark:text-[#FAFAFA]">
            Skill DNA
          </h1>
          <p className="text-base text-[#737373] dark:text-[#A3A3A3] max-w-2xl leading-relaxed">
            Multi-vector representation of your audited technical capabilities evaluated against industry engineering requirements.
          </p>
        </div>

        <NavLink to="/arena">
          <Button variant="primary" size="md" className="gap-2 shadow-xs">
            <Terminal className="h-4 w-4" />
            <span>Verify New Competency</span>
          </Button>
        </NavLink>
      </div>

      {/* Main Content Layout */}
      {verifiedCategories.length === 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8">
            <Card className="p-4">
              <CardContent className="pt-6">
                <EmptyState
                  icon={Layers}
                  title="Skill DNA Profile Uncalibrated"
                  description="Your Skill DNA is generated exclusively from completed proof-of-work challenges in Skill Arena or analyzed repository evidence. No simulated or default skills are displayed."
                  actionLabel="Launch Assessment in Skill Arena"
                  onAction={() => {}}
                />
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-4 space-y-5">
            <div className="rounded-xl border border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#0A0A0A] p-6 space-y-2.5">
              <h3 className="text-sm font-semibold text-[#171717] dark:text-[#FAFAFA]">
                Auditing Methodology
              </h3>
              <p className="text-sm text-[#737373] dark:text-[#A3A3A3] leading-relaxed">
                Scores represent reproducible code execution, edge-case test pass rates, and architectural decisions tested in isolated containers.
              </p>
            </div>

            <div className="rounded-xl border border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#0A0A0A] p-6 space-y-2.5">
              <h3 className="text-sm font-semibold text-[#171717] dark:text-[#FAFAFA]">
                Target Benchmark
              </h3>
              <p className="text-sm text-[#737373] dark:text-[#A3A3A3] leading-relaxed">
                Configure an aspirational career target in Onboarding to compare your vector against market standards.
              </p>
              <NavLink
                to="/onboarding"
                className="text-xs sm:text-sm font-medium text-[#7C3AED] dark:text-[#8B5CF6] hover:underline inline-flex items-center gap-1.5 pt-1"
              >
                Set target career <ArrowUpRight className="h-3.5 w-3.5" />
              </NavLink>
            </div>
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Audited Competencies</CardTitle>
            <CardDescription>Breakdown by technical domain</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Populated state once API returns live categories */}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
