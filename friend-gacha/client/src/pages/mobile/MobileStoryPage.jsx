import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../utils/api';
import { bgm } from '../../utils/bgm';
import BattlePage from '../BattlePage';
import DialogueBox from '../../components/DialogueBox';
import PartyPresetEditor from '../../components/PartyPresetEditor';
import CurrencyIcon from '../../components/CurrencyIcon';
import LoadingOverlay from '../../components/LoadingOverlay';
import './MobileStoryPage.css';

const CATEGORIES = [
  { key: 'main', label: '메인' },
  { key: 'character', label: '캐릭터' },
  { key: 'event', label: '이벤트' },
];

export default function MobileStoryPage({ user, onRefresh, addToast }) {
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
  const [scriptMode, setScriptMode] = useState(null);
  const [savedPartyIds, setSavedPartyIds] = useState(null);
  const [loading, setLoading] = useState(false);
  const [staminaPopup, setStaminaPopup] = useState(null);
  const [storyPreview, setStoryPreview] = useState(null);
  const [ready, setReady] = useState(false);
  const dialogueRef = useRef(null);

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
    setReady(true);
  };

  const getCharByInvId = (invId) => characters.find(c => c.inventory_id === invId);

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
        if (result.firstClear) addToast('스토리 읽기 완료!', 'sr');
        onRefresh();
        loadData();
      }
    } catch (err) { addToast(err.message, 'error'); }
    setLoading(false);
  };

  const handleStoryEnd = async () => {
    try {
      const result = await api.storyRead(selectedNode.id);
      if (result.firstClear) addToast('스토리 읽기 완료!', 'sr');
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
    } catch (err) { addToast(err.message, 'error'); }
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
      const result = await api.storyBattleStart(selectedNode.id, savedPartyIds, entry.enemies);
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
    } catch (err) { addToast(err.message, 'error'); }
    setBattleSetup(null);
    setScriptMode('dialogue');
    setTimeout(() => dialogueRef.current?.advance(), 100);
  }, [addToast]);

  const handleScriptEnd = useCallback(async () => {
    try {
      const result = await api.storyRead(selectedNode.id);
      if (result.firstClear) addToast('클리어!', 'sr');
      onRefresh();
    } catch (err) { addToast(err.message, 'error'); }
    setStoryScript(null);
    setScriptMode(null);
    setSelectedNode(null);
    setSelectedPreset(null);
    setSavedPartyIds(null);
    setBattleSetup(null);
    loadData();
    bgm.play('story');
  }, [selectedNode, addToast, onRefresh]);

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

  if (!ready) return <LoadingOverlay />;

  if (scriptMode && storyScript) {
    return (
      <div className="ms-page ms-fullscreen">
        <div style={{ display: scriptMode === 'dialogue' ? 'contents' : 'none' }}>
          <DialogueBox ref={dialogueRef} script={storyScript} onEnd={handleScriptEnd} onBattle={handleScriptBattle} />
        </div>
        {scriptMode === 'battle' && battleSetup && (
          <BattlePage setup={battleSetup} onBattleEnd={handleScriptBattleEnd} partyIds={savedPartyIds} />
        )}
      </div>
    );
  }

  if (storyScript && selectedNode) {
    return (
      <div className="ms-page ms-fullscreen">
        <DialogueBox script={storyScript} onEnd={handleStoryEnd} />
      </div>
    );
  }

  if (selectedNode && selectedNode.nodeType === 'battle' && editingSlot !== null) {
    const preset = presets.find(p => p.slot === editingSlot);
    return (
      <div className="ms-page ms-fullscreen">
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
      <div className="ms-page ms-detail">
        <button className="ms-back" onClick={() => { setSelectedNode(null); setSelectedPreset(null); }}>
          &larr; {'돌아가기'}
        </button>

        <div className="ms-battle-card">
          <h3>{selectedNode.chapter}-{selectedNode.nodeNumber} {selectedNode.title}</h3>
          <div className="ms-battle-meta">
            <span className="ms-type-badge battle">&#9876; 전투</span>
            <span className="ms-meta-lv">Lv.{selectedNode.recommendedLevel}</span>
            {selectedNode.staminaCost > 0 && (
              <span className="ms-meta-stamina"><CurrencyIcon type="stamina" />{selectedNode.staminaCost}</span>
            )}
            <span>{[1,2,3].map(i => (
              <span key={i} className={i <= selectedNode.stars ? 'star-filled' : 'star-empty'}>&#9733;</span>
            ))}</span>
          </div>
          {selectedNode.rewards && (
            <div className="ms-rewards">
              {selectedNode.rewards.gold > 0 && (
                <span className="ms-reward-gold"><CurrencyIcon type="bit" />{selectedNode.rewards.gold}</span>
              )}
              {selectedNode.stars === 0 && selectedNode.rewards.first_clear_diamond > 0 && (
                <span className="ms-reward-dia"><CurrencyIcon type="prism" />{selectedNode.rewards.first_clear_diamond} (첫 클리어)</span>
              )}
            </div>
          )}
        </div>

        {guests.length > 0 && (
          <div className="ms-guest-section">
            <h4>&#127775; 게스트 캐릭터</h4>
            <div className="ms-guest-list">
              {guests.map((g, i) => (
                <div key={i} className="ms-guest-card">
                  <span className="ms-guest-badge">GUEST</span>
                  <span className="ms-guest-name">#{g.charId}</span>
                  <span className="ms-guest-lv">Lv.{g.level || 1}</span>
                </div>
              ))}
            </div>
            {maxUserSlots > 0 && (
              <p className="ms-guest-hint">{'나머지 '}{maxUserSlots}{'명은 직접 편성하세요'}</p>
            )}
          </div>
        )}

        <div className="ms-preset-section">
          <h4>&#9876;&#65039; 프리셋 선택</h4>
          <div className="ms-preset-list">
            {presets.map(p => {
              const allMembers = p.partyIds.map(id => getCharByInvId(id)).filter(Boolean);
              const members = guests.length > 0 ? allMembers.slice(0, maxUserSlots) : allMembers;
              const isSelected = selectedPreset?.slot === p.slot;
              return (
                <div key={p.slot}
                  className={`ms-preset-card ${isSelected ? 'selected' : ''} ${members.length === 0 ? 'empty' : ''}`}
                  onClick={() => members.length > 0 && setSelectedPreset(p)}>
                  <div className="ms-preset-header">
                    <span className="ms-preset-num">{p.slot + 1}</span>
                    <span className="ms-preset-name">{p.name}</span>
                    <button className="ms-preset-edit" onClick={(e) => {
                      e.stopPropagation();
                      setEditingSlot(p.slot);
                    }} dangerouslySetInnerHTML={{ __html: '&#9998;' }} />
                  </div>
                  {members.length > 0 ? (
                    <div className="ms-preset-members">
                      {members.map(c => (
                        <div key={c.inventory_id} className="ms-preset-member">
                          <div className="ms-pm-avatar">
                            {c.image_url ? <img src={c.image_url} alt={c.name} /> : c.name?.[0]}
                          </div>
                          <div className="ms-pm-info">
                            <span className="ms-pm-name">{c.name}</span>
                            <span className="ms-pm-lv">Lv.{c.level}</span>
                          </div>
                        </div>
                      ))}
                      <div className="ms-preset-power">ATK {members.reduce((s, c) => s + c.stats.atk, 0)}</div>
                    </div>
                  ) : (
                    <div className="ms-preset-empty" onClick={(e) => {
                      e.stopPropagation();
                      setEditingSlot(p.slot);
                    }}>+ 편성하기</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button className="ms-start-btn" onClick={startBattle} disabled={loading || !selectedPreset}>
          {loading ? '준비 중...' : '전투 시작!'}
        </button>
      </div>
    );
  }

  const chapterKeys = Object.keys(chapters).sort((a, b) => a - b);

  return (
    <div className="ms-page">
      <div className="ms-header">
        <h2>&#128214; 스토리</h2>
        <span className="ms-stamina"><CurrencyIcon type="stamina" />{user.stamina || 0}</span>
      </div>

      <div className="ms-cat-tabs">
        {CATEGORIES.map(c => (
          <button key={c.key}
            className={`ms-cat-tab ${category === c.key ? 'active' : ''}`}
            onClick={() => { setCategory(c.key); setActiveChapter(1); setSelectedNode(null); }}>
            {c.label}
          </button>
        ))}
      </div>

      {chapterKeys.length === 0 ? (
        <div className="ms-empty">아직 등록된 스토리가 없습니다.</div>
      ) : (
        <>
          <div className="ms-chapter-tabs">
            {chapterKeys.map(ch => {
              const chNum = Number(ch);
              const nodes = chapters[ch] || [];
              const allCleared = nodes.every(n => n.cleared);
              return (
                <button key={ch}
                  className={`ms-chapter-tab ${chNum === activeChapter ? 'active' : ''} ${allCleared ? 'cleared' : ''}`}
                  onClick={() => setActiveChapter(chNum)}>
                  {chNum}장
                </button>
              );
            })}
          </div>

          <div className="ms-node-list">
            {(chapters[activeChapter] || []).map(n => (
              <div key={n.id}
                className={`ms-node ${!n.unlocked ? 'locked' : ''} ${n.cleared ? 'cleared' : ''} ${n.nodeType}`}
                onClick={() => n.unlocked && !loading && handleNodeClick(n)}>
                <div className="ms-node-num">
                  {activeChapter}-{n.nodeNumber}
                </div>
                <div className="ms-node-info">
                  <span className="ms-node-title">{n.title}</span>
                  <div className="ms-node-meta">
                    {n.nodeType === 'battle' ? (
                      <>
                        <span className="ms-type-badge battle">&#9876;</span>
                        <span className="ms-meta-lv">Lv.{n.recommendedLevel}</span>
                        {n.staminaCost > 0 && (
                          <span className="ms-meta-stamina"><CurrencyIcon type="stamina" />{n.staminaCost}</span>
                        )}
                      </>
                    ) : (
                      <span className="ms-type-badge story">&#128214;</span>
                    )}
                  </div>
                </div>
                <div className="ms-node-status">
                  {!n.unlocked ? (
                    <span className="ms-lock">&#128274;</span>
                  ) : n.cleared ? (
                    n.nodeType === 'battle' ? (
                      <span className="ms-stars">
                        {[1,2,3].map(i => (
                          <span key={i} className={i <= n.stars ? 'star-filled' : 'star-empty'}>&#9733;</span>
                        ))}
                      </span>
                    ) : (
                      <span className="ms-check">&#10003;</span>
                    )
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {storyPreview && (
        <div className="ms-preview-overlay" onClick={() => setStoryPreview(null)}>
          <div className="ms-preview-modal" onClick={e => e.stopPropagation()}>
            <button className="ms-preview-close" onClick={() => setStoryPreview(null)}>&times;</button>
            <div className="ms-preview-header">
              <span className="ms-preview-ch">{storyPreview.chapter}-{storyPreview.nodeNumber}</span>
              <h3>{storyPreview.title}{storyPreview.cleared && <span className="ms-preview-done">&#10003;</span>}</h3>
            </div>
            <div className="ms-preview-body">
              {storyPreview.description ? (
                <p>{storyPreview.description}</p>
              ) : (
                <p className="ms-preview-muted">...</p>
              )}
            </div>
            <button className="ms-preview-start" onClick={handleStoryStart} disabled={loading}>
              {loading ? '로딩...' : '시작하기'}
            </button>
          </div>
        </div>
      )}

      {staminaPopup && (
        <div className="ms-stamina-overlay" onClick={() => setStaminaPopup(null)}>
          <div className="ms-stamina-popup" onClick={e => e.stopPropagation()}>
            <h3>스태미나 부족</h3>
            <p className="ms-stamina-info">
              필요: <CurrencyIcon type="stamina" />{staminaPopup.need} / 보유: <CurrencyIcon type="stamina" />{user.stamina || 0}
            </p>
            {staminaPopup.items.length > 0 ? (
              <div className="ms-stamina-list">
                {staminaPopup.items.map(it => (
                  <div key={it.itemId} className="ms-stamina-item">
                    <span className="ms-si-icon" dangerouslySetInnerHTML={{ __html: it.icon || '&#9889;' }} />
                    <div className="ms-si-info">
                      <span className="ms-si-name">{it.name}</span>
                      <span className="ms-si-desc">{it.description}</span>
                    </div>
                    <span className="ms-si-qty">{it.quantity}개</span>
                    <button className="ms-si-use" onClick={() => useStaminaDrink(it.itemId)}>사용</button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="ms-stamina-empty">사용 가능한 스태미나 음료가 없습니다.</p>
            )}
            <button className="ms-stamina-close" onClick={() => setStaminaPopup(null)}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}
