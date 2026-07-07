import React, { useState } from 'react';
import RaidPage from './RaidPage';
import FarmingPage from './FarmingPage';
import './BattleHub.css';

const MODES = [
  { key: 'dungeon', label: '파밍 던전', icon: '&#9881;', desc: '소재 & 비트 수집용 던전' },
  { key: 'raid', label: '레이드', icon: '&#128293;', desc: '강력한 보스에 도전' },
];

export default function BattleHub({ user, onRefresh, addToast }) {
  const [mode, setMode] = useState('dungeon');

  return (
    <div className="battle-hub">
      <div className="battle-mode-tabs">
        {MODES.map(m => (
          <button key={m.key}
            className={`battle-mode-tab ${mode === m.key ? 'active' : ''}`}
            onClick={() => setMode(m.key)}>
            <span className="mode-icon" dangerouslySetInnerHTML={{ __html: m.icon }} />
            <span className="mode-label">{m.label}</span>
            <span className="mode-desc">{m.desc}</span>
          </button>
        ))}
      </div>

      <div className="battle-mode-content">
        {mode === 'dungeon' && <FarmingPage user={user} onRefresh={onRefresh} addToast={addToast} />}
        {mode === 'raid' && <RaidPage user={user} onRefresh={onRefresh} addToast={addToast} />}
      </div>
    </div>
  );
}
