import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../utils/api';
import { bgm } from '../utils/bgm';
import { RARITY_COLORS } from '../utils/gameConstants';
import BattlePage from './BattlePage';
import DialogueBox from '../components/DialogueBox';
import PartyPresetEditor from '../components/PartyPresetEditor';
import PresetPicker from '../components/PresetPicker';
import CurrencyIcon from '../components/CurrencyIcon';
import usePartyPresets from '../hooks/usePartyPresets';
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
  const [battleSetup, setBattleSetup] = useState(null);
  const [storyScript, setStoryScript] = useState(null);
  const [scriptMode, setScriptMode] = useState(null);
  const [savedPartyIds, setSavedPartyIds] = useState(null);
  const [loading, setLoading] = useState(false);
  const [staminaPopup, setStaminaPopup] = useState(null);
  const [storyPreview, setStoryPreview] = useState(null);
  const dialogueRef = useRef(null);

  const {
    presets, characters, selectedPreset, setSelectedPreset,
    editingSlot, setEditingSlot,
    loadPresets, getCharByInvId, handlePresetSave,
  } = usePartyPresets(addToast);

  useEffect(() => { loadData(); }, [category]);

  const loadData = async () => {
    try {
      const [storyData] = await Promise.all([
        api.storyList(category), loadPresets()
      ]);
      setChapters(storyData.chapters);
      const keys = Object.keys(storyData.chapters).sort((a, b) => a - b);
      if (keys.length > 0 && !storyData.chapters[activeChapter]) {
        setActiveChapter(Number(keys[0]));
      }
    } catch (err) { addToast(err.message, 'error'); }
  };

  const handleNodeClick = async (node) => {
    if (!node.unlocked) return;

    if (node.nodeType === 'story') {
      setStoryPreview(node);
    } else if (node.cleared) {
      setSelectedNode(node);
      setLoading(true);
      try {
        const detail = await api.storyNode(node.id);
        if (detail.storyScript && detail.storyScript.length > 0) {
          const scriptWithoutBattle = detail.storyScript.filter(e => e.type !== 'battle');
          if (scriptWithoutBattle.length > 0) {
            setSavedPartyIds([]);
            setStoryScript(scriptWithoutBattle);
            setScriptMode('dialogue');
            if (detail.bgm) bgm.play(detail.bgm);
          } else {
            addToast('이미 클리어한 전투입니다', 'info');
            setSelectedNode(null);
          }
        } else {
          addToast('이미 클리어한 전투입니다', 'info');
          setSelectedNode(null);
        }
      } catch (err) { addToast(err.message, 'error'); setSelectedNode(null); }
      setLoading(false);
    } else if (node.fixedParty && node.fixedParty.length > 0) {
      setSelectedNode(node);
      setLoading(true);
      try {
        const detail = await api.storyNode(node.id);
        if (!detail.storyScript || detail.storyScript.length === 0) {
          addToast('스토리 스크립트가 없습니다', 'error');
          setSelectedNode(null);
          setLoading(false);
          return;
        }
        setSavedPartyIds([]);
        setStoryScript(detail.storyScript);
        setScriptMode('dialogue');
        if (detail.bgm) bgm.play(detail.bgm);
      } catch (err) { addToast(err.message, 'error'); setSelectedNode(null); }
      setLoading(false);
    } else {
      setSelectedNode(node);
    }
  };

  const handleStoryStart = async () => {
    if (!storyPreview) return;
    const node = storyPreview;
    setStoryPreview(null);
    setLoading(true);
    try {
      const detail = await api.storyNode(node.id);
      if (detail.storyScript) {
        setSelectedNode(node);
        setStoryScript(detail.storyScript);
        if (detail.bgm) bgm.play(detail.bgm);
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
    bgm.play('story');
  };

  const startBattle = async () => {
    if (!selectedPreset) return addToast('프리셋을 선택하세요', 'error');
    const guestCount = selectedNode?.requiredGuests?.length || 0;
    const maxSlots = 3 - guestCount;
    let partyIds = selectedPreset.partyIds;
    if (guestCount > 0) {
      partyIds = partyIds.slice(0, maxSlots);
    }
    if (partyIds.length === 0) return addToast('빈 프리셋입니다. 편성 탭에서 먼저 편성하세요', 'error');
    setLoading(true);
    try {
      const detail = await api.storyNode(selectedNode.id);
      if (!detail.storyScript || detail.storyScript.length === 0) {
        addToast('스토리 스크립트가 없습니다', 'error');
        setLoading(false);
        return;
      }
      setSavedPartyIds(partyIds);
      setStoryScript(detail.storyScript);
      setScriptMode('dialogue');
      if (detail.bgm) bgm.play(detail.bgm);
    } catch (err) {
      addToast(err.message, 'error');
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

  const handleScriptBattle = useCallback(async (entry) => {
    try {
      const result = await api.storyBattleStart(selectedNode.id, savedPartyIds, entry.enemies, entry.party, { initialBuffs: entry.initialBuffs, initialStacks: entry.initialStacks });
      const setup = { ...result.setup, partyIds: savedPartyIds, guide: entry.guide || null };
      if (entry.stageName) setup.stageName = entry.stageName;
      setBattleSetup(setup);
      setScriptMode('battle');
    } catch (err) {
      addToast(err.message, 'error');
      dialogueRef.current?.advance();
    }
  }, [selectedNode, savedPartyIds, addToast]);

  const handleScriptBattleEnd = useCallback(async (battleLog) => {
    try {
      const result = await api.storyBattleEnd(battleLog);
      if (!result.victory) {
        addToast('패배...', 'error');
        setBattleSetup(null);
        setStoryScript(null);
        setScriptMode(null);
        setSelectedNode(null);
        setSelectedPreset(null);
        setSavedPartyIds(null);
        return;
      }
    } catch (err) {
      addToast(err.message, 'error');
    }
    setBattleSetup(null);
    setScriptMode('dialogue');
    setTimeout(() => dialogueRef.current?.advance(), 100);
  }, [addToast]);

  const handleScriptEnd = useCallback(async () => {
    try {
      const result = await api.storyRead(selectedNode.id);
      if (result.firstClear) {
        addToast('클리어!', 'sr');
      }
      onRefresh();
    } catch (err) {
      addToast(err.message, 'error');
    }
    setStoryScript(null);
    setScriptMode(null);
    setSelectedNode(null);
    setSelectedPreset(null);
    setSavedPartyIds(null);
    setBattleSetup(null);
    loadData();
    bgm.play('story');
  }, [selectedNode, addToast, onRefresh]);

  // --- Render states ---

  if (scriptMode && storyScript) {
    return (
      <div className="story-page">
        <div style={{ display: scriptMode === 'dialogue' ? 'contents' : 'none' }}>
          <DialogueBox
            ref={dialogueRef}
            script={storyScript}
            onEnd={handleScriptEnd}
            onBattle={handleScriptBattle}
          />
        </div>
        {scriptMode === 'battle' && battleSetup && (
          <BattlePage setup={battleSetup} onBattleEnd={handleScriptBattleEnd} partyIds={savedPartyIds} />
        )}
      </div>
    );
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
    const guests = selectedNode.requiredGuests || [];
    const maxUserSlots = 3 - guests.length;

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

        {guests.length > 0 && (
          <div className="story-guest-section">
            <h3>&#127775; 게스트 캐릭터</h3>
            <div className="story-guest-list">
              {guests.map((g, i) => (
                <div key={i} className="story-guest-card">
                  <div className="story-guest-portrait">
                    {(g.image_bust || g.image_url)
                      ? <img src={g.image_bust || g.image_url} alt={g.name || ''} />
                      : <span className="story-guest-initial">{(g.name || '?')[0]}</span>}
                    <span className="story-guest-badge">GUEST</span>
                  </div>
                  <div className="story-guest-info">
                    <span className="story-guest-name">{g.name || `#${g.charId}`}</span>
                    <span className="story-guest-meta">
                      <span className="story-guest-rarity" style={{ color: RARITY_COLORS[g.rarity] === 'rainbow' ? '#ff6b6b' : RARITY_COLORS[g.rarity] }}>{g.rarity}</span>
                      <span className="story-guest-lv">Lv.{g.level || 1}</span>
                      {g.awakening > 0 && <span className="story-guest-awaken">{'★'.repeat(g.awakening)}</span>}
                      {g.promotion > 0 && <span className="story-guest-promo">{'▲'.repeat(g.promotion)}</span>}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {maxUserSlots > 0 && (
              <p className="story-guest-hint">{'나머지 '}{maxUserSlots}{'명은 직접 편성하세요'}</p>
            )}
          </div>
        )}

        <PresetPicker
          presets={presets}
          selectedPreset={selectedPreset}
          onSelect={setSelectedPreset}
          onEdit={setEditingSlot}
          getCharByInvId={getCharByInvId}
          maxSlots={guests.length > 0 ? maxUserSlots : undefined}
        />

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
      <div className="story-sticky-header">
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

        {chapterKeys.length > 0 && (
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
        )}
      </div>

      {chapterKeys.length === 0 ? (
        <div className="story-empty">
          <p>아직 등록된 스토리가 없습니다.</p>
        </div>
      ) : (
        <div className="story-node-list">
          {(chapters[activeChapter] || []).filter(n => n.unlocked).map(n => (
            <div key={n.id}
              className={`story-node-card ${n.cleared ? 'cleared' : ''} ${n.nodeType}`}
              onClick={() => !loading && handleNodeClick(n)}>
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
                {n.cleared ? (
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
      )}

      {storyPreview && (
        <div className="story-preview-overlay" onClick={() => setStoryPreview(null)}>
          <div className="story-preview-modal" onClick={e => e.stopPropagation()}>
            <button className="story-preview-close" onClick={() => setStoryPreview(null)}>&times;</button>
            <div className="story-preview-header">
              <span className="story-preview-chapter">{storyPreview.chapter}-{storyPreview.nodeNumber}</span>
              <h3 className="story-preview-title">{storyPreview.title}{storyPreview.cleared && <span className="story-preview-check">&#10003;</span>}</h3>
            </div>
            <div className="story-preview-body">
              {storyPreview.description ? (
                <p className="story-preview-desc">{storyPreview.description}</p>
              ) : (
                <p className="story-preview-desc muted">...</p>
              )}
            </div>
            <div className="story-preview-actions">
              <button className="story-preview-start" onClick={handleStoryStart} disabled={loading}>
                {loading ? '로딩...' : '시작하기'}
              </button>
            </div>
          </div>
        </div>
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
