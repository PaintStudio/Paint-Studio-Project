import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import BattlePage from './BattlePage';
import DialogueBox from '../components/DialogueBox';
import PartyPresetEditor from '../components/PartyPresetEditor';
import CurrencyIcon from '../components/CurrencyIcon';
import './StoryPage.css';

const CATEGORIES = [
  { key: 'main', label: '메인 스토리' },
  { key: 'character', label: '캐릭터 스토리' },
  { key: 'event', label: '이벤트 스토리' },
];

export default function StoryPage({ user, onRefresh, addToast }) {
  const [category, setCategory] = useState('main');
  const [chapters, setChapters] = useState({});
  const [activeChapter, setActiveChapter] = useState(1);
  const [selectedNode, setSelectedNode] = useState(null);
  const [presets, setPresets] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [editingSlot, setEditingSlot] = useState(null);
  const [battleSetup, setBattleSetup] = useState(null);
  const [storyScript, setStoryScript] = useState(null);
  const [loading, setLoading] = useState(false);
  const [staminaPopup, setStaminaPopup] = useState(null);

  useEffect(() => { loadData(); }, [category]);

  const loadData = async () => {
    try {
      const [storyData, charData, presetData] = await Promise.all([
        api.storyList(category), api.partyList(), api.partyPresets()
      ]);
      setChapters(storyData.chapters);
      setCharacters(charData.characters);
      setPresets(presetData.presets);
      const keys = Object.keys(storyData.chapters).sort((a, b) => a - b);
      if (keys.length > 0 && !storyData.chapters[activeChapter]) {
        setActiveChapter(Number(keys[0]));
      }
    } catch (err) { addToast(err.message, 'error'); }
  };

  const getCharByInvId = (invId) => characters.find(c => c.inventory_id === invId);

  const handleNodeClick = async (node) => {
    if (!node.unlocked) return;

    if (node.nodeType === 'story') {
      setLoading(true);
      try {
        const detail = await api.storyNode(node.id);
        if (detail.storyScript) {
          setSelectedNode(node);
          setStoryScript(detail.storyScript);
        } else {
          const result = await api.storyRead(node.id);
          if (result.firstClear) {
            addToast('스토리 읽기 완료!', 'sr');
          }
          onRefresh();
          loadData();
        }
      } catch (err) { addToast(err.message, 'error'); }
      setLoading(false);
    } else {
      setSelectedNode(node);
    }
  };

  const handleStoryEnd = async () => {
    try {
      const result = await api.storyRead(selectedNode.id);
      if (result.firstClear) {
        addToast('스토리 읽기 완료!', 'sr');
      }
    } catch (err) { addToast(err.message, 'error'); }
    setStoryScript(null);
    setSelectedNode(null);
    onRefresh();
    loadData();
  };

  const startBattle = async () => {
    if (!selectedPreset) return addToast('프리셋을 선택하세요', 'error');
    const partyIds = selectedPreset.partyIds;
    if (partyIds.length === 0) return addToast('빈 프리셋입니다. 편성 탭에서 먼저 편성하세요', 'error');
    setLoading(true);
    try {
      const result = await api.storyBattleStart(selectedNode.id, partyIds);
      const setup = { ...result.setup, partyIds, nodeId: selectedNode.id };
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
      setStaminaPopup({ items: staminaItems, need: selectedNode?.staminaCost || 0 });
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
      const result = await api.storyBattleEnd(selectedNode.id, battleLog);
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
    setSelectedNode(null);
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

  // --- Render states ---

  if (battleSetup && storyScript) {
    return (
      <div className="story-page">
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

  if (storyScript && selectedNode) {
    return (
      <div className="story-page">
        <DialogueBox
          script={storyScript}
          onEnd={handleStoryEnd}
        />
      </div>
    );
  }

  if (selectedNode && selectedNode.nodeType === 'battle' && editingSlot !== null) {
    const preset = presets.find(p => p.slot === editingSlot);
    return (
      <div className="story-page">
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

  if (selectedNode && selectedNode.nodeType === 'battle') {
    return (
      <div className="story-page story-detail-page">
        <button className="btn-back" onClick={() => { setSelectedNode(null); setSelectedPreset(null); }}>&larr; 돌아가기</button>
        <div className="story-detail-card">
          <h2>{selectedNode.chapter}-{selectedNode.nodeNumber} {selectedNode.title}</h2>
          <div className="story-meta">
            <span className="story-type-badge battle">&#9876; 전투</span>
            <span className="meta-lv">Lv.{selectedNode.recommendedLevel}</span>
            {selectedNode.staminaCost > 0 && (
              <span className="meta-stamina"><CurrencyIcon type="stamina" />{selectedNode.staminaCost}</span>
            )}
            <span>{[1,2,3].map(i => (
              <span key={i} className={i <= selectedNode.stars ? 'star-filled' : 'star-empty'}>&#9733;</span>
            ))}</span>
          </div>
          {selectedNode.rewards && (
            <div className="story-rewards-detail">
              {selectedNode.rewards.gold > 0 && (
                <span className="reward-gold"><CurrencyIcon type="bit" />{selectedNode.rewards.gold}</span>
              )}
              {selectedNode.stars === 0 && selectedNode.rewards.first_clear_diamond > 0 && (
                <span className="reward-diamond"><CurrencyIcon type="prism" />{selectedNode.rewards.first_clear_diamond} (첫 클리어)</span>
              )}
            </div>
          )}
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

  // --- Main list view ---
  const chapterKeys = Object.keys(chapters).sort((a, b) => a - b);

  return (
    <div className="story-page">
      <div className="story-page-header">
        <h2>&#128214; 스토리</h2>
        <span className="stamina-badge"><CurrencyIcon type="stamina" />{user.stamina || 0}</span>
      </div>

      <div className="story-category-tabs">
        {CATEGORIES.map(c => (
          <button key={c.key}
            className={`story-cat-tab ${category === c.key ? 'active' : ''}`}
            onClick={() => { setCategory(c.key); setActiveChapter(1); setSelectedNode(null); }}>
            {c.label}
          </button>
        ))}
      </div>

      {chapterKeys.length === 0 ? (
        <div className="story-empty">
          <p>아직 등록된 스토리가 없습니다.</p>
        </div>
      ) : (
        <>
          <div className="story-chapter-tabs">
            {chapterKeys.map(ch => {
              const chNum = Number(ch);
              const nodes = chapters[ch] || [];
              const allCleared = nodes.every(n => n.cleared);
              return (
                <button key={ch}
                  className={`story-chapter-tab ${chNum === activeChapter ? 'active' : ''} ${allCleared ? 'cleared' : ''}`}
                  onClick={() => setActiveChapter(chNum)}>
                  <span className="story-ch-num">{chNum}장</span>
                </button>
              );
            })}
          </div>

          <div className="story-node-list">
            {(chapters[activeChapter] || []).map(n => (
              <div key={n.id}
                className={`story-node-card ${!n.unlocked ? 'locked' : ''} ${n.cleared ? 'cleared' : ''} ${n.nodeType}`}
                onClick={() => n.unlocked && !loading && handleNodeClick(n)}>
                <div className="story-node-number">
                  {activeChapter}-{n.nodeNumber}
                </div>
                <div className="story-node-info">
                  <span className="story-node-title">{n.title}</span>
                  <div className="story-node-meta">
                    {n.nodeType === 'battle' ? (
                      <>
                        <span className="story-type-badge battle">&#9876; 전투</span>
                        <span className="meta-lv">Lv.{n.recommendedLevel}</span>
                        {n.staminaCost > 0 && (
                          <span className="meta-stamina"><CurrencyIcon type="stamina" />{n.staminaCost}</span>
                        )}
                      </>
                    ) : (
                      <span className="story-type-badge story">&#128214; 스토리</span>
                    )}
                  </div>
                </div>
                <div className="story-node-status">
                  {!n.unlocked ? (
                    <span className="story-lock-icon">&#128274;</span>
                  ) : n.cleared ? (
                    n.nodeType === 'battle' ? (
                      <span className="story-stars">
                        {[1,2,3].map(i => (
                          <span key={i} className={i <= n.stars ? 'star-filled' : 'star-empty'}>&#9733;</span>
                        ))}
                      </span>
                    ) : (
                      <span className="story-check">&#10003;</span>
                    )
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

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
