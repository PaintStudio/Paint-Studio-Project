import React, { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { bgm } from '../utils/bgm';
import './DialogueBox.css';

const DialogueBox = forwardRef(function DialogueBox({ script, onEnd, onChoice, onBattle }, ref) {
  const [index, setIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showChoices, setShowChoices] = useState(false);
  const [currentBg, setCurrentBg] = useState(null);
  const timerRef = useRef(null);
  const fullTextRef = useRef('');
  const battleFiredRef = useRef(-1);

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

  const advance = useCallback(() => {
    if (isTyping) {
      finishTyping();
      return;
    }
    if (entry?.choices?.length > 0) return;
    if (index >= script.length - 1) {
      onEnd?.();
      return;
    }
    setIndex(i => i + 1);
  }, [isTyping, finishTyping, entry, index, script, onEnd]);

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

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); advance(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance]);

  if (!entry || entry.type === 'battle') return null;

  const chars = entry.characters || [];
  const leftChar = chars.find(c => c.position === 'left');
  const centerChar = chars.find(c => c.position === 'center');
  const rightChar = chars.find(c => c.position === 'right');

  return (
    <div className="dialogue-overlay" onClick={advance}>
      {currentBg && <div className="dialogue-bg" style={{ backgroundImage: `url(${currentBg})` }} />}

      <div className="dialogue-stage">
        {leftChar && (
          <div className={`dialogue-char left ${leftChar.active === false ? 'dim' : ''}`}>
            <img src={leftChar.image} alt={leftChar.name || ''} />
          </div>
        )}
        {centerChar && (
          <div className={`dialogue-char center ${centerChar.active === false ? 'dim' : ''}`}>
            <img src={centerChar.image} alt={centerChar.name || ''} />
          </div>
        )}
        {rightChar && (
          <div className={`dialogue-char right ${rightChar.active === false ? 'dim' : ''}`}>
            <img src={rightChar.image} alt={rightChar.name || ''} />
          </div>
        )}
      </div>

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

        {showChoices && entry.choices && (
          <div className="dialogue-choices">
            {entry.choices.map((c, i) => (
              <button key={i} className="dialogue-choice-btn" onClick={() => handleChoice(c, i)}>
                {c.text}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export default DialogueBox;
