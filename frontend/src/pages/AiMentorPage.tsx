import React, { useState, useRef, useEffect } from 'react';
import { Bot, Shield, Send, Loader2, User, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { api, ApiClientError } from '@/services/api';
import { useLearner } from '@/context/LearnerContext';

interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  nextActions?: string[];
  provider?: string;
  model?: string;
  timestamp: string;
}

export const AiMentorPage: React.FC = () => {
  const { learner, sessionToken } = useLearner();
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  const handleSend = async (messageText?: string) => {
    const text = (messageText || inputVal).trim();
    if (!text || isSending) return;

    const userTurn: ChatTurn = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userTurn]);
    setInputVal('');
    setIsSending(true);
    setErrorMessage(null);

    const sessionId = learner?.id || sessionToken || 'demo_learner_session';

    try {
      const res = await api.sendMentorMessage(sessionId, text);
      const assistantTurn: ChatTurn = {
        id: res.message.id || `bot-${Date.now()}`,
        role: 'assistant',
        content: res.message.reply,
        nextActions: res.message.next_actions || [],
        provider: res.message.provider,
        model: res.message.model,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, assistantTurn]);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to receive response from Adaptive Mentor.');
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-4 max-w-[1200px] mx-auto h-[calc(100vh-140px)] min-h-[580px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E5E5E5] dark:border-[#222222] pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#111111] text-[#171717] dark:text-[#FAFAFA] shadow-xs">
            <Bot className="h-5 w-5 text-[#7C3AED] dark:text-[#8B5CF6]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-semibold text-[#171717] dark:text-[#FAFAFA]">
                Adaptive Mentor
              </h1>
              <Badge variant="outline" className="text-xs">
                LangGraph Agent
              </Badge>
              {learner?.target_role && (
                <Badge variant="accent" className="text-xs hidden sm:inline-flex">
                  Role: {learner.target_role}
                </Badge>
              )}
            </div>
            <p className="text-xs text-[#737373] dark:text-[#888888]">
              Context-aware career trajectory and code challenge coaching
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#737373] dark:text-[#888888]">
          <Shield className="h-4 w-4 text-emerald-500" />
          <span className="hidden sm:inline font-medium">Backend Secure Relay Only</span>
        </div>
      </div>

      {/* Conversation Viewport */}
      <div className="flex-1 rounded-xl border border-[#E5E5E5] dark:border-[#222222] bg-white dark:bg-[#070707] p-6 overflow-y-auto flex flex-col shadow-xs">
        {messages.length === 0 ? (
          <div className="my-auto">
            <EmptyState
              icon={Bot}
              title="Adaptive Mentor Session Ready"
              description="Discuss system tradeoffs, get architectural advice on learning units, or request guidance on challenge edge cases. All queries route securely through the backend agent orchestrator."
              className="border-none bg-transparent"
            >
              <div className="mt-6 flex flex-wrap justify-center gap-2.5 max-w-xl mx-auto">
                <button
                  onClick={() => handleSend('Analyze my priority technical gaps for my target role')}
                  className="rounded-lg border border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#111111] px-3.5 py-2 text-xs text-[#525252] dark:text-[#A3A3A3] hover:text-[#171717] dark:hover:text-white transition-colors cursor-pointer"
                >
                  "Analyze my priority technical gaps for my target role"
                </button>
                <button
                  onClick={() => handleSend('How should I prioritize my roadmap milestones?')}
                  className="rounded-lg border border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#111111] px-3.5 py-2 text-xs text-[#525252] dark:text-[#A3A3A3] hover:text-[#171717] dark:hover:text-white transition-colors cursor-pointer"
                >
                  "How should I prioritize my roadmap milestones?"
                </button>
                <button
                  onClick={() => handleSend('Explain distributed rate limiter implementation strategies')}
                  className="rounded-lg border border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#111111] px-3.5 py-2 text-xs text-[#525252] dark:text-[#A3A3A3] hover:text-[#171717] dark:hover:text-white transition-colors cursor-pointer"
                >
                  "Explain distributed rate limiter strategies"
                </button>
              </div>
            </EmptyState>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 text-sm leading-relaxed ${
                  m.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {m.role === 'assistant' && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E5E5E5] dark:border-[#262626] bg-[#FAFAFA] dark:bg-[#161616] text-[#7C3AED] dark:text-[#8B5CF6]">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`max-w-2xl p-4 sm:p-5 rounded-xl space-y-3 ${
                    m.role === 'user'
                      ? 'bg-[#171717] dark:bg-[#FAFAFA] text-white dark:text-[#0A0A0A]'
                      : 'bg-[#FAFAFA] dark:bg-[#101010] border border-[#E5E5E5] dark:border-[#222222] text-[#171717] dark:text-[#FAFAFA]'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed text-sm">
                    {m.content}
                  </p>

                  {/* Next Actions suggestions */}
                  {m.nextActions && m.nextActions.length > 0 && (
                    <div className="pt-3 border-t border-[#E5E5E5] dark:border-[#262626] space-y-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8C8C8C] dark:text-[#666666] block">
                        Suggested Inquiries:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {m.nextActions.map((action, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSend(action)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium border border-[#E5E5E5] dark:border-[#262626] bg-white dark:bg-[#181818] text-[#171717] dark:text-[#FAFAFA] hover:border-[#7C3AED] dark:hover:border-[#8B5CF6] transition-colors cursor-pointer"
                          >
                            <span>{action}</span>
                            <ArrowRight className="h-3 w-3 text-[#7C3AED] dark:text-[#8B5CF6]" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-[#8C8C8C] dark:text-[#666666] pt-1">
                    <span>{m.timestamp}</span>
                    {m.model && <span>{m.model}</span>}
                  </div>
                </div>

                {m.role === 'user' && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E5E5E5] dark:border-[#262626] bg-[#FAFAFA] dark:bg-[#161616] text-[#171717] dark:text-[#FAFAFA]">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}

            {isSending && (
              <div className="flex gap-3 text-sm justify-start">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E5E5E5] dark:border-[#262626] bg-[#FAFAFA] dark:bg-[#161616] text-[#7C3AED] dark:text-[#8B5CF6]">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="p-4 rounded-xl bg-[#FAFAFA] dark:bg-[#101010] border border-[#E5E5E5] dark:border-[#222222] text-xs text-[#737373] dark:text-[#888888] flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-[#7C3AED] dark:text-[#8B5CF6]" />
                  <span>Adaptive Mentor is reasoning about your inquiry...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-lg border border-red-500/30 bg-red-500/10 text-xs text-red-600 dark:text-red-400 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold">Mentor Relay Notice:</span>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="rounded-xl border border-[#E5E5E5] dark:border-[#222222] bg-white dark:bg-[#0A0A0A] p-2.5 flex items-center gap-3 shrink-0 shadow-xs"
      >
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="Ask Adaptive Mentor about your roadmap, coding challenges, or technical trade-offs..."
          className="flex-1 bg-transparent px-3 py-2 text-sm text-[#171717] dark:text-[#FAFAFA] placeholder-[#8C8C8C] dark:placeholder-[#555555] focus-visible:outline-none"
        />
        <Button
          type="submit"
          size="md"
          variant="primary"
          disabled={!inputVal.trim() || isSending}
          className="gap-2 text-xs font-medium h-10 px-5 cursor-pointer shadow-xs"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <span>Send</span>
              <Send className="h-3.5 w-3.5" />
            </>
          )}
        </Button>
      </form>
    </div>
  );
};
