import React, { useState } from 'react';
import {
  Terminal,
  Play,
  CheckCircle,
  Clock,
  RotateCcw,
  ChevronDown,
  FileCode2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export const SkillArenaPage: React.FC = () => {
  const [language, setLanguage] = useState<'typescript' | 'python'>('typescript');
  const [activeTab, setActiveTab] = useState<'problem' | 'constraints' | 'provenance'>('problem');
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testOutput, setTestOutput] = useState<string | null>(null);

  // Default challenge state
  const challenge = {
    title: 'Distributed Rate Limiter Implementation',
    difficulty: 'Advanced',
    category: 'Systems Architecture',
    timeLimitMinutes: 45,
    description: `Implement a token-bucket rate limiter suitable for a distributed multi-tenant API gateway. Your implementation must guarantee thread-safety and handle high concurrency without starving client requests.

The rate limiter must accurately replenish tokens based on elapsed wall-clock time and reject incoming requests when the bucket capacity is exhausted.`,
    examples: [
      {
        input: 'capacity = 10, refillRate = 2.0 (tokens/sec), requests = 12',
        output: '10 requests granted, 2 requests rejected (HTTP 429)',
        explanation: 'Initial burst accepts 10 tokens. Next 2 requests are denied until tokens refill.',
      },
    ],
    constraints: [
      'Refill rate must use monotonic timestamps to prevent clock skew issues.',
      'Refill computations must be strictly O(1) in time complexity.',
      'Memory consumption per tenant must remain bounded under 1 KiB.',
      'Must pass both single-threaded unit tests and 50-thread concurrent benchmark suites.',
    ],
  };

  const handleRunTests = () => {
    setIsRunningTests(true);
    setTestOutput('Dispatching code to sandboxed test runner...\nRunning Suite: Unit Tests (3/3)\nRunning Suite: Concurrency Benchmarks (50 threads)...\n\n✓ Test 1: Initial capacity burst (PASSED in 4ms)\n✓ Test 2: Monotonic refill replenishment (PASSED in 12ms)\n✓ Test 3: Thread-safety race condition check (PASSED in 28ms)\n\nAll test suites passed. Ready for submission.');
    setTimeout(() => {
      setIsRunningTests(false);
    }, 1200);
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-4">
      {/* Top Workspace Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E5E5E5] dark:border-[#222222] pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#171717] dark:text-[#FAFAFA]">
              {challenge.title}
            </h1>
            <Badge variant="accent" className="text-xs">
              {challenge.difficulty}
            </Badge>
            <Badge variant="outline" className="text-xs hidden sm:inline-flex">
              {challenge.category}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-xs sm:text-sm text-[#737373] dark:text-[#888888]">
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="h-4 w-4 text-[#7C3AED] dark:text-[#8B5CF6]" />
              Time Allocation: {challenge.timeLimitMinutes} minutes
            </span>
            <span>•</span>
            <span>Target: Verified Skill Badge</span>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Language selector */}
          <div className="relative">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'typescript' | 'python')}
              className="appearance-none h-10 pl-3 pr-8 rounded-md border border-[#E5E5E5] dark:border-[#262626] bg-[#FAFAFA] dark:bg-[#111111] text-xs font-mono font-medium text-[#171717] dark:text-[#FAFAFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]/50 cursor-pointer"
            >
              <option value="typescript">TypeScript 5.7</option>
              <option value="python">Python 3.12</option>
            </select>
            <ChevronDown className="h-3.5 w-3.5 absolute right-2.5 top-3.5 pointer-events-none text-[#737373] dark:text-[#888888]" />
          </div>

          <Button
            size="md"
            variant="secondary"
            onClick={handleRunTests}
            isLoading={isRunningTests}
            className="gap-2 h-10 px-4 text-xs font-medium"
          >
            <Play className="h-3.5 w-3.5" />
            <span>Run Tests</span>
          </Button>

          <Button
            size="md"
            variant="primary"
            className="gap-2 h-10 px-5 text-xs font-medium shadow-xs"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            <span>Submit Assessment</span>
          </Button>
        </div>
      </div>

      {/* Main Workspace: 40% Left Brief / 60% Right Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-170px)] min-h-[620px]">
        {/* LEFT COLUMN: Specification, Constraints & Tests (40% width) */}
        <div className="lg:col-span-5 flex flex-col rounded-xl border border-[#E5E5E5] dark:border-[#222222] bg-white dark:bg-[#0A0A0A] overflow-hidden shadow-xs">
          {/* Sub-tabs */}
          <div className="flex items-center border-b border-[#E5E5E5] dark:border-[#222222] px-4 bg-[#FAFAFA] dark:bg-[#070707] text-xs font-medium">
            <button
              onClick={() => setActiveTab('problem')}
              className={`py-3 px-3.5 border-b-2 transition-colors ${
                activeTab === 'problem'
                  ? 'border-[#7C3AED] dark:border-[#8B5CF6] text-[#171717] dark:text-[#FAFAFA]'
                  : 'border-transparent text-[#737373] dark:text-[#888888] hover:text-[#171717] dark:hover:text-[#FAFAFA]'
              }`}
            >
              Problem Specification
            </button>
            <button
              onClick={() => setActiveTab('constraints')}
              className={`py-3 px-3.5 border-b-2 transition-colors ${
                activeTab === 'constraints'
                  ? 'border-[#7C3AED] dark:border-[#8B5CF6] text-[#171717] dark:text-[#FAFAFA]'
                  : 'border-transparent text-[#737373] dark:text-[#888888] hover:text-[#171717] dark:hover:text-[#FAFAFA]'
              }`}
            >
              Constraints & Examples
            </button>
            <button
              onClick={() => setActiveTab('provenance')}
              className={`py-3 px-3.5 border-b-2 transition-colors ${
                activeTab === 'provenance'
                  ? 'border-[#7C3AED] dark:border-[#8B5CF6] text-[#171717] dark:text-[#FAFAFA]'
                  : 'border-transparent text-[#737373] dark:text-[#888888] hover:text-[#171717] dark:hover:text-[#FAFAFA]'
              }`}
            >
              Proof Integrity
            </button>
          </div>

          {/* Viewport for description */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6 text-sm leading-relaxed text-[#525252] dark:text-[#B0B0B0]">
            {activeTab === 'problem' && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-[#171717] dark:text-[#FAFAFA]">
                    Challenge Brief
                  </h3>
                  <p className="whitespace-pre-line leading-relaxed text-sm">
                    {challenge.description}
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-[#E5E5E5] dark:border-[#222222]">
                  <h4 className="text-sm font-semibold text-[#171717] dark:text-[#FAFAFA]">
                    Expected Interface
                  </h4>
                  <pre className="p-3.5 rounded-lg border border-[#E5E5E5] dark:border-[#222222] bg-[#F7F7F7] dark:bg-[#111111] font-mono text-xs text-[#171717] dark:text-[#FAFAFA] overflow-x-auto">
{language === 'typescript'
  ? `interface RateLimiter {
  allowRequest(tenantId: string, tokensRequested?: number): boolean;
  getAvailableTokens(tenantId: string): number;
  reset(tenantId: string): void;
}`
  : `class RateLimiter:
    def allow_request(self, tenant_id: str, tokens: int = 1) -> bool:
        pass
    def get_available_tokens(self, tenant_id: str) -> float:
        pass`}
                  </pre>
                </div>
              </div>
            )}

            {activeTab === 'constraints' && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-[#171717] dark:text-[#FAFAFA]">
                    Technical Constraints
                  </h3>
                  <ul className="space-y-2 list-disc list-inside text-sm">
                    {challenge.constraints.map((c, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-3 pt-3 border-t border-[#E5E5E5] dark:border-[#222222]">
                  <h4 className="text-sm font-semibold text-[#171717] dark:text-[#FAFAFA]">
                    Example Scenario
                  </h4>
                  {challenge.examples.map((ex, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-lg border border-[#E5E5E5] dark:border-[#222222] bg-[#F7F7F7] dark:bg-[#111111] space-y-2 text-xs"
                    >
                      <div>
                        <strong className="text-[#171717] dark:text-[#FAFAFA]">Input: </strong>
                        <span className="font-mono text-[#525252] dark:text-[#A3A3A3]">{ex.input}</span>
                      </div>
                      <div>
                        <strong className="text-[#171717] dark:text-[#FAFAFA]">Output: </strong>
                        <span className="font-mono text-[#525252] dark:text-[#A3A3A3]">{ex.output}</span>
                      </div>
                      <p className="text-[11px] text-[#737373] dark:text-[#888888] pt-1">
                        {ex.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'provenance' && (
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-[#171717] dark:text-[#FAFAFA]">
                  Audited Verification Process
                </h3>
                <p className="text-sm leading-relaxed">
                  Upon submission, your implementation is compiled and executed in a sandboxed runtime environment. Test outcomes are cryptographically hashed and attached to your learner profile as verifiable proof of technical competence.
                </p>
                <div className="p-4 rounded-lg border border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#111111] space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle className="h-4 w-4" />
                    <span>Isolated Sandbox Execution</span>
                  </div>
                  <p className="text-[#737373] dark:text-[#888888] leading-relaxed">
                    Arbitrary user code is safely executed inside an isolated container with bounded memory and CPU limits.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Code Editor & Execution Output Console (60% width) */}
        <div className="lg:col-span-7 flex flex-col rounded-xl border border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#070707] overflow-hidden shadow-xs">
          {/* Editor Header Bar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#E5E5E5] dark:border-[#222222] bg-white dark:bg-[#050505]">
            <div className="flex items-center gap-2.5">
              <FileCode2 className="h-4 w-4 text-[#7C3AED] dark:text-[#8B5CF6]" />
              <span className="text-xs font-mono font-semibold text-[#171717] dark:text-[#FAFAFA]">
                {language === 'typescript' ? 'solution.ts' : 'solution.py'}
              </span>
              <span className="text-[11px] font-mono text-[#8C8C8C] dark:text-[#666666]">
                • Active Buffer
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                title="Reset starter template"
                className="flex items-center gap-1 text-xs text-[#737373] dark:text-[#888888] hover:text-[#171717] dark:hover:text-[#FAFAFA] transition-colors p-1"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Monaco Editor Container Viewport (taking major vertical space) */}
          <div className="flex-1 p-5 bg-white dark:bg-[#0A0A0A] font-mono text-sm leading-relaxed text-[#171717] dark:text-[#E0E0E0] overflow-auto">
            <div className="p-4 rounded-lg border border-[#E5E5E5] dark:border-[#1E1E1E] bg-[#FAFAFA] dark:bg-[#0D0D0D] space-y-1.5 text-xs sm:text-[13px] leading-6">
              <p className="text-[#8C8C8C] dark:text-[#666666]">// Maximus Proof-of-Work Challenge: Distributed Rate Limiter</p>
              <p className="text-[#8C8C8C] dark:text-[#666666]">// Language: {language === 'typescript' ? 'TypeScript 5.7' : 'Python 3.12'}</p>
              <p className="text-[#7C3AED] dark:text-[#8B5CF6] pt-2">export class TokenBucketRateLimiter &#123;</p>
              <p className="pl-4 text-[#8C8C8C] dark:text-[#666666]">private readonly capacity: number;</p>
              <p className="pl-4 text-[#8C8C8C] dark:text-[#666666]">private readonly refillRatePerSec: number;</p>
              <p className="pl-4 text-[#8C8C8C] dark:text-[#666666]">private tokens: number;</p>
              <p className="pl-4 text-[#8C8C8C] dark:text-[#666666]">private lastRefillTimestamp: number;</p>
              <p className="pt-2 pl-4 text-[#7C3AED] dark:text-[#8B5CF6]">constructor(capacity: number, refillRatePerSec: number) &#123;</p>
              <p className="pl-8 text-[#171717] dark:text-[#FAFAFA]">this.capacity = capacity;</p>
              <p className="pl-8 text-[#171717] dark:text-[#FAFAFA]">this.refillRatePerSec = refillRatePerSec;</p>
              <p className="pl-8 text-[#171717] dark:text-[#FAFAFA]">this.tokens = capacity;</p>
              <p className="pl-8 text-[#171717] dark:text-[#FAFAFA]">this.lastRefillTimestamp = performance.now();</p>
              <p className="pl-4 text-[#7C3AED] dark:text-[#8B5CF6]">&#125;</p>
              <p className="pt-2 pl-4 text-[#7C3AED] dark:text-[#8B5CF6]">public allowRequest(tokensRequested = 1): boolean &#123;</p>
              <p className="pl-8 text-[#737373] dark:text-[#888888]">// TODO: calculate elapsed time and update available tokens</p>
              <p className="pl-8 text-[#171717] dark:text-[#FAFAFA]">if (this.tokens &gt;= tokensRequested) &#123;</p>
              <p className="pl-12 text-[#171717] dark:text-[#FAFAFA]">this.tokens -= tokensRequested;</p>
              <p className="pl-12 text-[#171717] dark:text-[#FAFAFA]">return true;</p>
              <p className="pl-8 text-[#171717] dark:text-[#FAFAFA]">&#125;</p>
              <p className="pl-8 text-[#171717] dark:text-[#FAFAFA]">return false;</p>
              <p className="pl-4 text-[#7C3AED] dark:text-[#8B5CF6]">&#125;</p>
              <p className="text-[#7C3AED] dark:text-[#8B5CF6]">&#125;</p>
            </div>
          </div>

          {/* Dedicated Execution Output Console */}
          <div className="h-44 border-t border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#050505] p-4 font-mono text-xs text-[#171717] dark:text-[#D4D4D4] flex flex-col justify-between shrink-0">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5] dark:border-[#1E1E1E]">
              <div className="flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5 text-[#7C3AED] dark:text-[#8B5CF6]" />
                <span className="font-semibold text-xs">Test Execution Console</span>
              </div>
              <span className="text-[11px] text-[#737373] dark:text-[#888888]">
                {testOutput ? 'Test run finished' : 'Idle • Click "Run Tests" to evaluate'}
              </span>
            </div>

            <div className="flex-1 pt-2 overflow-y-auto whitespace-pre-wrap leading-relaxed text-[12px] text-[#525252] dark:text-[#A3A3A3]">
              {testOutput ? (
                <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                  {testOutput}
                </span>
              ) : (
                <span className="text-[#8C8C8C] dark:text-[#666666]">
                  Awaiting test trigger. Sandboxed test runner evaluates boundary conditions, concurrency locks, and execution efficiency.
                </span>
              )}
            </div>

            <div className="pt-2 border-t border-[#E5E5E5] dark:border-[#1A1A1A] flex items-center justify-between text-[11px] text-[#8C8C8C] dark:text-[#666666]">
              <span>Memory Limit: 256MB</span>
              <span>Execution Timeout: 5000ms</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
