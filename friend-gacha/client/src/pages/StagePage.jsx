import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { bgm } from '../utils/bgm';
import BattlePage from './BattlePage';
import PartyPresetEditor from '../components/PartyPresetEditor';
import PresetPicker from '../components/PresetPicker';
import CurrencyIcon from '../components/CurrencyIcon';
import usePartyPresets from '../hooks/usePartyPresets';
import './StagePage.css';

export default function StagePage({ user, onRefresh, addToast }) {
  const [selectedStage, setSelectedStage] = useState(null);
  const [battleSetup, setBattleSetup] = useState(null);
  const [loading, setLoading] = useState(false);
  const [staminaPopup, setStaminaPopup] = useState(null);
  const [normalStages, setNormalStages] = useState([]);

  const {
    presets, characters, selectedPreset, setSelectedPreset,
    editingSlot, setEditingSlot,
    loadPresets, getCharByInvId, handlePresetSave,
  } = usePartyPresets(addToast);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [, farmData] = await Promise.all([
        loadPresets(),
        api.farmingList()
      ]);
      const normalGroup = (farmData.dungeons || []).find(d => d.type === 'normal');
      setNormalStages(normalGroup ? normalGroup.stages : []);
    } catch (err) { addToast(err.message, 'error'); }
  };

  const startBattle = async () => {
    if (!selectedPreset) return addToast('프리셋을 선택하세요', 'error');
    const partyIds = selectedPreset.partyIds;
    if (partyIds.length === 0) return addToast('빈 프리셋입니다. 편성 탭에서 먼저 편성하세요', 'error');
    setLoading(true);
    try {
      const result = await api.farmingBattleStart(selectedStage.id, partyIds);
      setBattleSetup({ ...result.setup, partyIds });
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
      const result = await api.farmingBattleEnd(selectedStage.id, battleLog);
      if (result.rewards) {
        addToast(`승리! +${result.rewards.gold}B${result.rewards.firstClear?.prism ? ` +${result.rewards.firstClear.prism} 프리즘` : (result.rewards.diamond ? ` +${result.rewards.diamond} 프리즘` : '')}`, 'sr');
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
    bgm.play('battle_hub');
  };

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
          <span className="stage-detail-stamina"><CurrencyIcon type="stamina" />{selectedStage.staminaCost}</span>
          <h2>{selectedStage.name}</h2>
          <div className="stage-meta">
            <span className="meta-lv">&#9876; Lv.{selectedStage.recommendedLevel}</span>
            {selectedStage.cleared && <span className="stage-cleared-badge">&#10003;</span>}
          </div>
          <div className="stage-rewards-detail">
            <span className="reward-gold"><CurrencyIcon type="bit" />{selectedStage.rewards.gold}</span>
            {!selectedStage.cleared && selectedStage.rewards.firstClear && (
              <span className="reward-diamond"><CurrencyIcon type="prism" />{selectedStage.rewards.firstClear.prism} (첫 클리어)</span>
            )}
          </div>
        </div>

        <PresetPicker
          presets={presets}
          selectedPreset={selectedPreset}
          onSelect={setSelectedPreset}
          onEdit={setEditingSlot}
          getCharByInvId={getCharByInvId}
        />

        <button className="btn-primary battle-start-btn" onClick={startBattle} disabled={loading || !selectedPreset}>
          {loading ? '준비 중...' : '전투 시작!'}
        </button>
      </div>
    );
  }

  return (
    <div className="stage-page">
      <div className="stage-page-header">
        <h2>&#9876;&#65039; 스테이지</h2>
        <span className="stamina-badge"><CurrencyIcon type="stamina" />{user.stamina || 0}</span>
      </div>

      <div className="stage-grid">
        {normalStages.map(s => (
          <div key={s.id}
            className={`stage-card ${s.cleared ? 'cleared' : ''}`}
            onClick={() => setSelectedStage(s)}>
            <div className="stage-card-top">
              <span className="stage-number">Lv.{s.recommendedLevel}</span>
              {s.cleared && <span className="stage-cleared-check">&#10003;</span>}
            </div>
            <div className="stage-card-name">{s.name}</div>
            <div className="stage-card-meta">
              <span className="meta-stamina"><CurrencyIcon type="stamina" />{s.staminaCost}</span>
              <span className="reward-gold"><CurrencyIcon type="bit" />{s.rewards.gold}</span>
            </div>
            {!s.cleared && s.rewards.firstClear && (
              <div className="stage-card-rewards">
                <span className="reward-diamond"><CurrencyIcon type="prism" />{s.rewards.firstClear.prism}</span>
              </div>
            )}
          </div>
        ))}
        {normalStages.length === 0 && <p className="stage-empty">등록된 던전이 없습니다.</p>}
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
