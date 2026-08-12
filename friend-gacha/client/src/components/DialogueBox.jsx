import React, { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { bgm } from '../utils/bgm';
import './DialogueBox.css';

const DialogueBox = forwardRef(function DialogueBox({ script, onEnd, onChoice, onBattle }, ref) {
  const [index, setIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showChoices, setShowChoices] = useState(false);
  const [currentBg, setCurrentBg] = useState(null);
  const [autoPlay, setAutoPlay] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [log, setLog] = useState([]);
  const timerRef = useRef(null);
  const autoTimerRef = useRef(null);
  const fullTextRef = useRef('');
  const battleFiredRef = useRef(-1);
  const logEndRef = useRef(null);
  const skipRunning = useRef(false);

  useImperativeHandle(ref, () => ({
    advance() {
      if (index < script.length - 1) setIndex(i => i + 1);
      else onEnd?.();
    }
  }), [index, script, onEnd]);

  const entry = script?.[index];
  const typeSpeed = 30;

  const finishTyping = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setDisplayedText(fullTextRef.current);
    setIsTyping(false);
    if (entry?.choices?.length > 0) setShowChoices(true);
  }, [entry]);

  const [titlePhase, setTitlePhase] = useState(null);

  useEffect(() => {
    if (!entry) return;
    if (entry.bgm) bgm.play(entry.bgm);
    if ('bg' in entry) setCurrentBg(entry.bg || null);
    if (entry.type === 'battle') {
      if (battleFiredRef.current !== index) {
        battleFiredRef.current = index;
        onBattle?.(entry, index);
      }
      return;
    }

    if (entry.type === 'title') {
      setTitlePhase('in');
      const t1 = setTimeout(() => setTitlePhase('visible'), 800);
      return () => { clearTimeout(t1); };
    }

    if (entry.text) {
      setLog(prev => [...prev, { speaker: entry.speaker || null, text: entry.text }]);
    }

    fullTextRef.current = entry.text || '';
    setDisplayedText('');
    setIsTyping(true);
    setShowChoices(false);

    let charIdx = 0;
    timerRef.current = setInterval(() => {
      charIdx++;
      setDisplayedText(fullTextRef.current.slice(0, charIdx));
      if (charIdx >= fullTextRef.current.length) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        setIsTyping(false);
        if (entry.choices?.length > 0) setShowChoices(true);
      }
    }, typeSpeed);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [index, entry, onBattle]);

  useEffect(() => {
    if (autoTimerRef.current) { clearTimeout(autoTimerRef.current); autoTimerRef.current = null; }
    if (!autoPlay || isTyping || showChoices) return;
    if (index >= script.length - 1) return;
    autoTimerRef.current = setTimeout(() => {
      setIndex(i => i + 1);
    }, 1800);
    return () => { if (autoTimerRef.current) clearTimeout(autoTimerRef.current); };
  }, [autoPlay, isTyping, showChoices, index, script]);

  const advance = useCallback(() => {
    if (showLog) return;
    if (titlePhase) {
      if (titlePhase === 'in') return;
      setTitlePhase(null);
      if (index < script.length - 1) setIndex(i => i + 1);
      else onEnd?.();
      return;
    }
    if (isTyping) {
      finishTyping();
      return;
    }
    if (entry?.choices?.length > 0) return;
    if (entry?.next != null) {
      const target = typeof entry.next === 'string'
        ? script.findIndex(e => e.label === entry.next)
        : entry.next;
      if (target >= 0) { setIndex(target); return; }
    }
    if (index >= script.length - 1) {
      onEnd?.();
      return;
    }
    setIndex(i => i + 1);
  }, [isTyping, finishTyping, entry, index, script, onEnd, showLog, titlePhase]);

  const handleChoice = useCallback((choice, choiceIdx) => {
    onChoice?.(choice, choiceIdx, index);
    if (choice.next != null) {
      const target = typeof choice.next === 'string'
        ? script.findIndex(e => e.label === choice.next)
        : choice.next;
      if (target >= 0) { setIndex(target); return; }
    }
    if (index < script.length - 1) setIndex(i => i + 1);
    else onEnd?.();
  }, [onChoice, index, script, onEnd]);

  const handleSkip = useCallback(() => {
    if (skipRunning.current) return;
    skipRunning.current = true;
    setAutoPlay(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    let i = index;
    while (i < script.length) {
      const e = script[i];
      if (e.type === 'battle' || e.choices?.length > 0) break;
      if (e.text) setLog(prev => [...prev, { speaker: e.speaker || null, text: e.text }]);
      if ('bg' in e) setCurrentBg(e.bg || null);
      if (e.bgm) bgm.play(e.bgm);
      i++;
    }

    if (i >= script.length) {
      skipRunning.current = false;
      onEnd?.();
      return;
    }

    const e = script[i];
    if (e.type === 'battle') {
      setIndex(i);
    } else if (e.choices?.length > 0) {
      setIndex(i);
      fullTextRef.current = e.text || '';
      setDisplayedText(e.text || '');
      setIsTyping(false);
      setShowChoices(true);
      if (e.text) setLog(prev => [...prev, { speaker: e.speaker || null, text: e.text }]);
    }
    skipRunning.current = false;
  }, [index, script, onEnd]);

  useEffect(() => {
    const onKey = (e) => {
      if (showLog) { if (e.key === 'Escape') setShowLog(false); return; }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); advance(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, showLog]);

  useEffect(() => {
    if (showLog && logEndRef.current) {
      const body = logEndRef.current.parentElement;
      if (body) body.scrollTop = body.scrollHeight;
    }
  }, [showLog]);

  if (!entry || entry.type === 'battle') return null;

  if (entry.type === 'title' && titlePhase) {
    return (
      <div className="dialogue-overlay dialogue-title-screen" onClick={advance}>
        <div className={`dialogue-title-card ${titlePhase}`}>
          <span className="dialogue-title-main">{entry.title}</span>
          {entry.subtitle && <span className="dialogue-title-sub">{entry.subtitle}</span>}
        </div>
      </div>
    );
  }

  const chars = entry.characters || [];
  const leftChar = chars.find(c => c.position === 'left');
  const centerChar = chars.find(c => c.position === 'center');
  const rightChar = chars.find(c => c.position === 'right');

  return (
    <div className="dialogue-overlay" onClick={advance}>
      {currentBg && <div className="dialogue-bg" style={{ backgroundImage: `url(${currentBg})` }} />}

      <div className="dialogue-controls" onClick={e => e.stopPropagation()}>
        <button className={`dlg-ctrl-btn ${autoPlay ? 'active' : ''}`} onClick={() => setAutoPlay(a => !a)}>AUTO</button>
        <button className="dlg-ctrl-btn" onClick={handleSkip}>SKIP</button>
        <button className="dlg-ctrl-btn" onClick={() => setShowLog(true)}>LOG</button>
      </div>

      <div className="dialogue-stage">
        {[leftChar, centerChar, rightChar].filter(Boolean).map(ch => (
          <div key={ch.position}
            className={`dialogue-char ${ch.position} ${ch.active === false ? 'dim' : ''}`}
            style={ch.offsetY ? { marginBottom: (-220 - ch.offsetY) + 'px' } : undefined}>
            <img src={ch.image} alt={ch.name || ''} />
          </div>
        ))}
      </div>

      {showChoices && entry.choices && (
        <div className="dialogue-choices" onClick={e => e.stopPropagation()}>
          {entry.choices.map((c, i) => (
            <button key={i} className="dialogue-choice-btn" onClick={() => handleChoice(c, i)}>
              {c.text}
            </button>
          ))}
        </div>
      )}

      <div className="dialogue-bottom" onClick={e => e.stopPropagation()}>
        <div className="dialogue-box" onClick={advance}>
          {entry.speaker && (
            <div className="dialogue-speaker">
              <span className="dialogue-speaker-name">{entry.speaker}</span>
            </div>
          )}
          <div className="dialogue-text">{displayedText}</div>
          {!isTyping && !showChoices && (
            <span className="dialogue-next-indicator" dangerouslySetInnerHTML={{ __html: '&#9660;' }} />
          )}
        </div>
      </div>

      {showLog && (
        <div className="dialogue-log-overlay" onClick={() => setShowLog(false)}>
          <div className="dialogue-log-panel" onClick={e => e.stopPropagation()}>
            <div className="dialogue-log-header">
              <span className="dialogue-log-title">대화 로그</span>
              <button className="dialogue-log-close" onClick={() => setShowLog(false)}>&times;</button>
            </div>
            <div className="dialogue-log-body">
              {log.length === 0 ? (
                <p className="dialogue-log-empty">로그가 없습니다.</p>
              ) : (
                log.map((l, i) => (
                  <div key={i} className="dialogue-log-entry">
                    {l.speaker && <span className="dialogue-log-speaker">{l.speaker}</span>}
                    <span className="dialogue-log-text">{l.text}</span>
                  </div>
                ))
              )}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default DialogueBox;
