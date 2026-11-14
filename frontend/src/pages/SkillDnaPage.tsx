import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  GitBranch,
  Star,
  GitFork,
  FileCode,
  ShieldAlert,
  ShieldCheck,
  Loader2,
  ExternalLink,
  Layers,
  Terminal,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { api, ApiClientError } from '@/services/api';
import { useLearner } from '@/context/LearnerContext';
import { useTheme } from '@/context/ThemeContext';
import type { RepositoryResponse, SourceFile } from '@/types';

export const SkillDnaPage: React.FC = () => {
  const { learner, assessmentResult } = useLearner();
  const { actualTheme } = useTheme();

  // GitHub input state
  const [repoInput, setRepoInput] = useState('psf/requests');
  const [pathsInput, setPathsInput] = useState('README.md');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [repoData, setRepoData] = useState<RepositoryResponse | null>(null);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Parse GitHub owner & repo from input (supports "owner/repo" or "https://github.com/owner/repo")
  const parseRepo = (input: string): { owner: string; repo: string } | null => {
    const trimmed = input.trim().replace(/\/+$/, '');
    const urlMatch = trimmed.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (urlMatch) {
      return { owner: urlMatch[1], repo: urlMatch[2].replace(/\.git$/, '') };
    }
    const slashParts = trimmed.split('/');
    if (slashParts.length === 2 && slashParts[0] && slashParts[1]) {
      return { owner: slashParts[0], repo: slashParts[1].replace(/\.git$/, '') };
    }
    return null;
  };

  const handleAnalyze = async () => {
    const parsed = parseRepo(repoInput);
    if (!parsed) {
      setErrorMessage('Please enter a valid GitHub repository in "owner/repo" format (e.g. psf/requests).');
      return;
    }

    const paths = pathsInput
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
      .slice(0, 3); // Max 3 paths per backend contract

    setIsAnalyzing(true);
    setErrorMessage(null);
    try {
      const res = await api.analyzeGithub(parsed.owner, parsed.repo, paths);
      setRepoData(res);
      setSelectedFileIndex(0);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to analyze repository.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const selectedFile: SourceFile | undefined = repoData?.files?.[selectedFileIndex];

  // Helper to determine Monaco language from file extension
  const getFileLanguage = (path: string): string => {
    if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript';
    if (path.endsWith('.js') || path.endsWith('.jsx')) return 'javascript';
    if (path.endsWith('.py')) return 'python';
    if (path.endsWith('.json')) return 'json';
    if (path.endsWith('.md')) return 'markdown';
    if (path.endsWith('.html')) return 'html';
    if (path.endsWith('.css')) return 'css';
    if (path.endsWith('.yml') || path.endsWith('.yaml')) return 'yaml';
    return 'plaintext';
  };

  const verifiedSkills = learner?.skills || [];
  const quizVerifications = assessmentResult?.quiz_verification || [];

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E5E5E5] dark:border-[#222222] pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-[#7C3AED] dark:text-[#8B5CF6]">
              Competency Matrix & DNA
            </span>
            <Badge variant="outline" className="text-xs">
              Verified Evidence
            </Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#171717] dark:text-[#FAFAFA]">
            Skill DNA & Repository Evidence
          </h1>
          <p className="text-base text-[#737373] dark:text-[#A3A3A3] max-w-2xl leading-relaxed">
            Multi-vector representation of your audited technical capabilities evaluated against authentic repository code and hands-on assessments.
          </p>
        </div>

        <NavLink to="/arena">
          <Button variant="primary" size="md" className="gap-2 shadow-xs cursor-pointer">
            <Terminal className="h-4 w-4" />
            <span>Verify in Skill Arena</span>
          </Button>
        </NavLink>
      </div>

      {/* SECTION 1: GitHub Repository Evidence Inspector */}
      <Card className="p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <GitBranch className="h-5 w-5 text-[#7C3AED] dark:text-[#8B5CF6]" />
              <CardTitle className="text-lg font-semibold">GitHub Repository Analysis</CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm">
              Inspect public repositories for detectable technology stacks and inspect source files.
            </CardDescription>
          </div>
          <span className="text-xs font-mono text-[#8C8C8C] dark:text-[#666666]">
            API v1 /integrations/github
          </span>
        </div>

        {/* Input Form */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-6 space-y-1.5">
            <label className="text-xs font-medium text-[#666666] dark:text-[#A3A3A3]">
              GitHub Public Repository (owner/repo)
            </label>
            <input
              type="text"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              placeholder="e.g. psf/requests, facebook/react, octocat/Hello-World"
              className="w-full h-10 rounded-md border border-[#E5E5E5] dark:border-[#262626] bg-white dark:bg-[#050505] px-3.5 text-xs sm:text-sm font-mono text-[#171717] dark:text-[#FAFAFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]/50"
            />
          </div>

          <div className="sm:col-span-4 space-y-1.5">
            <label className="text-xs font-medium text-[#666666] dark:text-[#A3A3A3]">
              Files to Inspect (max 3, comma-separated)
            </label>
            <input
              type="text"
              value={pathsInput}
              onChange={(e) => setPathsInput(e.target.value)}
              placeholder="e.g. README.md, package.json"
              className="w-full h-10 rounded-md border border-[#E5E5E5] dark:border-[#262626] bg-white dark:bg-[#050505] px-3.5 text-xs sm:text-sm font-mono text-[#171717] dark:text-[#FAFAFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]/50"
            />
          </div>

          <div className="sm:col-span-2 flex items-end">
            <Button
              variant="primary"
              size="md"
              onClick={handleAnalyze}
              disabled={isAnalyzing || !repoInput.trim()}
              className="w-full h-10 gap-2 cursor-pointer shadow-xs"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Inspecting...</span>
                </>
              ) : (
                <>
                  <GitBranch className="h-4 w-4" />
                  <span>Analyze</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/10 text-xs sm:text-sm text-red-600 dark:text-red-400 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold">Analysis Failed</span>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Display Analyzed Repository Data */}
        {repoData && repoData.repository && (
          <div className="space-y-6 pt-4 border-t border-[#E5E5E5] dark:border-[#222222]">
            {/* Repository Fact Card */}
            <div className="rounded-xl border border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#080808] p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <a
                    href={repoData.repository.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-lg font-bold text-[#171717] dark:text-[#FAFAFA] hover:text-[#7C3AED] dark:hover:text-[#8B5CF6] inline-flex items-center gap-1.5 transition-colors"
                  >
                    <span>{repoData.repository.full_name}</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  {repoData.repository.language && (
                    <Badge variant="outline" className="text-xs">
                      {repoData.repository.language}
                    </Badge>
                  )}
                  {repoData.repository.license && (
                    <Badge variant="default" className="text-xs">
                      {repoData.repository.license}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs font-mono text-[#737373] dark:text-[#888888]">
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-amber-500" />
                    {repoData.repository.stars.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <GitFork className="h-3.5 w-3.5 text-[#8C8C8C]" />
                    {repoData.repository.forks.toLocaleString()}
                  </span>
                  <span>branch: {repoData.repository.default_branch}</span>
                </div>
              </div>

              {repoData.repository.description && (
                <p className="text-sm text-[#737373] dark:text-[#A3A3A3] leading-relaxed">
                  {repoData.repository.description}
                </p>
              )}

              {/* Evidence Scope Notice */}
              <div className="p-3.5 rounded-lg border border-[#E5E5E5] dark:border-[#222222] bg-white dark:bg-[#0F0F0F] text-xs text-[#737373] dark:text-[#888888] flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-[#7C3AED] dark:text-[#8B5CF6] shrink-0 mt-0.5" />
                <span>
                  <strong>Evidence Integrity:</strong> {repoData.repository.evidence_note || 'Repository metadata represents public factual records. Repository evidence supports technical exposure but does not replace verified assessment proofs.'}
                </span>
              </div>
            </div>

            {/* Provider Rate-Limit Notice if applicable */}
            {repoData.providers?.some((p) => p.status === 'rate_limited') && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>
                  GitHub API rate limit reached for unauthenticated requests from this host. Showing available cached metadata and test fixtures.
                </span>
              </div>
            )}

            {/* Source Files Inspector with Monaco Editor */}
            {repoData.files && repoData.files.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#171717] dark:text-[#FAFAFA]">
                    Inspect Supporting Source Files
                  </h4>
                  <span className="text-xs text-[#737373] dark:text-[#888888]">
                    {repoData.files.length} file(s) fetched
                  </span>
                </div>

                {/* File Tabs */}
                <div className="flex items-center gap-2 border-b border-[#E5E5E5] dark:border-[#222222] overflow-x-auto pb-1">
                  {repoData.files.map((file, idx) => (
                    <button
                      key={file.path}
                      onClick={() => setSelectedFileIndex(idx)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-t-md text-xs font-mono transition-colors cursor-pointer ${
                        selectedFileIndex === idx
                          ? 'bg-[#EFEFEF] dark:bg-[#1A1A1A] text-[#171717] dark:text-[#FAFAFA] font-medium border-t-2 border-[#7C3AED] dark:border-[#8B5CF6]'
                          : 'text-[#737373] dark:text-[#888888] hover:text-[#171717] dark:hover:text-[#FAFAFA]'
                      }`}
                    >
                      <FileCode className="h-3.5 w-3.5 text-[#7C3AED] dark:text-[#8B5CF6]" />
                      <span>{file.path}</span>
                      <span className="text-[10px] text-[#8C8C8C]">({file.status})</span>
                    </button>
                  ))}
                </div>

                {/* Active File Monaco Viewer */}
                {selectedFile && (
                  <div className="rounded-xl border border-[#E5E5E5] dark:border-[#222222] overflow-hidden bg-white dark:bg-[#0A0A0A]">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#050505] text-xs">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[#171717] dark:text-[#FAFAFA]">
                          {selectedFile.path}
                        </span>
                        {selectedFile.sha && (
                          <span className="font-mono text-[11px] text-[#8C8C8C] dark:text-[#666666]">
                            blob: {selectedFile.sha.slice(0, 7)}
                          </span>
                        )}
                      </div>
                      {selectedFile.url && (
                        <a
                          href={selectedFile.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#7C3AED] dark:text-[#8B5CF6] hover:underline inline-flex items-center gap-1"
                        >
                          <span>View on GitHub</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>

                    <div className="h-[400px] w-full">
                      {selectedFile.content ? (
                        <Editor
                          height="100%"
                          language={getFileLanguage(selectedFile.path)}
                          theme={actualTheme === 'dark' ? 'vs-dark' : 'light'}
                          value={selectedFile.content}
                          options={{
                            readOnly: true,
                            minimap: { enabled: false },
                            fontSize: 12,
                            fontFamily: "'JetBrains Mono', monospace",
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                          }}
                        />
                      ) : (
                        <div className="h-full flex items-center justify-center p-8 text-center text-xs text-[#737373] dark:text-[#888888]">
                          {selectedFile.detail || 'File content unavailable or empty.'}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* SECTION 2: Verified Competency Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8">
          <Card className="p-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Audited Competency Vector</CardTitle>
              <CardDescription>
                Verified skills proven through hands-on challenges or code assessment
              </CardDescription>
            </CardHeader>
            <CardContent>
              {quizVerifications.length > 0 ? (
                <div className="space-y-3">
                  {quizVerifications.map((qv, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 rounded-lg border border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#080808]"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <div>
                          <span className="text-sm font-semibold text-[#171717] dark:text-[#FAFAFA] block">
                            {qv.skill}
                          </span>
                          <span className="text-xs text-[#737373] dark:text-[#888888]">
                            Scope: {qv.evidence_scope}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-semibold text-[#7C3AED] dark:text-[#8B5CF6]">
                          {Math.round(qv.score * 100)}%
                        </span>
                        <Badge variant={qv.passed ? 'success' : 'outline'} className="text-[11px]">
                          {qv.passed ? 'Verified' : 'Unverified'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : verifiedSkills.length > 0 ? (
                <div className="space-y-3">
                  {verifiedSkills.map((sk, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 rounded-lg border border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#080808]"
                    >
                      <div>
                        <span className="text-sm font-semibold text-[#171717] dark:text-[#FAFAFA] block">
                          {sk.skill}
                        </span>
                        <span className="text-xs text-[#737373] dark:text-[#888888]">
                          Provenance: {sk.provenance} • {sk.note}
                        </span>
                      </div>
                      <Badge variant={sk.verified ? 'success' : 'default'} className="text-[11px]">
                        {sk.verified ? 'Verified' : 'Self-Reported'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center space-y-4">
                  <Layers className="h-10 w-10 text-[#8C8C8C] dark:text-[#555555] mx-auto" />
                  <div className="space-y-1 max-w-md mx-auto">
                    <h3 className="text-sm font-semibold text-[#171717] dark:text-[#FAFAFA]">
                      No Audited Competencies Yet
                    </h3>
                    <p className="text-xs text-[#737373] dark:text-[#A3A3A3]">
                      Take an assessment in Skill Arena or complete roadmap steps to add verified competencies to your Skill DNA matrix.
                    </p>
                  </div>
                  <NavLink to="/arena">
                    <Button variant="primary" size="md" className="gap-2 cursor-pointer shadow-xs">
                      <Terminal className="h-4 w-4" />
                      <span>Take Assessment in Arena</span>
                    </Button>
                  </NavLink>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Info Sidebar */}
        <div className="lg:col-span-4 space-y-5">
          <div className="rounded-xl border border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#0A0A0A] p-6 space-y-2.5">
            <h3 className="text-sm font-semibold text-[#171717] dark:text-[#FAFAFA]">
              Auditing Methodology
            </h3>
            <p className="text-xs text-[#737373] dark:text-[#A3A3A3] leading-relaxed">
              Maximus evaluates technical competency against reproducible assessment observations and immutable repository evidence. No artificial skills or inflated ratings are ever created.
            </p>
          </div>

          <div className="rounded-xl border border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#0A0A0A] p-6 space-y-2.5">
            <h3 className="text-sm font-semibold text-[#171717] dark:text-[#FAFAFA]">
              Target Role Benchmark
            </h3>
            <p className="text-xs text-[#737373] dark:text-[#A3A3A3] leading-relaxed">
              Target: <strong className="text-[#171717] dark:text-[#FAFAFA]">{learner?.target_role || 'Uncalibrated'}</strong>
            </p>
            <NavLink
              to="/onboarding"
              className="text-xs font-medium text-[#7C3AED] dark:text-[#8B5CF6] hover:underline inline-flex items-center gap-1.5 pt-1"
            >
              Re-calibrate Target Role →
            </NavLink>
          </div>
        </div>
      </div>
    </div>
  );
};
