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
    <div className="space-y-4 max-w-4xl mx-auto h-[calc(100vh-140px)] min-h-[500px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E5E5E5] dark:border-[#222222] pb-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded border border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#111111] text-[#171717] dark:text-[#FAFAFA]">
            <Bot className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-[#171717] dark:text-[#FAFAFA]">
                Adaptive Mentor
              </h1>
              <Badge variant="outline" className="text-[10px]">
                LangGraph Agent
              </Badge>
            </div>
            <p className="text-[11px] text-[#8C8C8C] dark:text-[#666666] font-mono">
              Context-aware career trajectory and code challenge coaching
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-[#8C8C8C] dark:text-[#666666]">
          <Shield className="h-3.5 w-3.5 text-emerald-500" />
          <span className="hidden sm:inline font-mono text-[11px]">Backend Relay Only</span>
        </div>
      </div>

      {/* Conversation Viewport */}
      <div className="flex-1 rounded-lg border border-[#E5E5E5] dark:border-[#222222] bg-white dark:bg-[#070707] p-5 overflow-y-auto flex flex-col justify-center">
        {messages.length === 0 ? (
          <EmptyState
            icon={Bot}
            title="Adaptive Mentor Session Ready"
            description="Discuss system tradeoffs, get architectural advice on learning units, or request guidance on challenge edge cases. Direct browser LLM calls are strictly prevented; sessions route through the backend agent orchestrator."
            className="border-none bg-transparent"
          >
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <span className="rounded border border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#111111] px-2.5 py-1 text-[11px] font-mono text-[#666666] dark:text-[#A3A3A3]">
                "Analyze my priority technical gaps"
              </span>
              <span className="rounded border border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#111111] px-2.5 py-1 text-[11px] font-mono text-[#666666] dark:text-[#A3A3A3]">
                "Review concurrent design tradeoffs"
              </span>
            </div>
          </EmptyState>
        ) : (
          <div className="space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 text-xs leading-relaxed ${
                  m.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-lg p-3 rounded-md ${
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
      <div className="rounded-lg border border-[#E5E5E5] dark:border-[#222222] bg-white dark:bg-[#0A0A0A] p-2 flex items-center gap-2 shrink-0">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="Ask Adaptive Mentor about your roadmap or challenge..."
          className="flex-1 bg-transparent px-3 py-1.5 text-xs text-[#171717] dark:text-[#FAFAFA] placeholder-[#8C8C8C] dark:placeholder-[#555555] focus-visible:outline-none"
        />
        <Button size="sm" variant="primary" disabled={!inputVal.trim()} className="gap-1 text-xs">
          <span>Send</span>
          <Send className="h-3 w-3" />
        </Button>
      </div>

      {/* Technical Contract Reference */}
      <div className="flex items-center justify-between text-[11px] font-mono text-[#8C8C8C] dark:text-[#555555] px-1 shrink-0">
        <span>Endpoint: POST /api/mentor/chat</span>
        <span className="flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-[#7C3AED] dark:text-[#8B5CF6]" />
          Agentic Backend Service
        </span>
      </div>
    </div>
  );
};
