import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { bgm } from '../utils/bgm';
import BattlePage from './BattlePage';
import PartyPresetEditor from '../components/PartyPresetEditor';
import CurrencyIcon from '../components/CurrencyIcon';
import usePartyPresets from '../hooks/usePartyPresets';
import './FarmingPage.css';

const RARITY_ORDER = { N: 0, R: 1, SR: 2, SSR: 3, CR: 4 };
const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
const DIFF_LABELS = ['하급', '중급', '상급', '최상급'];
const DIFF_ORDER = { low: 0, mid: 1, high: 2, top: 3 };

function formatOpenDays(stage) {
  if (stage.alwaysOpen) return '상시개방';
  if (!stage.openDays || stage.openDays.length === 0 || stage.openDays.length === 7) return null;
  return stage.openDays.map(d => DAY_NAMES[d]).join('/');
}

function subGroupStages(stages) {
  const groups = {};
  for (const s of stages) {
    let baseName = s.name;
    for (const dl of DIFF_LABELS) {
      if (baseName.endsWith(' ' + dl)) {
        baseName = baseName.slice(0, -(dl.length + 1));
        break;
      }
      if (baseName.endsWith(' - ' + dl)) {
        baseName = baseName.slice(0, -(dl.length + 3));
        break;
      }
    }
    if (!groups[baseName]) {
      groups[baseName] = { baseName, icon: s.icon, stages: [] };
    }
    groups[baseName].stages.push(s);
  }
  for (const g of Object.values(groups)) {
    g.stages.sort((a, b) => (DIFF_ORDER[a.difficulty] || 0) - (DIFF_ORDER[b.difficulty] || 0));
  }
  const list = Object.values(groups);
  list.sort((a, b) => {
    const aOpen = a.stages.some(s => s.open && s.unlocked) ? 0 : 1;
    const bOpen = b.stages.some(s => s.open && s.unlocked) ? 0 : 1;
    return aOpen - bOpen;
  });
  return list;
}

