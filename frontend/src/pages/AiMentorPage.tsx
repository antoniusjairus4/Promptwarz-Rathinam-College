import React, { useState } from 'react';
import { Bot, Shield, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import type { MentorMessage } from '@/types';

export const AiMentorPage: React.FC = () => {
  const [messages] = useState<MentorMessage[]>([]);
  const [inputVal, setInputVal] = useState('');

  return (
    <div className="space-y-4 max-w-[1200px] mx-auto h-[calc(100vh-140px)] min-h-[550px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E5E5E5] dark:border-[#222222] pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#111111] text-[#171717] dark:text-[#FAFAFA] shadow-xs">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-semibold text-[#171717] dark:text-[#FAFAFA]">
                Adaptive Mentor
              </h1>
              <Badge variant="outline" className="text-xs">
                LangGraph Agent
              </Badge>
            </div>
            <p className="text-xs text-[#737373] dark:text-[#888888]">
              Context-aware career trajectory and code challenge coaching
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#737373] dark:text-[#888888]">
          <Shield className="h-4 w-4 text-emerald-500" />
          <span className="hidden sm:inline font-medium">Backend Relay Only</span>
        </div>
      </div>

      {/* Conversation Viewport */}
      <div className="flex-1 rounded-xl border border-[#E5E5E5] dark:border-[#222222] bg-white dark:bg-[#070707] p-6 overflow-y-auto flex flex-col justify-center shadow-xs">
        {messages.length === 0 ? (
          <EmptyState
            icon={Bot}
            title="Adaptive Mentor Session Ready"
            description="Discuss system tradeoffs, get architectural advice on learning units, or request guidance on challenge edge cases. Direct browser LLM calls are strictly prevented; sessions route through the backend agent orchestrator."
            className="border-none bg-transparent"
          >
            <div className="mt-6 flex flex-wrap justify-center gap-2.5">
              <button
                onClick={() => setInputVal('Analyze my priority technical gaps for my target role')}
                className="rounded-lg border border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#111111] px-3.5 py-1.5 text-xs text-[#525252] dark:text-[#A3A3A3] hover:text-[#171717] dark:hover:text-white transition-colors cursor-pointer"
              >
                "Analyze my priority technical gaps"
              </button>
              <button
                onClick={() => setInputVal('Review concurrent design tradeoffs for rate limiting')}
                className="rounded-lg border border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#111111] px-3.5 py-1.5 text-xs text-[#525252] dark:text-[#A3A3A3] hover:text-[#171717] dark:hover:text-white transition-colors cursor-pointer"
              >
                "Review concurrent design tradeoffs"
              </button>
            </div>
          </EmptyState>
        ) : (
          <div className="space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 text-sm leading-relaxed ${
                  m.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-xl p-4 rounded-xl ${
                    m.role === 'user'
                      ? 'bg-[#171717] dark:bg-[#FAFAFA] text-white dark:text-[#0A0A0A]'
                      : 'bg-[#F7F7F7] dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#222222] text-[#171717] dark:text-[#FAFAFA]'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="rounded-xl border border-[#E5E5E5] dark:border-[#222222] bg-white dark:bg-[#0A0A0A] p-2.5 flex items-center gap-3 shrink-0 shadow-xs">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="Ask Adaptive Mentor about your roadmap or challenge..."
          className="flex-1 bg-transparent px-3 py-2 text-sm text-[#171717] dark:text-[#FAFAFA] placeholder-[#8C8C8C] dark:placeholder-[#555555] focus-visible:outline-none"
        />
        <Button size="md" variant="primary" disabled={!inputVal.trim()} className="gap-2 text-xs font-medium h-10 px-4">
          <span>Send</span>
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Technical Contract Reference */}
      <div className="flex items-center justify-between text-xs text-[#8C8C8C] dark:text-[#555555] px-1 shrink-0">
        <span className="font-mono">Endpoint: POST /api/v1/learners/&#123;id&#125;/events</span>
        <span className="flex items-center gap-1 font-medium">
          <Sparkles className="h-3.5 w-3.5 text-[#7C3AED] dark:text-[#8B5CF6]" />
          Agentic Backend Relay
        </span>
      </div>
    </div>
  );
};
