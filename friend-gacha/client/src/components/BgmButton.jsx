import React, { useState, useEffect, useRef } from 'react';
import { bgm } from '../utils/bgm';
import './BgmButton.css';

export default function BgmButton() {
  const [state, setState] = useState(bgm.getState);
  const [showSlider, setShowSlider] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => bgm.subscribe(setState), []);

  useEffect(() => {
    if (!showSlider) return;
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowSlider(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [showSlider]);

  return (
    <div className="bgm-wrap" ref={wrapRef}>
      <button
        className={'bgm-btn' + (state.muted ? ' muted' : '')}
        onClick={() => bgm.toggleMute()}
        onContextMenu={(e) => { e.preventDefault(); setShowSlider(s => !s); }}
        title="클릭: 음소거 / 우클릭: 볼륨"
      >
        <span dangerouslySetInnerHTML={{ __html: state.muted ? '&#128263;' : '&#128266;' }} />
      </button>
      {showSlider && (
        <div className="bgm-slider-popup">
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={state.volume}
            onChange={(e) => bgm.setVolume(parseFloat(e.target.value))}
          />
          <span className="bgm-vol-label">{Math.round(state.volume * 100)}%</span>
        </div>
      )}
    </div>
  );
}