export default function FarmingPage({ user, onRefresh, addToast }) {
  const [dungeons, setDungeons] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedStage, setSelectedStage] = useState(null);
  const [battleSetup, setBattleSetup] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastRewards, setLastRewards] = useState(null);
  const [diffIndices, setDiffIndices] = useState({});

  const {
    presets, characters, selectedPreset, setSelectedPreset,
    editingSlot, setEditingSlot,
    loadPresets, getCharByInvId, handlePresetSave,
  } = usePartyPresets(addToast);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [farmData] = await Promise.all([
        api.farmingList(), loadPresets()
      ]);
      setDungeons((farmData.dungeons || []).filter(d => d.type !== 'normal'));
    } catch (err) { addToast(err.message, 'error'); }
  };

  const startBattle = async () => {
    if (!selectedPreset) return addToast('프리셋을 선택하세요', 'error');
    const partyIds = selectedPreset.partyIds;
    if (partyIds.length === 0) return addToast('빈 프리셋입니다', 'error');
    setLoading(true);
    try {
      const result = await api.farmingBattleStart(selectedStage.id, partyIds);
      setBattleSetup({ ...result.setup, partyIds });
      setLastRewards(null);
      onRefresh();
    } catch (err) {
      addToast(err.message, 'error');
    }
    setLoading(false);
  };

  const onBattleEnd = async (battleLog) => {
    try {
      const result = await api.farmingBattleEnd(selectedStage.id, battleLog);
      if (result.rewards) {
        setLastRewards(result.rewards);
      } else {
        addToast('패배...', 'error');
      }
      onRefresh();
    } catch (err) {
      addToast(err.message, 'error');
    }
    setBattleSetup(null);
    bgm.play('battle_hub');
  };

  if (battleSetup) {
    return <BattlePage setup={battleSetup} onBattleEnd={onBattleEnd} partyIds={battleSetup.partyIds} />;
  }

  if (lastRewards) {
    const sortedItems = [...(lastRewards.items || [])].sort((a, b) =>
      (RARITY_ORDER[b.rarity] || 0) - (RARITY_ORDER[a.rarity] || 0)
    );
    const fc = lastRewards.firstClear;
    return (
      <div className="farming-rewards-screen">
        <h2 className="farming-rewards-title">던전 클리어!</h2>
        {fc && (
          <div className="farming-first-clear-banner">
            <span className="fc-banner-label">&#10024; 첫 클리어 보상</span>
            <div className="fc-banner-rewards">
              {fc.prism > 0 && (
                <span className="fc-banner-item"><CurrencyIcon type="prism" size={20} /> +{fc.prism}</span>
              )}
              {fc.items?.map((it, i) => (
                <span key={i} className="fc-banner-item">{it.name} x{it.quantity}</span>
              ))}
            </div>
          </div>
        )}
        <div className="farming-rewards-list">
          <div className="farming-reward-item gold">
            <CurrencyIcon type="gold" size={24} />
            <span className="farming-reward-value">+{lastRewards.gold}</span>
          </div>
          {sortedItems.map((item, i) => (
            <div key={i} className={`farming-reward-item rarity-${item.rarity}`}>
              <span className="farming-reward-name">{item.name}</span>
              <span className="farming-reward-qty">x{item.quantity}</span>
            </div>
          ))}
          {sortedItems.length === 0 && <p className="farming-no-drops">추가 드롭 없음</p>}
        </div>
        <div className="farming-rewards-actions">
          <button className="btn-primary" onClick={() => { setLastRewards(null); startBattle(); }}>
            재도전
          </button>
          <button className="btn-secondary" onClick={() => { setLastRewards(null); setSelectedStage(null); loadData(); }}>
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (selectedStage) {
    const days = formatOpenDays(selectedStage);
    return (
      <div className="farming-party-select">
        <button className="btn-back" onClick={() => setSelectedStage(null)}>
          {'<'} {selectedStage.name}
        </button>

        <div className="farming-diff-info">
          <span>권장 Lv.{selectedStage.recommendedLevel}</span>
          <span className="farming-stamina-cost">
            <CurrencyIcon type="stamina" /> {selectedStage.staminaCost}
          </span>
          {days && <span className="farming-open-days">{days}</span>}
        </div>

        <h3 className="farming-section-title">파티 편성</h3>
        <div className="farming-preset-list">
          {presets.map(p => (
            <div key={p.slot}
              className={`farming-preset ${selectedPreset?.slot === p.slot ? 'selected' : ''}`}
              onClick={() => p.partyIds.length > 0 ? setSelectedPreset(p) : setEditingSlot(p.slot)}>
              <span className="farming-preset-name">{p.name}</span>
              <div className="farming-preset-members">
                {p.partyIds.length === 0
                  ? <span className="farming-preset-empty">비어있음</span>
                  : p.partyIds.map((id, i) => {
                    const c = getCharByInvId(id);
                    return c ? (
                      <div key={i} className={`farming-preset-char rarity-border-${c.rarity}`}>
                        {c.image_url
                          ? <img src={c.image_url} alt={c.name} />
                          : <span>{c.name?.[0]}</span>}
                      </div>
                    ) : <div key={i} className="farming-preset-char empty">?</div>;
                  })}
              </div>
              <button className="btn-edit-preset" onClick={(e) => { e.stopPropagation(); setEditingSlot(p.slot); }}>
                <span dangerouslySetInnerHTML={{ __html: '&#9998;' }} />
              </button>
            </div>
          ))}
        </div>

        <button className="btn-primary farming-btn-start" onClick={startBattle} disabled={loading || !selectedPreset}>
          {loading ? '준비 중...' : '출격'}
        </button>

        {editingSlot !== null && (() => {
          const preset = presets.find(p => p.slot === editingSlot);
          return (
            <PartyPresetEditor
              characters={characters}
              initialName={preset?.name || ''}
              initialIds={preset?.partyIds || []}
              onSave={(name, ids) => handlePresetSave(name, ids)}
              onCancel={() => setEditingSlot(null)}
            />
          );
        })()}
      </div>
    );
  }

  if (selectedGroup) {
    const dungeon = dungeons.find(d => d.group === selectedGroup);
    if (!dungeon) return null;

    const hasMultiDiff = dungeon.stages.length > 1 && dungeon.stages.some(s => s.difficulty);
    const subs = hasMultiDiff ? subGroupStages(dungeon.stages) : null;

    if (subs && subs.length > 1) {
      return (
        <div className="farming-diff-select">
          <button className="btn-back" onClick={() => setSelectedGroup(null)}>
            {'<'} 파밍 던전
          </button>
          <h2 className="farming-dungeon-title">
            {dungeon.icon && <span dangerouslySetInnerHTML={{ __html: dungeon.icon }} />}
            {' '}{dungeon.label}
          </h2>
          {dungeon.description && <p className="farming-dungeon-desc">{dungeon.description}</p>}

          <div className="farming-sub-grid">
            {subs.map(sub => {
              const idx = diffIndices[sub.baseName] || 0;
              const s = sub.stages[idx];
              if (!s) return null;
              const days = formatOpenDays(s);
              const closed = !s.open;
              const locked = !s.unlocked;
              const canGo = !closed && !locked;
              return (
                <div key={sub.baseName}
                  className={`farming-sub-card ${closed ? 'closed' : ''} ${locked ? 'locked' : ''}`}
                  onClick={() => canGo && setSelectedStage(s)}>
                  <div className="farming-sub-top">
                    {sub.icon && <span className="farming-sub-icon" dangerouslySetInnerHTML={{ __html: sub.icon }} />}
                    <span className="farming-sub-name">{sub.baseName}</span>
                    {days && <span className="farming-sub-days">{days}</span>}
                  </div>
                  {sub.stages.length > 1 && (
                    <div className="farming-sub-diff">
                      <button className="btn-diff-arrow" disabled={idx <= 0}
                        onClick={(e) => { e.stopPropagation(); setDiffIndices(p => ({ ...p, [sub.baseName]: idx - 1 })); }}>
                        &#9664;
                      </button>
                      <span className={`farming-sub-diff-label diff-${s.difficulty}`}>
                        {DIFF_LABELS[DIFF_ORDER[s.difficulty]] || s.difficulty}
                      </span>
                      <button className="btn-diff-arrow" disabled={idx >= sub.stages.length - 1}
                        onClick={(e) => { e.stopPropagation(); setDiffIndices(p => ({ ...p, [sub.baseName]: idx + 1 })); }}>
                        &#9654;
                      </button>
                    </div>
                  )}
                  <div className="farming-sub-info">
                    <span>Lv.{s.recommendedLevel}</span>
                    <span className="farming-sub-cost"><CurrencyIcon type="stamina" size={13} /> {s.staminaCost}</span>
                    {s.rewards.gold > 0 && (
                      <span className="farming-sub-gold"><CurrencyIcon type="gold" size={13} /> {s.rewards.gold}</span>
                    )}
                  </div>
                  {!s.cleared && s.rewards.firstClear && (
                    <div className="farming-first-clear-tag">
                      <CurrencyIcon type="prism" size={13} /> {s.rewards.firstClear.prism}
                    </div>
                  )}
                  {s.cleared && <span className="farming-cleared-check">&#10003;</span>}
                  {closed && <span className="farming-sub-status closed-label">미개방</span>}
                  {locked && !closed && <span className="farming-sub-status locked-label">&#128274; {s.unlockCondition?.type === 'story_clear' ? '스토리 클리어 필요' : '이전 난이도 클리어 필요'}</span>}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="farming-diff-select">
        <button className="btn-back" onClick={() => setSelectedGroup(null)}>
          {'<'} 파밍 던전
        </button>
        <h2 className="farming-dungeon-title">
          {dungeon.icon && <span dangerouslySetInnerHTML={{ __html: dungeon.icon }} />}
          {' '}{dungeon.label}
        </h2>
        {dungeon.description && <p className="farming-dungeon-desc">{dungeon.description}</p>}

        <div className="farming-diff-grid">
          {dungeon.stages.map(s => {
            const days = formatOpenDays(s);
            const closed = !s.open;
            const locked = !s.unlocked;
            return (
              <button key={s.id}
                className={`farming-diff-card ${closed ? 'closed' : ''} ${locked ? 'locked' : ''}`}
                onClick={() => !closed && !locked && setSelectedStage(s)}
                disabled={closed || locked}>
                <span className="farming-diff-label">{s.name}</span>
                <span className="farming-diff-lv">권장 Lv.{s.recommendedLevel}</span>
                <span className="farming-diff-cost">
                  <CurrencyIcon type="stamina" size={14} /> {s.staminaCost}
                </span>
                {s.rewards.gold > 0 && (
                  <span className="farming-diff-gold">
                    <CurrencyIcon type="gold" size={14} /> {s.rewards.gold}
                  </span>
                )}
                {!s.cleared && s.rewards.firstClear && (
                  <span className="farming-diff-fc">
                    <CurrencyIcon type="prism" size={14} /> {s.rewards.firstClear.prism}
                  </span>
                )}
                {s.cleared && <span className="farming-diff-cleared">&#10003;</span>}
                {days && <span className="farming-diff-days">{days}</span>}
                {closed && <span className="farming-closed-label">미개방</span>}
                {locked && !closed && <span className="farming-locked-label">&#128274;</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="farming-type-select">
      {dungeons.length === 0 && (
        <p className="farming-empty">등록된 파밍 던전이 없습니다.</p>
      )}
      <div className="farming-type-grid">
        {dungeons.map(d => {
          const openCount = d.stages.filter(s => s.open && s.unlocked).length;
          return (
            <button key={d.group} className="farming-type-card" onClick={() => setSelectedGroup(d.group)}>
              {d.icon && <span className="farming-type-icon" dangerouslySetInnerHTML={{ __html: d.icon }} />}
              <span className="farming-type-label">{d.label}</span>
              {d.description && <span className="farming-type-desc">{d.description}</span>}
              <span className="farming-type-count">{openCount}/{d.stages.length} 개방</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
