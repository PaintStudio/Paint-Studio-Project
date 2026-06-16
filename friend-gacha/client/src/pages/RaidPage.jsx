import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import BattlePage from './BattlePage';
import './RaidPage.css';

const ELEM_ICONS = { fire: '🔥', water: '💧', grass: '🌿', light: '✨', dark: '🌑', neutral: '⚪' };

export default function RaidPage({ user, onRefresh, addToast }) {
  const [raid, setRaid] = useState(null);
  const [raidInfo, setRaidInfo] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [partyIds, setPartyIds] = useState([]);
  const [showParty, setShowParty] = useState(false);
  const [battleSetup, setBattleSetup] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [raidData, charData] = await Promise.all([api.raidCurrent(), api.partyList()]);
      setRaid(raidData.raid);
      setRaidInfo(raidData);
      setCharacters(charData.characters);
    } catch (err) { addToast(err.message, 'error'); }
  };

  const toggleParty = (invId) => {
    setPartyIds(prev =>
      prev.includes(invId) ? prev.filter(id => id !== invId) : prev.length < 4 ? [...prev, invId] : prev
    );
  };

  const startBattle = async () => {
    if (partyIds.length === 0) return addToast('파티를 편성하세요', 'error');
    setLoading(true);
    try {
      const result = await api.raidBattleStart(partyIds);
      setBattleSetup(result.setup);
    } catch (err) {
      addToast(err.message, 'error');
    }
    setLoading(false);
  };

  const onBattleEnd = async (battleLog) => {
    try {
      const result = await api.raidBattleEnd(raid.id, battleLog);
      addToast(`피해량: ${result.damage.toLocaleString()}${result.bossKilled ? ' 🎉 보스 처치!' : ''}`, result.bossKilled ? 'ssr' : 'sr');
      onRefresh();
    } catch (err) {
      addToast(err.message, 'error');
    }
    setTimeout(() => {
      setBattleSetup(null);
      setShowParty(false);
      loadData();
    }, 2000);
  };

  if (battleSetup) {
    return <BattlePage setup={battleSetup} onBattleEnd={onBattleEnd} partyIds={partyIds} />;
  }

  if (showParty) {
    return (
      <div className="raid-page">
        <button className="btn-back" onClick={() => setShowParty(false)}>← 돌아가기</button>
        <h3>레이드 파티 편성 ({partyIds.length}/4)</h3>
        <div className="party-grid">
          {characters.map(c => {
            const inParty = partyIds.includes(c.inventory_id);
            return (
              <div key={c.inventory_id}
                className={`party-char ${inParty ? 'selected' : ''}`}
                onClick={() => toggleParty(c.inventory_id)}>
                <div className="party-char-header">
                  <span className={`rarity-badge ${c.rarity.toLowerCase()}`}>{c.rarity}</span>
                  <span className="party-elem">{ELEM_ICONS[c.element]}</span>
                </div>
                <div className="party-char-name">{c.name}</div>
                <div className="party-char-level">Lv.{c.level}</div>
                <div className="party-char-notes">🎵{c.turn_notes}</div>
                {inParty && <div className="party-order">{partyIds.indexOf(c.inventory_id) + 1}</div>}
              </div>
            );
          })}
        </div>
        <button className="btn-primary battle-start-btn" onClick={startBattle} disabled={loading || partyIds.length === 0}>
          {loading ? '준비 중...' : '레이드 전투!'}
        </button>
      </div>
    );
  }

  if (!raid) return <div className="raid-page"><p className="empty-msg">활성 레이드가 없습니다</p></div>;

  return (
    <div className="raid-page">
      <div className="raid-boss-card">
        <div className="boss-header">
          <h2>{raid.name} {ELEM_ICONS[raid.element]}</h2>
          <span className="boss-notes">🎵{raid.turnNotes}</span>
        </div>
        <div className="boss-hp-bar">
          <div className="boss-hp-fill" style={{ width: `${raid.hpPercent}%` }} />
        </div>
        <div className="boss-hp-text">{raid.currentHp.toLocaleString()} / {raid.maxHp.toLocaleString()} ({raid.hpPercent}%)</div>
      </div>

      <div className="raid-info">
        <span>오늘 시도: {raidInfo?.todayAttempts || 0}/3</span>
        <span>내 총 피해: {(raidInfo?.myTotalDamage || 0).toLocaleString()}</span>
      </div>

      <button className="btn-primary" onClick={() => setShowParty(true)}
        disabled={(raidInfo?.todayAttempts || 0) >= 3}>
        {(raidInfo?.todayAttempts || 0) >= 3 ? '오늘 시도 완료' : '도전하기'}
      </button>

      {raidInfo?.rankings?.length > 0 && (
        <div className="raid-rankings">
          <h3>피해량 랭킹</h3>
          {raidInfo.rankings.map((r, i) => (
            <div key={i} className="rank-item">
              <span className="rank-num">{i + 1}</span>
              <span className="rank-name">{r.display_name}</span>
              <span className="rank-dmg">{r.total_damage.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
