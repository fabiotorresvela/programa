import { useEffect, useRef, useState } from 'react';

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } }; length: number } }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

function getRecognition(): SpeechRecognitionLike | null {
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export function useSpeechRecognition() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [supported, setSupported] = useState(true);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setSupported(!!getRecognition());
  }, []);

  const start = () => {
    const rec = getRecognition();
    if (!rec) {
      setSupported(false);
      return;
    }
    recRef.current = rec;
    rec.lang = 'es-ES';
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (event) => {
      let text = '';
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setTranscript(text.trim());
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    setTranscript('');
    setListening(true);
    rec.start();
  };

  const stop = () => {
    recRef.current?.stop();
    setListening(false);
  };

  return { listening, transcript, supported, start, stop, setTranscript };
}

export function useSpeechPlayback() {
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setPaused(false);
    utterRef.current = null;
  };

  const play = (text: string) => {
    stop();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'es-ES';
    utter.rate = 1;
    utter.onend = () => {
      setSpeaking(false);
      setPaused(false);
    };
    utter.onerror = () => {
      setSpeaking(false);
      setPaused(false);
    };
    utterRef.current = utter;
    setSpeaking(true);
    setPaused(false);
    window.speechSynthesis.speak(utter);
  };

  const togglePause = () => {
    if (!speaking) return;
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setPaused(false);
    } else {
      window.speechSynthesis.pause();
      setPaused(true);
    }
  };

  useEffect(() => () => window.speechSynthesis.cancel(), []);

  return { speaking, paused, play, stop, togglePause };
}
