import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../utils/api';
import { addToast } from '../utils/toast';
import CurrencyIcon from './CurrencyIcon';
import './MissionModal.css';

export default function MissionModal({ onClose, onRefresh }) {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const d = await api.missions();
      setMissions(d.missions);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const claim = async (id) => {
    try {
      await api.claimMission(id);
      addToast('보상 수령!', 'trade');
      load();
      if (onRefresh) onRefresh();
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  const allClaimed = missions.length > 0 && missions.every(m => m.claimed);

  return createPortal(
    <div className="mission-backdrop" onClick={onClose}>
      <div className="mission-modal" onClick={e => e.stopPropagation()}>
        <div className="mission-header">
          <h3>&#128203; &#45936;&#51068;&#47532; &#48120;&#49496;</h3>
          <button className="mission-close" onClick={onClose}>&times;</button>
        </div>

        {loading ? (
          <div className="mission-loading">&#47196;&#46377; &#51473;...</div>
        ) : missions.length === 0 ? (
          <div className="mission-empty">&#50724;&#45720;&#51032; &#48120;&#49496;&#51060; &#50630;&#49845;&#45768;&#45796;</div>
        ) : (
          <div className="mission-list">
            {missions.map(m => {
              const progress = Math.min(m.current / m.target, 1);
              const rewardIcon = m.rewardType === 'diamond' ? 'prism' : 'bit';
              return (
                <div key={m.id} className={`mission-item ${m.claimed ? 'claimed' : m.completed ? 'completed' : ''}`}>
                  <div className="mission-info">
                    <span className="mission-label">{m.label}</span>
                    <div className="mission-progress-bar">
                      <div className="mission-progress-fill" style={{ width: `${progress * 100}%` }} />
                      <span className="mission-progress-text">{m.current} / {m.target}</span>
                    </div>
                  </div>
                  <div className="mission-reward">
                    <CurrencyIcon type={rewardIcon} size={20} />
                    <span className="mission-reward-amount">{m.rewardAmount.toLocaleString()}</span>
                  </div>
                  <div className="mission-action">
                    {m.claimed ? (
                      <span className="mission-done">&#49688;&#47161;&#50756;&#47308;</span>
                    ) : m.completed ? (
                      <button className="mission-claim-btn" onClick={() => claim(m.id)}>&#49688;&#47161;</button>
                    ) : (
                      <span className="mission-pending">&#51652;&#54665;&#51473;</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {allClaimed && (
          <div className="mission-all-done">&#47784;&#46304; &#48120;&#49496; &#50756;&#47308;!</div>
        )}
      </div>
    </div>,
    document.getElementById('game-root') || document.body
  );
}
