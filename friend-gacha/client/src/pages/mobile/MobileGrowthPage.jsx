import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../utils/api';
import gameConfig from '@gameConfig';
import CharacterGrid from '../../components/CharacterGrid';
import DialogueBubble from '../../components/DialogueBubble';
import { ElementModal, OriginModal } from '../../components/InfoModals';
import { loadDialogues, getLine, getPromotionLine } from '../../utils/dialogues';
import LoadingOverlay from '../../components/LoadingOverlay';
import { ELEM_ICONS, ELEM_COLORS, ELEM_LABELS, ORIGIN_LABELS, ORIGIN_COLORS, RARITY_COLORS, SKILL_TYPE_LABELS, SKILL_TYPE_COLORS, getRarityStyle, RARITY_ORDER_LIST, canEquipSkill, simulateLevelUp, calcExpToMax } from '../../utils/gameConstants';
import './MobileGrowthPage.css';

function preloadImgUrls(urls) {
  if (!urls || urls.length === 0) return Promise.resolve();
  return Promise.all(urls.map(u => new Promise(r => { const img = new Image(); img.onload = img.onerror = r; img.src = u; })));
}

function MSkillCard({ skill, equipped, onAction, actionLabel, count, disabled, disabledReason }) {
  return (
    <div className={`mg-sk-card ${equipped ? 'mg-sk-equipped' : ''} ${disabled ? 'mg-sk-disabled' : ''}`}
      onClick={disabled ? undefined : onAction}>
      <div className="mg-sk-header">
        {skill.icon
          ? <img className="mg-sk-icon" src={skill.icon} alt="" />
          : <span className="mg-sk-type" style={{ background: SKILL_TYPE_COLORS[skill.type] || '#666' }}>{SKILL_TYPE_LABELS[skill.type] || skill.type}</span>}
        {skill.element && skill.element !== 'neutral' && (
          <span className="mg-sk-elem" style={{ color: ELEM_COLORS[skill.element] }} dangerouslySetInnerHTML={{ __html: ELEM_ICONS[skill.element] + ' ' + ELEM_LABELS[skill.element] }} />
        )}
        <span className="mg-sk-name">{skill.name}{equipped !== undefined && equipped && ' ✓'}</span>
        {count > 1 && <span className="mg-sk-count">{'×'}{count}</span>}
        {skill.isFixed && <span className="mg-sk-fixed">{'🔒'}</span>}
      </div>
      {disabled && disabledReason && <p className="mg-sk-condition">{disabledReason}</p>}
      {!disabled && skill.description && <p className="mg-sk-desc">{skill.description}</p>}
      <div className="mg-sk-footer">
        <span className="mg-sk-cost">
          {'♪'} {skill.cost}
          {skill.power > 0 ? ` · ${Math.round(skill.power * 100)}%` : ''}
          {skill.defense_mult > 0 ? ` · 방어${Math.round(skill.defense_mult * 100)}%` : ''}
          {skill.cooldown > 0 && <span className="mg-sk-cd"> {'·'} CD {skill.cooldown}</span>}
        </span>
        {actionLabel && !disabled && <button className="mg-sk-action" onClick={(e) => { e.stopPropagation(); onAction(); }}>{actionLabel}</button>}
      </div>
    </div>
  );
}

const POOL_PAGE_SIZE = 6;

