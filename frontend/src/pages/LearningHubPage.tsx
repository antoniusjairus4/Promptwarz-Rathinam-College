import React from 'react';
import { BookOpen, ExternalLink, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';

export const LearningHubPage: React.FC = () => {
  const modules: {
    id: string;
    title: string;
    category: string;
    difficulty: string;
    estHours: number;
    description: string;
  }[] = [];

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E5E5E5] dark:border-[#222222] pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-[#7C3AED] dark:text-[#8B5CF6]">
              Curriculum & Projects
            </span>
            <Badge variant="outline" className="text-xs">
              Curated Catalog
            </Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#171717] dark:text-[#FAFAFA]">
            Learning Hub
          </h1>
          <p className="text-base text-[#737373] dark:text-[#A3A3A3] max-w-2xl leading-relaxed">
            Targeted learning units, documentation benchmarks, and hands-on portfolio projects matched to your assessed technical gaps.
          </p>
        </div>
      </div>

      {/* Main Content */}
      {modules.length === 0 ? (
        <Card className="p-4">
          <CardContent className="pt-6">
            <EmptyState
              icon={BookOpen}
              title="No Learning Modules Active"
              description="Modules are dynamically recommended by the Learning Curator agent based on the highest priority gaps identified in your Skill DNA. Connects to backend /api/v1/learning/resources."
            >
              <div className="mt-4 flex items-center gap-2 text-xs font-mono text-[#8C8C8C] dark:text-[#555555]">
                <Sparkles className="h-4 w-4 text-[#7C3AED] dark:text-[#8B5CF6]" />
                <span>Connected to backend module recommendation orchestrator</span>
              </div>
            </EmptyState>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((m) => (
            <Card key={m.id} className="hover:border-[#D4D4D4] dark:hover:border-[#333333] transition-colors p-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge variant="default">{m.category}</Badge>
                  <span className="text-xs font-mono text-[#8C8C8C] dark:text-[#666666]">
                    {m.estHours}h
                  </span>
                </div>
                <CardTitle className="text-lg mt-3">{m.title}</CardTitle>
                <CardDescription className="text-sm mt-1">{m.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1.5 text-xs font-medium text-[#7C3AED] dark:text-[#8B5CF6] hover:underline cursor-pointer">
                  <span>View Syllabus</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
