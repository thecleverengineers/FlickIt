'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from './store-header';

export default function VoiceSearch({ onSearch, disabled }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [feedback, setFeedback] = useState('');
  const recognition = useRef(null);

  useEffect(() => {
    setSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
    return () => recognition.current?.abort();
  }, []);

  function listen() {
    if (recognition.current) {
      recognition.current.stop();
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const session = new SpeechRecognition();
    session.lang = 'en-IN';
    session.onresult = event => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) {
        onSearch(transcript);
        setFeedback('');
      }
    };
    session.onerror = () => setFeedback('Voice search couldn’t hear a search. You can type instead.');
    session.onend = () => {
      recognition.current = null;
      setListening(false);
    };
    setFeedback('');
    try {
      session.start();
      recognition.current = session;
      setListening(true);
    } catch {
      setFeedback('Voice search is unavailable. You can type instead.');
    }
  }

  if (!supported) return null;
  return <div className="voice-search">
    <button type="button" className="header-icon" disabled={disabled} aria-pressed={listening}
      aria-label={listening ? 'Stop voice search' : 'Start voice search using your browser'}
      onClick={listen}><Icon name="mic" /></button>
    {(listening || feedback) && <span role="status">{listening ? 'Listening…' : feedback}</span>}
  </div>;
}