export default function MobileGrowthPage({ user, onRefresh, addToast }) {
  const [characters, setCharacters] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [dupes, setDupes] = useState([]);
  const [activeTab, setActiveTab] = useState('skills');
  const [poolPage, setPoolPage] = useState(0);
  const [promoInfo, setPromoInfo] = useState(null);
  const [expItems, setExpItems] = useState([]);
  const [itemUse, setItemUse] = useState({});
  const [bustZoom, setBustZoom] = useState(false);
  const [growthBubble, setGrowthBubble] = useState(null);
  const [promoCutscene, setPromoCutscene] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(null);
  const [pageReady, setPageReady] = useState(false);
  const holdRef = useRef({ timer: null, interval: null });
  const decHoldRef = useRef({ timer: null, interval: null });

  useEffect(() => {
    (async () => {
      const chars = await loadChars();
      const urls = chars.map(c => c.image_bust || c.image_url).filter(Boolean);
      await preloadImgUrls(urls);
      setPageReady(true);
    })();
    loadExpItems(); loadDialogues();
  }, []);

  const loadExpItems = async () => {
    try {
      const data = await api.myItems();
      setExpItems((data.items || []).filter(it => it.effect?.type === 'exp'));
    } catch {}
  };

  const loadChars = async () => {
    try {
      const data = await api.partyList();
      setCharacters(data.characters);
      return data.characters;
    } catch (err) { addToast(err.message, 'error'); return []; }
  };

  const loadDetail = async (invId, freshChars) => {
    try {
      const data = await api.charDetail(invId);
      setDetail(data);
      const list = freshChars || characters;
      setDupes(list.filter(c => c.character_id === data.characterId && c.inventory_id !== invId && c.is_locked !== 1));
    } catch (err) { addToast(err.message, 'error'); }
  };

  const selectChar = (c) => {
    setSelected(c.inventory_id);
    setActiveTab('skills');
    setPoolPage(0);
    setPromoInfo(null);
    setItemUse({});
    loadDetail(c.inventory_id);
  };

  const doLevelUp = async () => {
    const useList = [];
    for (const [itemId, count] of Object.entries(itemUse)) {
      if (count > 0) useList.push({ itemId, count });
    }
    if (useList.length === 0) return addToast('아이템을 선택하세요', 'error');
    try {
      const result = await api.levelUp(selected, useList);
      addToast(`레벨업! Lv.${result.level} (+${result.levelsGained})`, 'sr');
      if (detail) {
        const line = getLine(detail.characterId, 'levelUp');
        if (line) setGrowthBubble({ speaker: detail.name, text: line });
      }
      setItemUse({});
      loadDetail(selected);
      loadPromoInfo(selected);
      loadChars();
      loadExpItems();
      onRefresh();
    } catch (err) { addToast(err.message, 'error'); }
  };

  const doAwaken = async (materialId) => {
    try {
      const result = await api.awaken(selected, materialId);
      addToast(`각성 ${result.awakening}단계!`, 'ssr');
      if (detail) {
        const line = getLine(detail.characterId, 'awakening');
        if (line) setGrowthBubble({ speaker: detail.name, text: line });
      }
      const freshChars = await loadChars();
      loadDetail(selected, freshChars);
      onRefresh();
    } catch (err) { addToast(err.message, 'error'); }
  };

  const loadPromoInfo = async (invId) => {
    try { setPromoInfo(await api.promoteInfo(invId)); } catch { setPromoInfo(null); }
  };

  const doPromote = async () => {
    try {
      const result = await api.promote(selected);
      if (detail) {
        const line = getPromotionLine(detail.characterId, result.promotion);
        if (line) {
          setPromoCutscene({ name: detail.name, title: detail.title, rarity: detail.rarity, promotion: result.promotion, imageLd: detail.imageLd, text: line });
        } else {
          addToast(`승급 ${result.promotion}단계! 최대 레벨 ${result.maxLevel}`, 'ssr');
        }
      }
      loadDetail(selected);
      loadPromoInfo(selected);
      loadChars();
      onRefresh();
    } catch (err) { addToast(err.message, 'error'); }
  };

  const equipSkill = async (skillId, slotNumber, slotType, skillInventoryId) => {
    try {
      await api.equipSkill(selected, skillId, slotNumber, slotType, skillInventoryId || undefined);
      loadDetail(selected);
      setPoolPage(0);
      addToast('스킬 장착!', 'trade');
    } catch (err) { addToast(err.message, 'error'); }
  };

  const unequipSkill = async (slotNumber, slotType) => {
    try {
      await api.unequipSkill(selected, slotNumber, slotType);
      loadDetail(selected);
      addToast('스킬 해제', 'trade');
    } catch (err) { addToast(err.message, 'error'); }
  };

  const curIdx = characters.findIndex(c => c.inventory_id === selected);
  const prevChar = curIdx > 0 ? characters[curIdx - 1] : null;
  const nextChar = curIdx >= 0 && curIdx < characters.length - 1 ? characters[curIdx + 1] : null;

  if (!pageReady) return <LoadingOverlay />;

  if (!detail) {
    return (
      <div className="m-growth">
        <CharacterGrid characters={characters} onSelect={selectChar} onBatchLock={async (lockIds) => {
          try {
            const result = await api.batchLock(lockIds);
            addToast(`${result.locked}개 캐릭터 잠금 설정!`, 'trade');
            loadChars();
          } catch (err) { addToast(err.message, 'error'); }
        }} />
      </div>
    );
  }

  const d = detail;
  const rarityColor = RARITY_COLORS[d.rarity] || '#888';

  const groupedPool = (() => {
    const map = {};
    for (const s of (d.skillInventory || [])) {
      if (!map[s.id]) map[s.id] = { ...s, count: 1, siIds: [s.skillInventoryId] };
      else { map[s.id].count++; map[s.id].siIds.push(s.skillInventoryId); }
    }
    const list = Object.values(map);
    list.sort((a, b) => {
      const aOk = canEquipSkill(a.equipCondition, d) ? 0 : 1;
      const bOk = canEquipSkill(b.equipCondition, d) ? 0 : 1;
      return aOk - bOk;
    });
    return list;
  })();
  const totalPoolPages = Math.max(1, Math.ceil(groupedPool.length / POOL_PAGE_SIZE));
  const pagedPool = groupedPool.slice(poolPage * POOL_PAGE_SIZE, (poolPage + 1) * POOL_PAGE_SIZE);

  const atkSlots = d.attackSlots || { total: 3, skills: [] };
  const defSlots = d.defenseSlots || { total: 2, skills: [] };
  const futureSlots = d.futureSlots || [];
  const allEquippedSiIds = new Set([...atkSlots.skills, ...defSlots.skills].filter(s => s.skillInventoryId).map(s => s.skillInventoryId));

  const getFutureLockedSlots = (slotType) => {
    const locked = [];
    for (const fs of futureSlots) {
      const count = slotType === 'attack' ? fs.attackSlots : fs.defenseSlots;
      const matchSkills = fs.skills.filter(s => slotType === 'defense' ? s.type === 'defense' : s.type !== 'defense');
      for (let i = 0; i < count; i++) locked.push({ promoTier: fs.promoTier, skill: matchSkills[i] || null });
    }
    return locked;
  };

  return (
    <div className="m-growth m-growth-has-detail">
      <div className="m-growth-header">
        <button className="m-growth-back" onClick={() => { setDetail(null); setSelected(null); }}
          dangerouslySetInnerHTML={{ __html: '&#8592; 목록' }} />
        <div className="m-growth-nav">
          <button className="m-growth-nav-btn" disabled={!prevChar}
            onClick={() => prevChar && selectChar(prevChar)} dangerouslySetInnerHTML={{ __html: '&#9664;' }} />
          <button className="m-growth-nav-btn" disabled={!nextChar}
            onClick={() => nextChar && selectChar(nextChar)} dangerouslySetInnerHTML={{ __html: '&#9654;' }} />
        </div>
      </div>

      <div className="m-growth-body">
        {growthBubble && (
          <DialogueBubble speaker={growthBubble.speaker} text={growthBubble.text}
            variant="growth" duration={3500} onDone={() => setGrowthBubble(null)} />
        )}

        <div className="m-growth-char-card">
          <div className="m-growth-illust" style={{ borderColor: rarityColor }}
            onClick={() => (d.imageBust || d.imageUrl) && setBustZoom(true)}>
            {(d.imageBust || d.imageUrl)
              ? <img src={d.imageBust || d.imageUrl} alt={d.name} className="m-growth-illust-img" />
              : <span className="m-growth-illust-ph">{'일러스트'}</span>}
          </div>
          <div className="m-growth-info">
            <div className="m-growth-meta-row">
              <span className="m-growth-rarity" style={getRarityStyle(d.rarity)}>{d.rarity}</span>
              <span className="m-growth-elem m-growth-clickable" onClick={() => setShowInfoModal('element')}>
                <span dangerouslySetInnerHTML={{ __html: ELEM_ICONS[d.element] }} />
                <span style={{ color: ELEM_COLORS[d.element] }}>{ELEM_LABELS[d.element]}</span>
              </span>
              {d.origin && (
                <span className="m-growth-origin m-growth-clickable" onClick={() => setShowInfoModal('origin')}>
                  <span className="m-growth-origin-icon" style={{
                    backgroundColor: ELEM_COLORS[d.element] || ORIGIN_COLORS[d.origin],
                    WebkitMaskImage: `url(/uploads/origins/${d.origin}.png)`,
                    maskImage: `url(/uploads/origins/${d.origin}.png)`,
                  }} />
                  <span style={{ color: ORIGIN_COLORS[d.origin] }}>{ORIGIN_LABELS[d.origin]}</span>
                </span>
              )}
            </div>
            <h2 className="m-growth-name">{d.name}</h2>
            {d.title && <p className="m-growth-title">{d.title}</p>}
            <div className="m-growth-badges">
              <span className="m-growth-badge">Lv.{d.level}/{d.maxLevel}</span>
              <span className="m-growth-badge">{d.awakening}/5 {'★'}</span>
              {d.promotion > 0 && <span className="m-growth-badge m-growth-badge-promo">{'▲'}{d.promotion}</span>}
              <span className="m-growth-badge">{'♫'} {d.turnNotes}</span>
            </div>
            <div className="m-growth-exp-line">{d.exp}/{d.nextLevelExp} EXP</div>
          </div>
        </div>

        <div className="m-growth-stat-grid">
          <div className="m-growth-stat"><span className="mg-sl">HP</span><span className="mg-sv">{d.stats.hp}</span></div>
          <div className="m-growth-stat"><span className="mg-sl">ATK</span><span className="mg-sv">{d.stats.atk}</span></div>
          <div className="m-growth-stat"><span className="mg-sl">DEF</span><span className="mg-sv">{d.stats.def}</span></div>
          <div className="m-growth-stat"><span className="mg-sl">SPD</span><span className="mg-sv">{d.stats.spd}</span></div>
        </div>

        {d.quote && <div className="m-growth-quote">"{d.quote}"</div>}

        <div className="m-growth-action-row">
          <button className="m-growth-action-btn" onClick={async () => {
            try {
              await api.setRepresentative(null, d.characterId);
              addToast(`${d.name}을(를) 대표 캐릭터로 설정!`, 'trade');
            } catch (err) { addToast(err.message, 'error'); }
          }}>{'★'} {'대표'}</button>
          <button className={`m-growth-action-btn ${d.isLocked ? 'locked' : ''}`} onClick={async () => {
            try {
              const result = await api.toggleLock(selected);
              addToast(result.isLocked ? '잠금 설정!' : '잠금 해제!', 'trade');
              loadDetail(selected);
              loadChars();
            } catch (err) { addToast(err.message, 'error'); }
          }} dangerouslySetInnerHTML={{ __html: d.isLocked ? '&#128274; 해제' : '&#128275; 잠금' }} />
        </div>

        <div className="m-growth-tabs">
          <button className={`m-growth-tab ${activeTab === 'skills' ? 'active' : ''}`} onClick={() => setActiveTab('skills')}>{'스킬'}</button>
          <button className={`m-growth-tab ${activeTab === 'talent' ? 'active' : ''}`} onClick={() => setActiveTab('talent')}>{'특기'}</button>
          <button className={`m-growth-tab ${activeTab === 'growth' ? 'active' : ''}`}
            onClick={() => { setActiveTab('growth'); if (!promoInfo) loadPromoInfo(selected); }}>{'육성'}</button>
        </div>

        <div className="m-growth-tab-content">
          {activeTab === 'skills' && (() => {
            const renderSlots = (label, slots, slotType) => {
              const emptyCount = Math.max(0, slots.total - slots.skills.length);
              const lockedSlots = getFutureLockedSlots(slotType);
              return (
                <div className="mg-slot-section">
                  <h3 className="mg-section-title">{label} ({slots.skills.length}/{slots.total})</h3>
                  <div className="mg-equipped-list">
                    {slots.skills.map(s => (
                      <MSkillCard key={`${slotType}-${s.slot}`} skill={s}
                        actionLabel={s.isFixed ? null : '해제'}
                        onAction={() => { if (!s.isFixed) unequipSkill(s.slot, slotType); }} />
                    ))}
                    {Array.from({ length: emptyCount }, (_, i) => (
                      <div key={`empty-${slotType}-${i}`} className="mg-sk-card mg-sk-empty">
                        <span className="mg-sk-empty-label">{'빈 슬롯'}</span>
                      </div>
                    ))}
                    {lockedSlots.map((ls, i) => (
                      <div key={`locked-${slotType}-${i}`} className="mg-sk-card mg-sk-locked">
                        <div className="mg-sk-locked-info">
                          <span dangerouslySetInnerHTML={{ __html: '&#128274;' }} />
                          <span>{'승급'} {ls.promoTier}{'에서 해금'}</span>
                        </div>
                        {ls.skill && (
                          <div className="mg-sk-locked-preview">
                            <span style={{ color: SKILL_TYPE_COLORS[ls.skill.type] || '#888' }}>{SKILL_TYPE_LABELS[ls.skill.type] || ls.skill.type}</span>
                            <span>{ls.skill.name}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            };

            return (
              <div className="mg-tab-skills">
                {renderSlots('공격 슬롯', atkSlots, 'attack')}
                {renderSlots('방어 슬롯', defSlots, 'defense')}

                <div className="mg-pool-header">
                  <h3 className="mg-section-title">{'스킬 풀'} ({groupedPool.length})</h3>
                  {totalPoolPages > 1 && (
                    <div className="mg-pool-pager">
                      <button disabled={poolPage <= 0} onClick={() => setPoolPage(p => p - 1)} dangerouslySetInnerHTML={{ __html: '&#8249;' }} />
                      <span>{poolPage + 1}/{totalPoolPages}</span>
                      <button disabled={poolPage >= totalPoolPages - 1} onClick={() => setPoolPage(p => p + 1)} dangerouslySetInnerHTML={{ __html: '&#8250;' }} />
                    </div>
                  )}
                </div>
                <div className="mg-pool-list">
                  {pagedPool.map(g => {
                    const targetSlotType = g.slotType || 'attack';
                    const targetSlots = targetSlotType === 'attack' ? atkSlots : defSlots;
                    const occupied = new Set(targetSlots.skills.map(sk => sk.slot));
                    let nextSlot = -1;
                    for (let i = 0; i < targetSlots.total; i++) {
                      if (!occupied.has(i)) { nextSlot = i; break; }
                    }
                    const isFull = nextSlot === -1;
                    const freeSiId = g.siIds.find(id => !allEquippedSiIds.has(id));
                    const allUsed = !freeSiId;
                    const equipOk = canEquipSkill(g.equipCondition, d);
                    let disabledReason = '';
                    if (!equipOk && g.equipCondition) {
                      const cond = g.equipCondition;
                      const parts = [];
                      if (cond.origin) parts.push(ORIGIN_LABELS[Array.isArray(cond.origin) ? cond.origin[0] : cond.origin] || cond.origin);
                      if (cond.element) parts.push((Array.isArray(cond.element) ? cond.element : [cond.element]).map(e => gameConfig.elements[e]?.label || e).join('/'));
                      if (cond.minRarity) parts.push(cond.minRarity + ' 이상');
                      disabledReason = parts.length ? parts.join(' · ') + ' 전용' : '장착 불가';
                    }
                    return (
                      <MSkillCard key={`pool-${g.id}`} skill={g} equipped={allUsed || isFull}
                        count={g.count} disabled={!equipOk} disabledReason={disabledReason}
                        onAction={() => {
                          if (!allUsed && !isFull && equipOk) equipSkill(g.id, nextSlot, targetSlotType, freeSiId);
                        }} />
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {activeTab === 'talent' && (
            <div className="mg-tab-talent">
              <h3 className="mg-section-title">{'활성 특기'}</h3>
              {d.talents && d.talents.length > 0 ? (() => {
                const unlockedTalents = d.talents.filter(t => t.unlocked);
                const active = unlockedTalents.find(t => t.index === d.equippedTalent) || unlockedTalents[0];
                return (
                  <>
                    {active && (
                      <div className="mg-talent-active">
                        <div className="mg-talent-active-head">
                          <span className="mg-talent-active-name">{active.name}</span>
                          <span className="mg-talent-active-badge">{'활성'}</span>
                        </div>
                        <p className="mg-talent-active-desc">{active.desc}</p>
                        {active.flavor && <p className="mg-talent-flavor">{active.flavor}</p>}
                      </div>
                    )}
                    <h3 className="mg-section-title" style={{ marginTop: 10 }}>
                      {'전체 특기'} ({unlockedTalents.length}/{d.talents.length})
                    </h3>
                    <div className="mg-talent-list">
                      {d.talents.map(t => {
                        const isActive = t.index === d.equippedTalent && t.unlocked;
                        if (!t.unlocked) {
                          return (
                            <div key={t.index} className="mg-talent-card mg-talent-locked">
                              <div className="mg-talent-head">
                                <span className="mg-talent-name">{t.name}</span>
                                {t.index > 0 && t.index <= 5 && <span className="mg-talent-tier">{'각성'} {t.index}</span>}
                                {t.index > 5 && <span className="mg-talent-tier">{'승급'}</span>}
                                <span dangerouslySetInnerHTML={{ __html: '&#128274;' }} />
                              </div>
                              <p className="mg-talent-desc">{t.desc}</p>
                              <span className="mg-talent-lock-label">{t.index > 5 ? '승급에서 해금' : `각성 ${t.index}에서 해금`}</span>
                            </div>
                          );
                        }
                        return (
                          <div key={t.index} className={`mg-talent-card ${isActive ? 'mg-talent-is-active' : ''}`}
                            onClick={async () => {
                              if (isActive) return;
                              await api.equipTalent(d.inventoryId, t.index);
                              loadDetail(d.inventoryId);
                            }}>
                            <div className="mg-talent-head">
                              <span className="mg-talent-name">{t.name}</span>
                              {t.index === 0 && <span className="mg-talent-tier">{'기본'}</span>}
                              {t.index > 0 && t.index <= 5 && <span className="mg-talent-tier">{'각성'} {t.index}</span>}
                              {t.index > 5 && <span className="mg-talent-tier">{'승급'}</span>}
                              {isActive && <span className="mg-talent-dot" />}
                            </div>
                            <p className="mg-talent-desc">{t.desc}</p>
                            {t.flavor && <p className="mg-talent-flavor">{t.flavor}</p>}
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })() : <p className="mg-empty">{'특기 데이터가 없습니다.'}</p>}
            </div>
          )}

          {activeTab === 'growth' && (
            <div className="mg-tab-growth">
              <h3 className="mg-section-title">{'레벨업'}</h3>
              <p className="mg-hint">{'경험치 아이템을 소모합니다. 근원 일치 시'} {gameConfig.growth.expOriginBonus}{'배!'}</p>
              {(() => {
                const isMaxLevel = d.level >= d.maxLevel;
                if (isMaxLevel) return <p className="mg-hint">{'최대 레벨에 도달했습니다.'}</p>;

                const charOrigin = d.origin;
                const originBonus = gameConfig.growth.expOriginBonus || 1.5;
                const sorted = [...expItems].sort((a, b) => (a.effect?.value || 0) - (b.effect?.value || 0));
                const expToMax = calcExpToMax(d.level, d.exp, d.maxLevel);

                let totalExp = 0;
                let totalBonusExp = 0;
                for (const it of sorted) {
                  const count = itemUse[it.itemId] || 0;
                  if (count > 0) {
                    const base = it.effect.value * count;
                    const isMatch = it.effect.origin && it.effect.origin === charOrigin;
                    totalExp += Math.floor(base * (isMatch ? originBonus : 1));
                    if (isMatch) totalBonusExp += Math.floor(base * (originBonus - 1));
                  }
                }
                const anySelected = Object.values(itemUse).some(v => v > 0);
                const predicted = simulateLevelUp(d.level, d.exp, totalExp, d.maxLevel);
                const reachedMax = predicted.level >= d.maxLevel;

                return (
                  <>
                    {sorted.length === 0 ? (
                      <p className="mg-hint">{'보유한 경험치 아이템이 없습니다.'}</p>
                    ) : (
                      <div className="mg-exp-grid">
                        {sorted.map(it => {
                          const used = itemUse[it.itemId] || 0;
                          const isMatch = it.effect.origin && it.effect.origin === charOrigin;
                          const canAdd = used < it.quantity && !reachedMax;
                          const calcMaxed = (use) => {
                            let te = 0;
                            for (const si of sorted) {
                              const c = use[si.itemId] || 0;
                              if (c > 0) te += Math.floor(si.effect.value * c * (si.effect.origin && si.effect.origin === charOrigin ? originBonus : 1));
                            }
                            return simulateLevelUp(d.level, d.exp, te, d.maxLevel).level >= d.maxLevel;
                          };
                          const incOne = () => setItemUse(prev => {
                            if ((prev[it.itemId] || 0) >= it.quantity || calcMaxed(prev)) return prev;
                            return { ...prev, [it.itemId]: (prev[it.itemId] || 0) + 1 };
                          });
                          const decOne = () => setItemUse(prev => ({ ...prev, [it.itemId]: Math.max(0, (prev[it.itemId] || 0) - 1) }));
                          const startHold = () => {
                            if (!canAdd) return;
                            holdRef.current.timer = setTimeout(() => {
                              holdRef.current.interval = setInterval(() => {
                                setItemUse(prev => {
                                  const cur = prev[it.itemId] || 0;
                                  if (cur >= it.quantity || calcMaxed(prev)) { clearInterval(holdRef.current.interval); return prev; }
                                  return { ...prev, [it.itemId]: cur + 1 };
                                });
                              }, 80);
                            }, 400);
                          };
                          const stopHold = () => { clearTimeout(holdRef.current.timer); clearInterval(holdRef.current.interval); };
                          const startDecHold = (e) => {
                            e.stopPropagation(); decOne();
                            decHoldRef.current.timer = setTimeout(() => {
                              decHoldRef.current.interval = setInterval(() => {
                                setItemUse(prev => {
                                  const cur = prev[it.itemId] || 0;
                                  if (cur <= 0) { clearInterval(decHoldRef.current.interval); return prev; }
                                  return { ...prev, [it.itemId]: cur - 1 };
                                });
                              }, 80);
                            }, 400);
                          };
                          const stopDecHold = (e) => { e.stopPropagation(); clearTimeout(decHoldRef.current.timer); clearInterval(decHoldRef.current.interval); };
                          return (
                            <div key={it.itemId}
                              className={`mg-exp-item ${isMatch ? 'mg-exp-match' : ''} ${used > 0 ? 'mg-exp-selected' : ''} ${!canAdd ? 'mg-exp-maxed' : ''}`}
                              onClick={incOne}
                              onMouseDown={startHold} onMouseUp={stopHold} onMouseLeave={stopHold}
                              onTouchStart={startHold} onTouchEnd={stopHold} onTouchCancel={stopHold}>
                              {used > 0 && (
                                <button className="mg-exp-minus"
                                  onClick={e => e.stopPropagation()}
                                  onMouseDown={startDecHold} onMouseUp={stopDecHold} onMouseLeave={stopDecHold}
                                  onTouchStart={startDecHold} onTouchEnd={stopDecHold} onTouchCancel={stopDecHold}>-</button>
                              )}
                              <div className="mg-exp-img-box">
                                {it.image ? <img src={it.image} alt={it.name} />
                                  : it.color ? <span className="mg-exp-dot" style={{ background: it.color }} />
                                  : <span dangerouslySetInnerHTML={{ __html: it.icon || '&#9679;' }} />}
                                {isMatch && <span className="mg-exp-match-badge">{originBonus}x</span>}
                              </div>
                              <span className="mg-exp-name">{it.name}</span>
                              <span className="mg-exp-val">{it.effect.value.toLocaleString()} EXP</span>
                              <span className="mg-exp-qty">{used > 0 ? <><b>{used}</b> / </> : ''}{it.quantity}{'개'}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {sorted.length > 0 && !reachedMax && (
                      <button className="mg-btn-max" onClick={() => {
                        let remaining = expToMax;
                        const use = {};
                        const rev = [...sorted].reverse();
                        for (const it of rev) {
                          if (remaining <= 0) break;
                          const isMatch = it.effect.origin && it.effect.origin === charOrigin;
                          const perUnit = Math.floor(it.effect.value * (isMatch ? originBonus : 1));
                          const need = Math.ceil(remaining / perUnit);
                          const count = Math.min(need, it.quantity);
                          if (count > 0) { use[it.itemId] = count; remaining -= perUnit * count; }
                        }
                        setItemUse(use);
                      }}>MAX</button>
                    )}

                    {anySelected && (
                      <div className="mg-exp-preview">
                        <div className="mg-exp-preview-lv">
                          Lv.{d.level} {'→'} <span className={reachedMax ? 'mg-lv-max' : ''}>Lv.{predicted.level}</span>
                          {predicted.level > d.level && <span className="mg-lv-gain"> (+{predicted.level - d.level})</span>}
                          {reachedMax && <span className="mg-lv-max-badge">MAX</span>}
                        </div>
                        <div className="mg-exp-preview-detail">
                          <span className="mg-exp-total">+{totalExp.toLocaleString()} EXP</span>
                          {totalBonusExp > 0 && <span className="mg-exp-bonus">({'근원 보너스'} +{totalBonusExp.toLocaleString()})</span>}
                        </div>
                        {!reachedMax && <div className="mg-exp-remaining">{'만렛까지'} {(expToMax - totalExp).toLocaleString()} EXP</div>}
                      </div>
                    )}

                    <button className="mg-btn-levelup" onClick={doLevelUp} disabled={!anySelected}>{'아이템 사용'}</button>
                  </>
                );
              })()}

              <div className="mg-exp-bar-area">
                <div className="mg-exp-bar"><div className="mg-exp-fill" style={{ width: `${d.exp / d.nextLevelExp * 100}%` }} /></div>
                <span className="mg-exp-text">Lv.{d.level} {'—'} {d.exp}/{d.nextLevelExp} EXP</span>
              </div>

              <h3 className="mg-section-title">{'승급'} ({d.promotion}/{d.maxPromotion})</h3>
              {(() => {
                if (!promoInfo) return <p className="mg-hint">{'승급 정보를 불러오는 중...'}</p>;
                if (promoInfo.noData) return <p className="mg-hint">{'이 캐릭터의 승급 데이터가 아직 설정되지 않았습니다.'}</p>;
                if (promoInfo.maxed) return <p className="mg-hint">{'최대 승급에 도달했습니다.'}</p>;
                const rq = promoInfo.requirements;
                const matsOk = (rq.materials || []).every(m => m.have >= m.need);
                const canPromote = promoInfo.levelReached && rq.gold.have >= rq.gold.need && matsOk;
                return (
                  <>
                    <p className="mg-hint">{'최대 레벨에 도달하고 재료를 모아 승급합니다.'} ({promoInfo.currentMaxLevel} {'→'} {promoInfo.nextMaxLevel})</p>
                    <div className="mg-promo-reqs">
                      <div className={`mg-promo-req ${promoInfo.levelReached ? 'met' : 'unmet'}`}>
                        <span>{'레벨 달성'}</span><span>Lv.{d.level}/{promoInfo.currentMaxLevel}</span>
                      </div>
                      {rq.gold.need > 0 && (
                        <div className={`mg-promo-req ${rq.gold.have >= rq.gold.need ? 'met' : 'unmet'}`}>
                          <span>{'비트'}</span><span>{rq.gold.have.toLocaleString()}/{rq.gold.need.toLocaleString()}</span>
                        </div>
                      )}
                      {(rq.materials || []).map((m, i) => (
                        <div key={i} className={`mg-promo-req ${m.have >= m.need ? 'met' : 'unmet'}`}>
                          <span dangerouslySetInnerHTML={{ __html: `${m.icon} ${m.name}` }} /><span>{m.have}/{m.need}</span>
                        </div>
                      ))}
                    </div>
                    {(promoInfo.rewards && Object.keys(promoInfo.rewards).length > 0) || (promoInfo.unlockSkills && promoInfo.unlockSkills.length > 0) ? (
                      <div className="mg-promo-rewards">
                        <span className="mg-promo-rewards-title" dangerouslySetInnerHTML={{ __html: '&#127873; 승급 보상' }} />
                        {promoInfo.rewards?.attackSlots > 0 && <span className="mg-promo-reward-tag">{'공격 스킬칸'} +{promoInfo.rewards.attackSlots}</span>}
                        {promoInfo.rewards?.defenseSlots > 0 && <span className="mg-promo-reward-tag">{'방어 스킬칸'} +{promoInfo.rewards.defenseSlots}</span>}
                        {promoInfo.rewards?.bonusNotes > 0 && <span className="mg-promo-reward-tag">{'턴 노트'} +{promoInfo.rewards.bonusNotes}</span>}
                        {promoInfo.rewards?.unlockTalent && (
                          <div className="mg-promo-talent-unlock">
                            <span className="mg-promo-reward-tag">{'특기 해금'}</span>
                            {promoInfo.rewards.unlockTalentName && (
                              <div className="mg-promo-talent-preview">
                                <span>{promoInfo.rewards.unlockTalentName}</span>
                                <span>{promoInfo.rewards.unlockTalentDesc}</span>
                              </div>
                            )}
                          </div>
                        )}
                        {promoInfo.unlockSkills && promoInfo.unlockSkills.length > 0 && (
                          <div className="mg-promo-skill-unlock">
                            <span className="mg-promo-reward-tag">{'스킬 획득'}</span>
                            {promoInfo.unlockSkills.map(s => (
                              <div key={s.id} className="mg-promo-skill-preview">
                                <span className="mg-promo-skill-type" style={{ background: SKILL_TYPE_COLORS[s.type] || '#666' }}>{SKILL_TYPE_LABELS[s.type] || s.type}</span>
                                <span>{s.name}</span>
                                {s.description && <span className="mg-promo-skill-desc">{s.description}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}
                    <button className="mg-btn-promote" onClick={doPromote} disabled={!canPromote}>{'▲'} {'승급하기'}</button>
                  </>
                );
              })()}

              <h3 className="mg-section-title" style={{ marginTop: 12 }}>{'각성'} ({d.awakening}/5)</h3>
              {dupes.length > 0 ? (
                <>
                  <p className="mg-hint">{'동일 캐릭터를 소모하여 각성합니다.'}</p>
                  <div className="mg-awaken-list">
                    {dupes.map(dup => (
                      <button key={dup.inventory_id} className="mg-btn-awaken" onClick={() => doAwaken(dup.inventory_id)}>
                        {dup.name} Lv.{dup.level} {'소모'}
                      </button>
                    ))}
                  </div>
                </>
              ) : <p className="mg-hint">{'각성에 필요한 중복 캐릭터가 없습니다.'}</p>}
            </div>
          )}
        </div>
      </div>

      {bustZoom && (d.imageBust || d.imageUrl) && (
        <div className="mg-bust-overlay" onClick={() => setBustZoom(false)}>
          <img src={d.imageBust || d.imageUrl} alt={d.name} className="mg-bust-img" />
        </div>
      )}

      {promoCutscene && (
        <div className="mg-promo-overlay" onClick={() => setPromoCutscene(null)}>
          <div className="mg-promo-bg" />
          <div className="mg-promo-content">
            <img src={promoCutscene.imageLd} alt={promoCutscene.name} className="mg-promo-img" />
            <div className="mg-promo-info">
              <div className="mg-promo-stars">
                {Array.from({ length: promoCutscene.promotion }, (_, i) => (
                  <span key={i} dangerouslySetInnerHTML={{ __html: '&#9733;' }} style={{ color: '#ffd700', fontSize: '1.5rem', textShadow: '0 0 8px rgba(255,215,0,0.6)' }} />
                ))}
              </div>
              <span className="mg-promo-char-name">{promoCutscene.name}</span>
              {promoCutscene.title && <span className="mg-promo-char-title">{promoCutscene.title}</span>}
            </div>
            <div className="mg-promo-dialogue">{promoCutscene.text}</div>
            <p className="mg-promo-hint">{'탭하여 닫기'}</p>
          </div>
        </div>
      )}

      {showInfoModal === 'element' && <ElementModal onClose={() => setShowInfoModal(null)} />}
      {showInfoModal === 'origin' && <OriginModal onClose={() => setShowInfoModal(null)} />}
    </div>
  );
}
