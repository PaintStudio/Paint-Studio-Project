import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import BattlePage from './BattlePage';
import PartyPresetEditor from '../components/PartyPresetEditor';
import './RaidPage.css';

const ELEM_ICONS = { fire: '&#128293;', water: '&#128167;', grass: '&#127807;', light: '&#10024;', dark: '&#127761;', neutral: '&#9898;' };

export default function RaidPage({ user, onRefresh, addToast }) {
  const [raid, setRaid] = useState(null);
  const [raidInfo, setRaidInfo] = useState(null);
  const [presets, setPresets] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [editingSlot, setEditingSlot] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [battleSetup, setBattleSetup] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [raidData, charData, presetData] = await Promise.all([
        api.raidCurrent(), api.partyList(), api.partyPresets()
      ]);
      setRaid(raidData.raid);
      setRaidInfo(raidData);
      setCharacters(charData.characters);
      setPresets(presetData.presets);
    } catch (err) { addToast(err.message, 'error'); }
  };

  const getCharByInvId = (invId) => characters.find(c => c.inventory_id === invId);

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
      addToast(`피해량: ${result.damage.toLocaleString()}${result.bossKilled ? ' &#127881; 보스 처치!' : ''}`, result.bossKilled ? 'ssr' : 'sr');
      onRefresh();
    } catch (err) {
      addToast(err.message, 'error');
    }
    setBattleSetup(null);
    setShowPicker(false);
    setSelectedPreset(null);
    loadData();
  };

  const handlePresetSave = async (name, ids) => {
    try {
      await api.savePartyPreset(editingSlot, name, ids);
      addToast('편성 저장 완료');
      setEditingSlot(null);
      const presetData = await api.partyPresets();
      setPresets(presetData.presets);
      const updated = presetData.presets.find(p => p.slot === editingSlot);
      if (updated && updated.partyIds.length > 0) setSelectedPreset(updated);
    } catch (err) { addToast(err.message, 'error'); }
  };

  if (battleSetup) {
    return <BattlePage setup={battleSetup} onBattleEnd={onBattleEnd} partyIds={battleSetup.partyIds} />;
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
        <div className="preset-picker-section">
          <div className="preset-picker-header">
            <h3>&#9876;&#65039; 프리셋 선택</h3>
          </div>
          <div className="preset-picker-grid">
            {presets.map(p => {
              const members = p.partyIds.map(id => getCharByInvId(id)).filter(Boolean);
              const isSelected = selectedPreset?.slot === p.slot;
              return (
                <div key={p.slot}
                  className={`preset-pick-card ${isSelected ? 'selected' : ''} ${members.length === 0 ? 'empty' : ''}`}
                  onClick={() => members.length > 0 && setSelectedPreset(p)}>
                  <div className="preset-pick-header">
                    <span className="preset-pick-num">{p.slot + 1}</span>
                    <span className="preset-pick-name">{p.name}</span>
                    <button className="preset-pick-edit" onClick={(e) => {
                      e.stopPropagation();
                      setEditingSlot(p.slot);
                    }} dangerouslySetInnerHTML={{ __html: '&#9998;' }} />
                  </div>
                  {members.length > 0 ? (
                    <div className="preset-pick-members">
                      {members.map(c => (
                        <div key={c.inventory_id} className="preset-pick-member">
                          <div className="ppm-avatar">
                            {c.image_url ? <img src={c.image_url} alt={c.name} /> : c.name?.[0]}
                          </div>
                          <div className="ppm-info">
                            <span className="ppm-name">{c.name}</span>
                            <span className="ppm-lv">Lv.{c.level}</span>
                          </div>
                        </div>
                      ))}
                      <div className="preset-pick-power">ATK {members.reduce((s, c) => s + c.stats.atk, 0)}</div>
                    </div>
                  ) : (
                    <div className="preset-pick-empty" onClick={(e) => {
                      e.stopPropagation();
                      setEditingSlot(p.slot);
                    }}>+ 편성하기</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <button className="btn-primary battle-start-btn" onClick={startBattle} disabled={loading || !selectedPreset}>
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
          <h2><span dangerouslySetInnerHTML={{ __html: `${raid.name} ${ELEM_ICONS[raid.element] || ''}` }} /></h2>
          <span className="boss-notes">&#127925;{raid.turnNotes}</span>
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

      <button className="btn-primary" onClick={() => setShowPicker(true)}
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
