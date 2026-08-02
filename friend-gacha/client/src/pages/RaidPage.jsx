import React, { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';
import { bgm } from '../utils/bgm';
import BattlePage from './BattlePage';
import PartyPresetEditor from '../components/PartyPresetEditor';
import PresetPicker from '../components/PresetPicker';
import CurrencyIcon from '../components/CurrencyIcon';
import { ELEM_ICONS } from '../utils/gameConstants';
import usePartyPresets from '../hooks/usePartyPresets';
import './RaidPage.css';

function formatTimeLeft(endsAt) {
  if (!endsAt) return '';
  const diff = new Date(endsAt) - Date.now();
  if (diff <= 0) return '정산 중...';
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `${d}일 ${h}시간`;
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}

export default function RaidPage({ user, onRefresh, addToast }) {
  const [raid, setRaid] = useState(null);
  const [raidInfo, setRaidInfo] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [battleSetup, setBattleSetup] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const timerRef = useRef(null);

  const {
    presets, characters, selectedPreset, setSelectedPreset,
    editingSlot, setEditingSlot,
    loadPresets, getCharByInvId, handlePresetSave,
  } = usePartyPresets(addToast);

  useEffect(() => {
    loadData();
    timerRef.current = setInterval(() => setRaidInfo(prev => prev ? { ...prev } : null), 60000);
    return () => clearInterval(timerRef.current);
  }, []);

  const loadData = async () => {
    try {
      const [raidData] = await Promise.all([
        api.raidCurrent(), loadPresets()
      ]);
      setRaid(raidData.raid);
      setRaidInfo(raidData);
    } catch (err) { addToast(err.message, 'error'); }
  };

  const startBattle = async () => {
    if (!selectedPreset) return addToast('프리셋을 선택하세요', 'error');
    const partyIds = selectedPreset.partyIds;
    if (partyIds.length === 0) return addToast('빈 프리셋입니다', 'error');
    setLoading(true);
    try {
      const result = await api.raidBattleStart(partyIds);
      setBattleSetup({ ...result.setup, partyIds });
    } catch (err) {
      addToast(err.message, 'error');
    }
    setLoading(false);
  };

  const onBattleEnd = async (battleLog) => {
    try {
      const result = await api.raidBattleEnd(raid.id, battleLog);
      setLastResult(result);
      onRefresh();
    } catch (err) {
      addToast(err.message, 'error');
    }
    setBattleSetup(null);
    bgm.play('battle_hub');
  };

  const dismissResult = () => {
    setLastResult(null);
    setShowPicker(false);
    setSelectedPreset(null);
    loadData();
  };

  if (battleSetup) {
    return <BattlePage setup={battleSetup} onBattleEnd={onBattleEnd} partyIds={battleSetup.partyIds} />;
  }

  if (lastResult) {
    return (
      <div className="raid-page raid-result-screen">
        <h2 className="raid-result-title">
          {lastResult.bossKilled ? '&#127881; 보스 처치!' : '&#9876;&#65039; 전투 종료'}
        </h2>
        <div className="raid-result-damage">
          <span className="raid-result-label">이번 피해량</span>
          <span className="raid-result-value">{lastResult.damage.toLocaleString()}</span>
        </div>
        <div className="raid-result-rewards">
          <span className="raid-result-reward">
            <CurrencyIcon type="bit" /> +{lastResult.rewards.gold}
          </span>
        </div>
        {lastResult.bossKilled && (
          <div className="raid-result-kill-notice">
            처치 보상이 우편으로 발송되었습니다!
          </div>
        )}
        <div className="raid-result-boss-hp">
          <span>보스 HP: {Math.max(0, lastResult.bossHp).toLocaleString()} / {lastResult.bossMaxHp.toLocaleString()}</span>
        </div>
        <div className="raid-result-total">
          <span>내 총 피해: {lastResult.myTotalDamage.toLocaleString()}</span>
        </div>
        <button className="btn-primary raid-result-btn" onClick={dismissResult}>확인</button>
      </div>
    );
  }

  if (showPicker && editingSlot !== null) {
    const preset = presets.find(p => p.slot === editingSlot);
    return (
      <div className="raid-page">
        <PartyPresetEditor
          characters={characters}
          initialName={preset?.name || ''}
          initialIds={preset?.partyIds || []}
          onSave={handlePresetSave}
          onCancel={() => setEditingSlot(null)}
        />
      </div>
    );
  }

  if (showPicker) {
    return (
      <div className="raid-page">
        <button className="btn-back" onClick={() => { setShowPicker(false); setSelectedPreset(null); }}>&larr; 돌아가기</button>
        <PresetPicker
          presets={presets}
          selectedPreset={selectedPreset}
          onSelect={setSelectedPreset}
          onEdit={setEditingSlot}
          getCharByInvId={getCharByInvId}
        />
        <button className="btn-primary battle-start-btn" onClick={startBattle} disabled={loading || !selectedPreset}>
          {loading ? '준비 중...' : '레이드 전투!'}
        </button>
      </div>
    );
  }

  if (!raid) return <div className="raid-page"><p className="empty-msg">활성 레이드가 없습니다</p></div>;

  const hpPercent = Math.max(0, Math.min(100, raid.hpPercent));
  const isDead = raid.currentHp <= 0;
  const attemptsUsed = raidInfo?.todayAttempts || 0;
  const attemptsMax = raidInfo?.maxAttempts || 3;
  const canChallenge = !isDead && attemptsUsed < attemptsMax;

  return (
    <div className="raid-page">
      <div className="raid-header">
        <div className="raid-timer">
          <span>&#9200; {formatTimeLeft(raid.endsAt)}</span>
        </div>
      </div>

      <div className="raid-boss-card">
        <div className="boss-header">
          <h2>
            <span dangerouslySetInnerHTML={{ __html: ELEM_ICONS[raid.element] || '' }} />
            {' '}{raid.name}
          </h2>
          <span className="boss-notes">&#127925; {raid.turnNotes}</span>
        </div>
        <div className="boss-hp-section">
          <div className="boss-hp-bar">
            <div className={`boss-hp-fill ${hpPercent <= 20 ? 'critical' : hpPercent <= 50 ? 'warning' : ''}`}
              style={{ width: `${hpPercent}%` }} />
          </div>
          <div className="boss-hp-text">
            {raid.currentHp.toLocaleString()} / {raid.maxHp.toLocaleString()} ({hpPercent}%)
          </div>
        </div>
        {isDead && <div className="boss-dead-label">DEFEATED</div>}
      </div>

      <div className="raid-my-info">
        <div className="raid-info-item">
          <span className="raid-info-label">오늘 시도</span>
          <span className="raid-info-value">{attemptsUsed} / {attemptsMax}</span>
        </div>
        <div className="raid-info-item">
          <span className="raid-info-label">내 총 피해</span>
          <span className="raid-info-value">{(raidInfo?.myTotalDamage || 0).toLocaleString()}</span>
        </div>
        <div className="raid-info-item">
          <span className="raid-info-label">내 순위</span>
          <span className="raid-info-value">{raidInfo?.myRank ? `${raidInfo.myRank}등` : '-'}</span>
        </div>
        <div className="raid-info-item">
          <span className="raid-info-label">전투 보상</span>
          <span className="raid-info-value"><CurrencyIcon type="bit" /> {raid.perBattleGold}/회</span>
        </div>
      </div>

      <button className="btn-primary raid-challenge-btn" onClick={() => setShowPicker(true)}
        disabled={!canChallenge}>
        {isDead ? '보스 처치 완료' : attemptsUsed >= attemptsMax ? '오늘 시도 완료' : '도전하기'}
      </button>

      {raidInfo?.rankings?.length > 0 && (
        <div className="raid-rankings">
          <h3>&#9876;&#65039; 피해량 랭킹</h3>
          <div className="raid-rank-list">
            {raidInfo.rankings.map(r => (
              <div key={r.rank} className={`raid-rank-item ${r.isMe ? 'is-me' : ''}`}>
                <span className={`raid-rank-num ${r.rank <= 3 ? `top-${r.rank}` : ''}`}>{r.rank}</span>
                <span className="raid-rank-name">{r.display_name}</span>
                <span className="raid-rank-dmg">{r.total_damage.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
