import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../utils/api';
import { addToast } from '../utils/toast';
import CurrencyIcon from './CurrencyIcon';
import './MissionModal.css';

const TABS = [
  { key: 'daily', label: '일일' },
  { key: 'weekly', label: '주간' },
  { key: 'onetime', label: '도전' },
];

function MissionList({ missions, onClaim }) {
  if (missions.length === 0) return <div className="mission-empty">미션이 없습니다</div>;

  return (
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
                <span className="mission-done">수령완료</span>
              ) : m.completed ? (
                <button className="mission-claim-btn" onClick={() => onClaim(m.id)}>수령</button>
              ) : (
                <span className="mission-pending">진행중</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function MissionModal({ onClose, onRefresh }) {
  const [tab, setTab] = useState('daily');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const d = await api.missions();
      setData(d);
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

  const currentMissions = data
    ? (tab === 'daily' ? data.missions : tab === 'weekly' ? data.weekly : data.onetime) || []
    : [];

  const getTabBadge = (key) => {
    if (!data) return 0;
    const list = key === 'daily' ? data.missions : key === 'weekly' ? data.weekly : data.onetime;
    return (list || []).filter(m => m.completed && !m.claimed).length;
  };

  return createPortal(
    <div className="mission-backdrop" onClick={onClose}>
      <div className="mission-modal" onClick={e => e.stopPropagation()}>
        <div className="mission-header">
          <h3>&#128203; 미션</h3>
          <button className="mission-close" onClick={onClose}>&times;</button>
        </div>

        <div className="mission-tabs">
          {TABS.map(t => {
            const badge = getTabBadge(t.key);
            return (
              <button key={t.key}
                className={`mission-tab ${tab === t.key ? 'active' : ''}`}
                onClick={() => setTab(t.key)}>
                {t.label}
                {badge > 0 && <span className="mission-tab-badge">{badge}</span>}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="mission-loading">로딩 중...</div>
        ) : (
          <MissionList missions={currentMissions} onClaim={claim} />
        )}
      </div>
    </div>,
    document.getElementById('game-root') || document.body
  );
}
