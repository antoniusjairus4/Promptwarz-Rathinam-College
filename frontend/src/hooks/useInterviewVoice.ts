import { useEffect, useRef, useState } from 'react';

interface RecognitionResult { isFinal: boolean; 0: { transcript: string }; }
interface RecognitionEvent { results: { length: number; [index: number]: RecognitionResult }; }
interface Recognition {
  continuous: boolean; interimResults: boolean; lang: string;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
}
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

/** Browser recognition only: Maximus never records or uploads audio. */
export function useInterviewVoice(setTranscript: (value: string) => void) {
  const recognition = useRef<Recognition | null>(null);
  const [recording, setRecording] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const browser = window as SpeechWindow;
  const Constructor = browser.SpeechRecognition || browser.webkitSpeechRecognition;
  const supported = Boolean(Constructor);
  const canSpeak = 'speechSynthesis' in window;

  useEffect(() => () => {
    const current = recognition.current;
    if (current) {
      current.onresult = null; current.onerror = null; current.onend = null;
      current.abort();
    }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  const start = (existing: string) => {
    if (!Constructor || recognition.current) return;
    setVoiceError(null);
    if (canSpeak) window.speechSynthesis.cancel();
    const current = new Constructor();
    recognition.current = current;
    current.lang = 'en-US'; current.continuous = true; current.interimResults = true;
    current.onresult = event => {
      const parts: string[] = [];
      for (let index = 0; index < event.results.length; index++) parts.push(event.results[index][0].transcript);
      setTranscript([existing.trim(), parts.join(' ')].filter(Boolean).join(' '));
    };
    current.onerror = event => {
      setVoiceError(event.error === 'not-allowed' || event.error === 'service-not-allowed'
        ? 'Microphone access was denied. You can type your answer instead.'
        : `Speech recognition failed (${event.error}). You can type your answer or retry.`);
      setRecording(false);
    };
    current.onend = () => { recognition.current = null; setRecording(false); };
    try { setRecording(true); current.start(); }
    catch { recognition.current = null; setRecording(false); setVoiceError('Unable to start recognition. Please type your answer.'); }
  };
  const stop = () => { recognition.current?.stop(); };
  const replay = (question: string) => {
    if (!canSpeak) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(question);
    utterance.onerror = () => setVoiceError('Question playback is unavailable. Please read the question on screen.');
    window.speechSynthesis.speak(utterance);
  };
  return { supported, canSpeak, recording, voiceError, start, stop, replay };
}
