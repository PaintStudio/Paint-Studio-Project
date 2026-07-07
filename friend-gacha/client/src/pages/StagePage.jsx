import React, { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';
import BattlePage from './BattlePage';
import DialogueBox from '../components/DialogueBox';
import PartyPresetEditor from '../components/PartyPresetEditor';
import CurrencyIcon from '../components/CurrencyIcon';
import './StagePage.css';

export default function StagePage({ user, onRefresh, addToast }) {
  const [chapters, setChapters] = useState({});
  const [activeChapter, setActiveChapter] = useState(1);
  const [selectedStage, setSelectedStage] = useState(null);
  const [presets, setPresets] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [editingSlot, setEditingSlot] = useState(null);
  const [battleSetup, setBattleSetup] = useState(null);
  const [loading, setLoading] = useState(false);
  const [storyScript, setStoryScript] = useState(null);
  const [staminaPopup, setStaminaPopup] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [stageData, charData, presetData] = await Promise.all([
        api.stageList(), api.partyList(), api.partyPresets()
      ]);
      setChapters(stageData.chapters);
      setCharacters(charData.characters);
      setPresets(presetData.presets);
    } catch (err) { addToast(err.message, 'error'); }
  };

  const getCharByInvId = (invId) => characters.find(c => c.inventory_id === invId);

  const startBattle = async () => {
    if (!selectedPreset) return addToast('프리셋을 선택하세요', 'error');
    const partyIds = selectedPreset.partyIds;
    if (partyIds.length === 0) return addToast('빈 프리셋입니다. 편성 탭에서 먼저 편성하세요', 'error');
    setLoading(true);
    try {
      const result = await api.stageBattleStart(selectedStage.id, partyIds);
      const setup = { ...result.setup, partyIds };
      if (result.setup.storyScript) {
        setStoryScript(result.setup.storyScript);
        setBattleSetup(setup);
      } else {
        setBattleSetup(setup);
      }
      onRefresh();
    } catch (err) {
      if (err.message?.includes('스태미나')) {
        showStaminaPopup();
      } else {
        addToast(err.message, 'error');
      }
    }
    setLoading(false);
  };

  const showStaminaPopup = async () => {
    try {
      const data = await api.myItems();
      const allItems = data.items || [];
      const staminaItems = allItems.filter(it => it.effect?.type === 'stamina' && it.quantity > 0);
      setStaminaPopup({ items: staminaItems, need: selectedStage?.staminaCost || 0 });
    } catch { setStaminaPopup({ items: [], need: 0 }); }
  };

  const useStaminaDrink = async (itemId) => {
    try {
      const result = await api.useItem(itemId);
      addToast(`스태미나 회복! (${result.stamina})`, 'trade');
      onRefresh();
      showStaminaPopup();
    } catch (err) { addToast(err.message, 'error'); }
  };

  const onBattleEnd = async (battleLog) => {
    try {
      const result = await api.stageBattleEnd(selectedStage.id, battleLog);
      if (result.rewards) {
        addToast(`승리! +${result.rewards.gold}B${result.rewards.diamond ? ` +${result.rewards.diamond} 프리즘` : ''}`, 'sr');
      } else {
        addToast('패배...', 'error');
      }
      onRefresh();
    } catch (err) {
      addToast(err.message, 'error');
    }
    setBattleSetup(null);
    setSelectedStage(null);
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

  if (battleSetup && storyScript) {
    return (
      <div className="stage-page">
        <DialogueBox
          script={storyScript}
          onEnd={() => setStoryScript(null)}
        />
      </div>
    );
  }

  if (battleSetup) {
    return <BattlePage setup={battleSetup} onBattleEnd={onBattleEnd} partyIds={battleSetup.partyIds} />;
  }

  if (selectedStage && editingSlot !== null) {
    const preset = presets.find(p => p.slot === editingSlot);
    return (
      <div className="stage-page">
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

  if (selectedStage) {
    return (
      <div className="stage-page stage-detail-page">
        <button className="btn-back" onClick={() => { setSelectedStage(null); setSelectedPreset(null); }}>&larr; 돌아가기</button>
        <div className="stage-detail-card">
          <h2>{selectedStage.name}</h2>
          <div className="stage-meta">
            <span className="meta-lv">&#9876; Lv.{selectedStage.recommendedLevel}</span>
            <span className="meta-stamina"><CurrencyIcon type="stamina" />{selectedStage.staminaCost}</span>
            <span>{[1,2,3].map(i => (
              <span key={i} className={i <= selectedStage.stars ? 'star-filled' : 'star-empty'}>&#9733;</span>
            ))}</span>
          </div>
          <div className="stage-rewards-detail">
            <span className="reward-gold"><CurrencyIcon type="bit" />{selectedStage.rewards.gold}</span>
            {selectedStage.stars === 0 && (
              <span className="reward-diamond"><CurrencyIcon type="prism" />{selectedStage.rewards.first_clear_diamond} (첫 클리어)</span>
            )}
          </div>
        </div>

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
          {loading ? '준비 중...' : '전투 시작!'}
        </button>
      </div>
    );
  }

  // 스테이지 목록
  const chapterKeys = Object.keys(chapters).sort((a, b) => a - b);
  const chapterNames = ['시작의 마을', '어둠의 숲', '불꽃의 산', '심해 동굴', '빛의 탑'];
  const chapterIcons = ['&#127969;', '&#127794;', '&#127755;', '&#127754;', '&#9889;'];

  return (
    <div className="stage-page">
      <div className="stage-page-header">
        <h2>&#9876;&#65039; 스테이지</h2>
        <span className="stamina-badge"><CurrencyIcon type="stamina" />{user.stamina || 0}</span>
      </div>

      <div className="chapter-tabs">
        {chapterKeys.map(ch => (
          <button key={ch}
            className={`chapter-tab ${Number(ch) === activeChapter ? 'active' : ''}`}
            onClick={() => setActiveChapter(Number(ch))}>
            <span className="chapter-tab-num">Chapter {ch}</span>
            {chapterNames[ch - 1] || `챕터 ${ch}`}
          </button>
        ))}
      </div>

      <div className="stage-grid">
        {(chapters[activeChapter] || []).map(s => (
          <div key={s.id}
            className={`stage-card ${!s.unlocked ? 'locked' : ''} ${s.stars > 0 ? 'cleared' : ''}`}
            onClick={() => s.unlocked && setSelectedStage(s)}>
            <div className="stage-card-top">
              <span className="stage-number">{s.stageNumber}</span>
              <div className="stage-stars-display">
                {s.unlocked ? [1,2,3].map(i => (
                  <span key={i} className={i <= s.stars ? 'star-filled' : 'star-empty'}>&#9733;</span>
                )) : <span className="stage-lock-icon">&#128274;</span>}
              </div>
            </div>
            <div className="stage-card-name">{s.name}</div>
            <div className="stage-card-meta">
              <span className="meta-lv">Lv.{s.recommendedLevel}</span>
              <span className="meta-stamina"><CurrencyIcon type="stamina" />{s.staminaCost}</span>
            </div>
            {s.unlocked && (
              <div className="stage-card-rewards">
                <span className="reward-gold"><CurrencyIcon type="bit" />{s.rewards.gold}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {staminaPopup && (
        <div className="stamina-popup-overlay" onClick={() => setStaminaPopup(null)}>
          <div className="stamina-popup" onClick={e => e.stopPropagation()}>
            <h3>스태미나 부족</h3>
            <p className="stamina-popup-info">
              필요: <CurrencyIcon type="stamina" />{staminaPopup.need} / 보유: <CurrencyIcon type="stamina" />{user.stamina || 0}
            </p>
            {staminaPopup.items.length > 0 ? (
              <div className="stamina-popup-list">
                {staminaPopup.items.map(it => (
                  <div key={it.itemId} className="stamina-popup-item">
                    <span className="spi-icon" dangerouslySetInnerHTML={{ __html: it.icon || '&#9889;' }} />
                    <div className="spi-info">
                      <span className="spi-name">{it.name}</span>
                      <span className="spi-desc">{it.description}</span>
                    </div>
                    <span className="spi-qty">{it.quantity}개</span>
                    <button className="spi-use-btn" onClick={() => useStaminaDrink(it.itemId)}>사용</button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="stamina-popup-empty">사용 가능한 스태미나 음료가 없습니다.</p>
            )}
            <button className="stamina-popup-close" onClick={() => setStaminaPopup(null)}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}
