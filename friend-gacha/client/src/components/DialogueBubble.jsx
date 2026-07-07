import React, { useState, useEffect, useRef } from 'react';
import './DialogueBubble.css';

export default function DialogueBubble({ speaker, text, duration = 3000, variant = '', style, onDone }) {
  const [fading, setFading] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!text) return;
    setFading(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setFading(true);
      setTimeout(() => onDone?.(), 500);
    }, duration);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [text, duration, onDone]);

  if (!text) return null;

  return (
    <div className={`dialogue-bubble ${variant} ${fading ? 'fade-out' : ''}`} style={style}>
      <div className="dialogue-bubble-inner">
        {speaker && <div className="dialogue-bubble-speaker">{speaker}</div>}
        <div className="dialogue-bubble-text">{text}</div>
      </div>
    </div>
  );
}
