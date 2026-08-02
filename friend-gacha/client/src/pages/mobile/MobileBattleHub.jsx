import React, { useState } from 'react';
import StagePage from '../StagePage';
import RaidPage from '../RaidPage';
import FarmingPage from '../FarmingPage';
import './MobileBattleHub.css';

const MODES = [
  { key: 'stage', label: '일반', icon: '&#9872;' },
  { key: 'dungeon', label: '파밍', icon: '&#9881;' },
  { key: 'raid', label: '레이드', icon: '&#128293;' },
];

export default function MobileBattleHub({ user, onRefresh, addToast }) {
  const [mode, setMode] = useState('stage');

  return (
    <div className="mb-page">
      <div className="mb-tabs">
        {MODES.map(m => (
          <button key={m.key}
            className={`mb-tab ${mode === m.key ? 'active' : ''}`}
            onClick={() => setMode(m.key)}>
            <span dangerouslySetInnerHTML={{ __html: m.icon }} />
            <span>{m.label}</span>
          </button>
        ))}
      </div>
      <div className="mb-content">
        {mode === 'stage' && <StagePage user={user} onRefresh={onRefresh} addToast={addToast} />}
        {mode === 'dungeon' && <FarmingPage user={user} onRefresh={onRefresh} addToast={addToast} />}
        {mode === 'raid' && <RaidPage user={user} onRefresh={onRefresh} addToast={addToast} />}
      </div>
    </div>
  );
}
