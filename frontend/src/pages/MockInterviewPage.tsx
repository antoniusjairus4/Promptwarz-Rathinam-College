import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mic } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useLearner } from '@/context/LearnerContext';
import { useInterviewVoice } from '@/hooks/useInterviewVoice';
import { api } from '@/services/api';
import type { Interview, InterviewDifficulty, InterviewResponse, InterviewType } from '@/types/interview';
import type { StorageStatus } from '@/types';

export const MockInterviewPage: React.FC = () => {
  const { learner } = useLearner();
  const sessionId = learner?.id;
  const [interview, setInterview] = useState<Interview | null>(null);
  const [storage, setStorage] = useState<StorageStatus | null>(null);
  const [interviewType, setInterviewType] = useState<InterviewType>('mixed');
  const [difficulty, setDifficulty] = useState<InterviewDifficulty>('intermediate');
  const [transcript, setTranscript] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const pending = useRef(false);
  const voice = useInterviewVoice(setTranscript);
  const question = interview?.questions[interview.questions.length - 1];
  const feedback = interview?.answers.find(answer => answer.question_id === question?.id);
  const fieldClass = 'w-full rounded-lg border border-[#D1D5DB] dark:border-[#444444] bg-white dark:bg-[#101010] p-3 text-sm';

  useEffect(() => {
    const abort = new AbortController();
    controller.current = abort;
    setInterview(null); setTranscript(''); setError(null);
    if (sessionId) {
      setBusy(true); pending.current = true;
      api.getInterview(sessionId, abort.signal).then(response => {
        if (!abort.signal.aborted) { setInterview(response.interview); setStorage(response.storage); }
      }).catch((err: unknown) => {
        if (!abort.signal.aborted) setError(err instanceof Error ? err.message : 'Could not restore interview');
      }).finally(() => {
        if (!abort.signal.aborted) { pending.current = false; setBusy(false); }
      });
    }
    return () => { abort.abort(); controller.current?.abort(); pending.current = false; };
  }, [sessionId]);

  const run = async (operation: (signal: AbortSignal) => Promise<InterviewResponse>) => {
    if (pending.current) return;
    const abort = new AbortController(); controller.current = abort;
    pending.current = true; setBusy(true); setError(null);
    try {
      const response = await operation(abort.signal);
      if (!abort.signal.aborted) {
        setInterview(response.interview); setStorage(response.storage); setTranscript('');
      }
    } catch (err: unknown) {
      if (!abort.signal.aborted) setError(err instanceof Error ? err.message : 'AI interview request failed. Please retry.');
    } finally {
      if (!abort.signal.aborted) { pending.current = false; setBusy(false); }
    }
  };

  if (!sessionId) return <section className="space-y-4"><h1 className="text-2xl font-semibold">AI Mock Interview</h1><p>Create or restore a learner session to tailor interview practice to your career.</p><Link className="underline" to="/onboarding">Start career onboarding</Link></section>;

  return <section className="max-w-4xl mx-auto space-y-6">
    <header className="space-y-2"><h1 className="text-2xl font-semibold flex items-center gap-2"><Mic aria-hidden="true" /> AI Mock Interview</h1>
      <p className="text-sm text-[#4B5563] dark:text-[#A3A3A3]">Five questions tailored to {learner.target_role || 'your skills and interests'}. Practice feedback is AI-generated, not verified proficiency.</p>
    </header>
    <p className="text-sm">Only your approved transcript is sent to Maximus. No raw audio is recorded or uploaded by this app. Browser speech recognition may use your browser vendor’s speech service; use text if you prefer.</p>
    {storage && <p className="text-sm" role="status">{storage.durable ? 'Interview saved in session database.' : 'Temporary interview storage: lost on backend restart; not shared across serverless instances.'} Only the most recent interview is retained.</p>}
    {error && <div role="alert" className="border border-rose-500 rounded-lg p-3 text-sm">{error} <button className="underline" disabled={busy} onClick={() => { void run(signal => api.getInterview(sessionId, signal)); }}>Restore latest saved interview</button></div>}
    {!interview && <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2"><label htmlFor="interview-type">Interview type</label><select id="interview-type" className={fieldClass} value={interviewType} onChange={event => setInterviewType(event.target.value as InterviewType)} disabled={busy}>
          <option value="technical">Technical</option><option value="behavioral">Behavioral / HR</option><option value="mixed">Mixed</option>
        </select></div>
        <div className="space-y-2"><label htmlFor="interview-difficulty">Difficulty</label><select id="interview-difficulty" className={fieldClass} value={difficulty} onChange={event => setDifficulty(event.target.value as InterviewDifficulty)} disabled={busy}>
          <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
        </select></div>
      </div>
      <Button isLoading={busy} onClick={() => { void run(signal => api.startInterview(sessionId, interviewType, difficulty, signal)); }}>Start interview</Button>
    </div>}
    {busy && <p role="status">Waiting for the backend. You can continue using navigation; no audio is being sent.</p>}
    {interview && question && <div className="space-y-5">
      <p className="text-sm font-medium">Question {question.number} of 5 · {interview.interview_type} · {interview.difficulty}</p>
      <h2 className="text-xl font-semibold">{question.question}</h2>
      <p className="text-sm text-[#4B5563] dark:text-[#A3A3A3]">Focus: {question.focus} · {question.provider} / {question.model}</p>
      {!interview.summary && <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={!voice.canSpeak || voice.recording} onClick={() => voice.replay(question.question)}>Replay Question</Button>
        <Button variant="secondary" disabled={!voice.supported || voice.recording || busy || Boolean(feedback)} onClick={() => voice.start(transcript)}>Start Recording</Button>
        <Button variant="secondary" disabled={!voice.recording} onClick={voice.stop}>Stop Recording</Button>
      </div>}
      {!voice.supported && <p className="text-sm">Speech recognition is unavailable in this browser. Type your answer below.</p>}
      {voice.voiceError && <p role="alert" className="text-sm">{voice.voiceError}</p>}
      <p role="status" className="text-sm font-medium">{voice.recording ? 'Microphone active — listening. Stop recording before editing or submitting.' : 'Microphone inactive.'}</p>
      {!feedback && <div className="space-y-3">
        <label htmlFor="interview-answer" className="block font-medium">Your answer — review and edit before submitting</label>
        <textarea id="interview-answer" className={fieldClass} rows={7} maxLength={6000} value={transcript} onChange={event => setTranscript(event.target.value)} disabled={voice.recording || busy} />
        <Button disabled={!transcript.trim() || voice.recording} isLoading={busy} onClick={() => { void run(signal => api.interviewAction('answer', sessionId, interview.id, {question_id:question.id, transcript}, signal)); }}>Submit approved answer</Button>
      </div>}
      {feedback && <section className="space-y-3 rounded-xl border border-[#D1D5DB] dark:border-[#444444] p-5">
        <h2 className="text-lg font-semibold">Answer feedback</h2><p className="whitespace-pre-wrap break-words">{feedback.transcript}</p>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">{([['Technical accuracy', feedback.technical_accuracy], ['Clarity', feedback.clarity], ['Completeness', feedback.completeness], ['Relevance', feedback.relevance]] as const).map(([label,score]) => <div key={label}><dt>{label}</dt><dd className="font-semibold">{score}/10</dd></div>)}</dl>
        <p>{feedback.feedback}</p><ul className="list-disc pl-5">{feedback.improvements.map(item => <li key={item}>{item}</li>)}</ul>
        <h3 className="font-semibold">Suggested stronger answer</h3><p className="whitespace-pre-wrap">{feedback.stronger_answer}</p>
        {!interview.summary && <Button isLoading={busy} onClick={() => { void run(signal => api.interviewAction(interview.answers.length === 5 ? 'summary' : 'next', sessionId, interview.id, undefined, signal)); }}>{interview.answers.length === 5 ? 'Generate interview summary' : 'Next Question'}</Button>}
      </section>}
      {interview.summary && <section className="space-y-3" aria-label="Interview summary"><h2 className="text-xl font-semibold">Interview summary</h2><p>{interview.summary.summary}</p>
        {([['Strengths',interview.summary.strengths],['Improvement areas',interview.summary.improvement_areas],['Recommended next steps',interview.summary.next_steps]] as const).map(([title,items]) => <div key={title}><h3 className="font-semibold">{title}</h3><ul className="list-disc pl-5">{items.map(item => <li key={item}>{item}</li>)}</ul></div>)}
        <p className="text-sm">Generated by {interview.summary.provider} / {interview.summary.model}. {interview.evidence_note}</p>
        <Button variant="secondary" onClick={() => { setInterview(null); setTranscript(''); }}>Set up another interview</Button>
      </section>}
    </div>}
  </section>;
};
