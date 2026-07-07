import React, { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';
import gameConfig from '@gameConfig';
import CharacterGrid from '../components/CharacterGrid';
import DialogueBubble from '../components/DialogueBubble';
import { loadDialogues, getLine, getPromotionLine } from '../utils/dialogues';
import './GrowthPage.css';

const ELEM_ICONS = { fire: '&#128293;', water: '&#128167;', wind: '&#127811;', light: '&#10024;', dark: '&#127761;', neutral: '&#9898;' };

const ELEM_COLORS = {};
const ELEM_LABELS = {};
for (const [k, v] of Object.entries(gameConfig.elements)) { ELEM_COLORS[k] = v.color; ELEM_LABELS[k] = v.label; }

const ORIGIN_LABELS = {};
const ORIGIN_COLORS = {};
for (const [k, v] of Object.entries(gameConfig.origins)) {
  ORIGIN_LABELS[k] = v.label;
  ORIGIN_COLORS[k] = v.color;
}

const RARITY_COLORS = {};
for (const [k, v] of Object.entries(gameConfig.rarities)) RARITY_COLORS[k] = v.color;

const SKILL_TYPE_LABELS = {};
const SKILL_TYPE_COLORS = {};
for (const [k, v] of Object.entries(gameConfig.skillTypes)) {
  SKILL_TYPE_LABELS[k] = v.label;
  SKILL_TYPE_COLORS[k] = v.color;
}

function simulateLevelUp(currentLevel, currentExp, addedExp, maxLevel) {
  let exp = currentExp + addedExp;
  let level = currentLevel;
  while (level < maxLevel) {
    const needed = level * level * 10 + level * 50;
    if (exp >= needed) { exp -= needed; level++; } else break;
  }
  return { level, exp, nextExp: level * level * 10 + level * 50 };
}

function calcExpToMax(currentLevel, currentExp, maxLevel) {
  let total = 0;
  for (let lv = currentLevel; lv < maxLevel; lv++) total += lv * lv * 10 + lv * 50;
  return Math.max(0, total - currentExp);
}

function getRarityStyle(rarity) {
  if (rarity === 'CR') return { background: 'linear-gradient(90deg, #ff0000, #ff8800, #ffff00, #00ff00, #0088ff, #8800ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 'bold' };
  return { color: RARITY_COLORS[rarity] || '#888' };
}

const RARITY_ORDER_LIST = ['N', 'R', 'SR', 'SSR', 'CR'];
function canEquipSkill(condition, character) {
  if (!condition || Object.keys(condition).length === 0) return true;
  for (const [key, value] of Object.entries(condition)) {
    if (key === 'element') {
      if (Array.isArray(value) ? !value.includes(character.element) : character.element !== value) return false;
    } else if (key === 'origin') {
      if (Array.isArray(value) ? !value.includes(character.origin) : character.origin !== value) return false;
    } else if (key === 'minRarity') {
      if (RARITY_ORDER_LIST.indexOf(character.rarity) < RARITY_ORDER_LIST.indexOf(value)) return false;
    }
  }
  return true;
}

function SkillTypeBadge({ type }) {
  return (
    <span className="skill-type-badge" style={{ background: SKILL_TYPE_COLORS[type] || '#666' }}>
      {SKILL_TYPE_LABELS[type] || type}
    </span>
  );
}

function SkillCard({ skill, equipped, onAction, actionLabel, count, disabled, disabledReason }) {
  return (
    <div className={`sk-card ${equipped ? 'sk-equipped' : ''} ${disabled ? 'sk-disabled' : ''}`}
      onClick={disabled ? undefined : onAction}>
      <div className="sk-card-header">
        {skill.icon ? <img className="sk-icon" src={skill.icon} alt="" /> : <SkillTypeBadge type={skill.type} />}
        {skill.element && skill.element !== 'neutral' && (
          <span className="sk-elem-badge" style={{ color: ELEM_COLORS[skill.element] }} dangerouslySetInnerHTML={{ __html: ELEM_ICONS[skill.element] + ' ' + ELEM_LABELS[skill.element] }} />
        )}
        <span className="sk-card-name">{skill.name}{equipped !== undefined && equipped && ' ✓'}</span>
        {count > 1 && <span className="sk-count-badge">{'×'}{count}</span>}
        {skill.isFixed && <span className="sk-fixed-badge">{'🔒'}</span>}
      </div>
      {disabled && disabledReason && <p className="sk-card-condition">{disabledReason}</p>}
      {!disabled && skill.description && <p className="sk-card-desc">{skill.description}</p>}
      <div className="sk-card-footer">
        <span className="sk-card-cost">
          ♪ {skill.cost}
          {skill.power > 0 ? ` · ${Math.round(skill.power * 100)}%` : ''}
          {skill.defense_mult > 0 ? ` · 방어${Math.round(skill.defense_mult * 100)}%` : ''}
          {skill.cooldown > 0 && <span className="sk-cd-badge"> · CD {skill.cooldown}</span>}
        </span>
        {actionLabel && !disabled && <button className="sk-card-action" onClick={(e) => { e.stopPropagation(); onAction(); }}>{actionLabel}</button>}
      </div>
    </div>
  );
}

const POOL_PAGE_SIZE = 6;

export default function GrowthPage({ user, onRefresh, addToast }) {
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
  const holdRef = useRef({ timer: null, interval: null });
  const decHoldRef = useRef({ timer: null, interval: null });

  useEffect(() => { loadChars(); loadExpItems(); loadDialogues(); }, []);

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
      const d = list.filter(c => c.character_id === data.characterId && c.inventory_id !== invId && c.is_locked !== 1);
      setDupes(d);
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
    try {
      const data = await api.promoteInfo(invId);
      setPromoInfo(data);
    } catch (err) { setPromoInfo(null); }
  };

  const doPromote = async () => {
    try {
      const result = await api.promote(selected);
      if (detail) {
        const line = getPromotionLine(detail.characterId, result.promotion);
        if (line) {
          setPromoCutscene({
            name: detail.name,
            title: detail.title,
            rarity: detail.rarity,
            promotion: result.promotion,
            imageLd: detail.imageLd,
            text: line,
          });
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

  useEffect(() => {
    if (!detail) return;
    const handleKey = (e) => {
      if (e.key === 'ArrowLeft' && prevChar) { selectChar(prevChar); }
      else if (e.key === 'ArrowRight' && nextChar) { selectChar(nextChar); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [detail, curIdx]);

  if (!detail) {
    return (
      <div className="growth-page">
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

  // ========== 캐릭터 상세 ==========
  const d = detail;
  const rarityColor = RARITY_COLORS[d.rarity] || '#888';

  // 스킬 풀 = 전체 공용 인벤토리 (같은 스킬 묶기)
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

  return (
    <div className="growth-page detail-view">
      <button className="btn-back" onClick={() => { setDetail(null); setSelected(null); }}>&#8592; 목록</button>

      <div className="detail-layout-wrap">
        <button className="btn-detail-nav-side left" disabled={!prevChar}
          onClick={() => prevChar && selectChar(prevChar)}
          dangerouslySetInnerHTML={{ __html: '&#9664;' }} />

        <div className="detail-layout">
        {/* ====== 좌측 ====== */}
        <div className="detail-left">
          <div className="detail-left-inner" style={{ position: 'relative' }}>
            {growthBubble && (
              <DialogueBubble
                speaker={growthBubble.speaker}
                text={growthBubble.text}
                variant="growth"
                duration={3500}
                style={{ top: -10, left: '50%', transform: 'translateX(-50%)' }}
                onDone={() => setGrowthBubble(null)}
              />
            )}
            <div className="detail-illust" style={{ borderColor: rarityColor }}
              onClick={() => (d.imageBust || d.imageUrl) && setBustZoom(true)}>
              {(d.imageBust || d.imageUrl)
                ? <img src={d.imageBust || d.imageUrl} alt={d.name} className="detail-illust-img" />
                : <span className="detail-illust-placeholder">일러스트</span>}
            </div>

            <div className="detail-meta-row">
              <span className="detail-rarity-badge" style={getRarityStyle(d.rarity)}>{d.rarity}</span>
              <span className="detail-elem-wrap">
                <span className="detail-elem-icon" dangerouslySetInnerHTML={{ __html: ELEM_ICONS[d.element] }} />
                <span className="detail-elem-label" style={{ color: ELEM_COLORS[d.element] }}>{ELEM_LABELS[d.element]}</span>
              </span>
              {d.origin && (
                <span className="detail-origin-wrap">
                  <span className="detail-origin-icon" style={{
                    backgroundColor: ELEM_COLORS[d.element] || ORIGIN_COLORS[d.origin],
                    WebkitMaskImage: `url(/uploads/origins/${d.origin}.png)`,
                    maskImage: `url(/uploads/origins/${d.origin}.png)`,
                  }} />
                  <span className="detail-origin-label" style={{ color: ORIGIN_COLORS[d.origin] }}>{ORIGIN_LABELS[d.origin]}</span>
                </span>
              )}
            </div>

            <div className="detail-name-block">
              <h2 className="detail-char-name">{d.name}</h2>
              {d.title && <p className="detail-char-title">{d.title}</p>}
            </div>

            <div className="detail-badge-row">
              <span className="detail-badge">Lv.{d.level}/{d.maxLevel}</span>
              <span className="detail-badge">{d.awakening}/5 {'★'}</span>
              {d.promotion > 0 && <span className="detail-badge detail-badge-promo">{'▲'}{d.promotion}</span>}
              <span className="detail-badge">{'♫'} {d.turnNotes}</span>
              <span className="detail-badge" dangerouslySetInnerHTML={{ __html: `&#9876; ${d.attackSlots?.total ?? 3} / &#128737; ${d.defenseSlots?.total ?? 2}` }} />
            </div>

            <div className="detail-exp-line">{d.exp}/{d.nextLevelExp} EXP</div>

            <div className="detail-stat-grid">
              <div className="detail-stat"><span className="ds-label">HP</span><span className="ds-value">{d.stats.hp}</span></div>
              <div className="detail-stat"><span className="ds-label">ATK</span><span className="ds-value">{d.stats.atk}</span></div>
              <div className="detail-stat"><span className="ds-label">DEF</span><span className="ds-value">{d.stats.def}</span></div>
              <div className="detail-stat"><span className="ds-label">SPD</span><span className="ds-value">{d.stats.spd}</span></div>
            </div>

            {d.quote && <div className="detail-quote">"{d.quote}"</div>}

            <div className="detail-action-row">
              <button className="btn-representative" onClick={async () => {
                try {
                  await api.setRepresentative(selected);
                  addToast(`${d.name}을(를) 대표 캐릭터로 설정!`, 'trade');
                } catch (err) { addToast(err.message, 'error'); }
              }}>{'★'} 대표 캐릭터로 설정</button>
              <button className={`btn-lock-toggle ${d.isLocked ? 'locked' : ''}`} onClick={async () => {
                try {
                  const result = await api.toggleLock(selected);
                  addToast(result.isLocked ? '잠금 설정!' : '잠금 해제!', 'trade');
                  loadDetail(selected);
                  loadChars();
                } catch (err) { addToast(err.message, 'error'); }
              }} dangerouslySetInnerHTML={{ __html: d.isLocked ? '&#128274; 잠금 해제' : '&#128275; 잠금' }} />
            </div>
          </div>
        </div>

        {/* ====== 우측 ====== */}
        <div className="detail-right">
          <div className="detail-tabs">
            <button className={`detail-tab ${activeTab === 'skills' ? 'active' : ''}`} onClick={() => setActiveTab('skills')}>스킬</button>
            <button className={`detail-tab ${activeTab === 'talent' ? 'active' : ''}`} onClick={() => setActiveTab('talent')}>특기</button>
            <button className={`detail-tab ${activeTab === 'growth' ? 'active' : ''}`} onClick={() => { setActiveTab('growth'); if (!promoInfo) loadPromoInfo(selected); }}>육성</button>
          </div>

          <div className="detail-tab-content">
            {/* === 스킬 탭 === */}
            {activeTab === 'skills' && (() => {
              const atkSlots = d.attackSlots || { total: 3, skills: [] };
              const defSlots = d.defenseSlots || { total: 2, skills: [] };
              const allEquippedSiIds = new Set([...atkSlots.skills, ...defSlots.skills].filter(s => s.skillInventoryId).map(s => s.skillInventoryId));

              const renderSlotSection = (label, slots, slotType) => {
                const emptyCount = Math.max(0, slots.total - slots.skills.length);
                return (
                  <div className="slot-section">
                    <h3 className="tab-section-title">{label} ({slots.skills.length}/{slots.total})</h3>
                    <div className="equipped-list">
                      {slots.skills.map((s) => (
                        <SkillCard key={`${slotType}-${s.slot}`} skill={s}
                          actionLabel={s.isFixed ? null : '해제'}
                          onAction={() => { if (!s.isFixed) unequipSkill(s.slot, slotType); }} />
                      ))}
                      {Array.from({ length: emptyCount }, (_, i) => (
                        <div key={`empty-${slotType}-${i}`} className="sk-card sk-empty">
                          <span className="sk-empty-label">빈 슬롯</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              };

              return (
                <div className="tab-skills">
                  {renderSlotSection('공격 슬롯', atkSlots, 'attack')}
                  {renderSlotSection('방어 슬롯', defSlots, 'defense')}

                  <div className="pool-header">
                    <h3 className="tab-section-title">스킬 풀 ({groupedPool.length})</h3>
                    {totalPoolPages > 1 && (
                      <div className="pool-pager">
                        <button className="pool-arrow" disabled={poolPage <= 0} onClick={() => setPoolPage(p => p - 1)}>&#8249;</button>
                        <span className="pool-page-num">{poolPage + 1}/{totalPoolPages}</span>
                        <button className="pool-arrow" disabled={poolPage >= totalPoolPages - 1} onClick={() => setPoolPage(p => p + 1)}>&#8250;</button>
                      </div>
                    )}
                  </div>
                  <div className="pool-grid">
                    {pagedPool.map((g) => {
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
                        <SkillCard key={`pool-${g.id}`} skill={g} equipped={allUsed || isFull}
                          count={g.count}
                          disabled={!equipOk}
                          disabledReason={disabledReason}
                          onAction={() => {
                            if (!allUsed && !isFull && equipOk) {
                              equipSkill(g.id, nextSlot, targetSlotType, freeSiId);
                            }
                          }} />
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* === 특기 탭 === */}
            {activeTab === 'talent' && (
              <div className="tab-talent">
                <h3 className="tab-section-title">활성 특기</h3>
                {d.talents && d.talents.length > 0 ? (() => {
                  const active = d.talents.find(t => t.index === d.equippedTalent) || d.talents[0];
                  return (
                    <>
                      <div className="talent-active-card">
                        <div className="talent-active-header">
                          <span className="talent-active-name">{active.name}</span>
                          <span className="talent-active-badge">활성</span>
                        </div>
                        <p className="talent-active-desc">{active.desc}</p>
                        <p className="talent-active-flavor">{active.flavor}</p>
                      </div>

                      <h3 className="tab-section-title" style={{ marginTop: 14 }}>
                        보유 특기 ({d.talents.length}/{d.totalTalentCount || d.talents.length})
                      </h3>
                      <div className="talent-list">
                        {Array.from({ length: d.totalTalentCount || d.talents.length }, (_, i) => {
                          const t = d.talents.find(tt => tt.index === i);
                          const unlocked = i < (d.talentUnlockCount ?? (d.awakening + 1));
                          const isActive = i === d.equippedTalent;
                          if (!unlocked) {
                            return (
                              <div key={i} className="talent-card talent-locked">
                                <span className="talent-lock-icon" dangerouslySetInnerHTML={{ __html: '&#128274;' }} />
                                <span className="talent-lock-label">승급에서 해금</span>
                              </div>
                            );
                          }
                          return (
                            <div key={i} className={`talent-card ${isActive ? 'talent-active' : ''}`}
                              onClick={async () => {
                                if (isActive) return;
                                await api.equipTalent(d.inventoryId, i);
                                loadDetail(d.inventoryId);
                              }}>
                              <div className="talent-card-header">
                                <span className="talent-card-name">{t?.name}</span>
                                {i === 0 && <span className="talent-card-base">기본</span>}
                                {i > 0 && i <= 5 && <span className="talent-card-awaken">각성 {i}</span>}
                                {i > 5 && <span className="talent-card-awaken">승급</span>}
                                {isActive && <span className="talent-card-active-dot" />}
                              </div>
                              <p className="talent-card-desc">{t?.desc}</p>
                              <p className="talent-card-flavor">{t?.flavor}</p>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })() : <p className="empty-msg">특기 데이터가 없습니다.</p>}
              </div>
            )}

            {/* === 육성 탭 === */}
            {activeTab === 'growth' && (
              <div className="tab-growth">
                <h3 className="tab-section-title">레벨업</h3>
                <p className="growth-hint">경험치 아이템을 소모합니다. 근원 일치 시 {gameConfig.growth.expOriginBonus}배!</p>

                {(() => {
                  const isMaxLevel = d.level >= d.maxLevel;
                  if (isMaxLevel) return <p className="growth-hint">최대 레벨에 도달했습니다.</p>;

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
                        <p className="growth-hint">보유한 경험치 아이템이 없습니다.</p>
                      ) : (
                        <div className="exp-item-grid">
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
                              e.stopPropagation();
                              decOne();
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
                                className={`exp-item ${isMatch ? 'exp-item-match' : ''} ${used > 0 ? 'exp-item-selected' : ''} ${!canAdd ? 'exp-item-maxed' : ''}`}
                                onClick={incOne}
                                onMouseDown={startHold} onMouseUp={stopHold} onMouseLeave={stopHold}
                                onTouchStart={startHold} onTouchEnd={stopHold} onTouchCancel={stopHold}>
                                {used > 0 && (
                                  <button className="exp-item-minus"
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={startDecHold} onMouseUp={stopDecHold} onMouseLeave={stopDecHold}
                                    onTouchStart={startDecHold} onTouchEnd={stopDecHold} onTouchCancel={stopDecHold}>-</button>
                                )}
                                <div className="exp-item-img-box">
                                  {it.image
                                    ? <img className="exp-item-img" src={it.image} alt={it.name} />
                                    : it.color
                                      ? <span className="exp-item-dot-lg" style={{ background: it.color }} />
                                      : <span className="exp-item-icon-lg" dangerouslySetInnerHTML={{ __html: it.icon || '&#9679;' }} />}
                                  {isMatch && <span className="exp-match-badge">{originBonus}x</span>}
                                </div>
                                <div className="exp-item-bottom">
                                  <span className="exp-item-name">{it.name}</span>
                                  <span className="exp-item-exp">{it.effect.value.toLocaleString()} EXP</span>
                                  <span className="exp-item-qty">{used > 0 ? <><b>{used}</b> / </> : ''}{it.quantity}{'개'}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {sorted.length > 0 && !reachedMax && (
                        <button className="btn-exp-max" onClick={() => {
                          let remaining = expToMax;
                          const use = {};
                          const rev = [...sorted].reverse();
                          for (const it of rev) {
                            if (remaining <= 0) break;
                            const isMatch = it.effect.origin && it.effect.origin === charOrigin;
                            const perUnit = Math.floor(it.effect.value * (isMatch ? originBonus : 1));
                            const need = Math.ceil(remaining / perUnit);
                            const count = Math.min(need, it.quantity);
                            if (count > 0) {
                              use[it.itemId] = count;
                              remaining -= perUnit * count;
                            }
                          }
                          setItemUse(use);
                        }}>MAX</button>
                      )}

                      {anySelected && (
                        <div className="exp-preview">
                          <div className="exp-preview-level">
                            Lv.{d.level} {'→'} <span className={`exp-preview-lv ${reachedMax ? 'exp-lv-max' : ''}`}>Lv.{predicted.level}</span>
                            {predicted.level > d.level && <span className="exp-preview-gain"> (+{predicted.level - d.level})</span>}
                            {reachedMax && <span className="exp-lv-max-badge">MAX</span>}
                          </div>
                          <div className="exp-preview-detail">
                            <span className="exp-preview-exp">+{totalExp.toLocaleString()} EXP</span>
                            {totalBonusExp > 0 && <span className="exp-preview-bonus">(근원 보너스 +{totalBonusExp.toLocaleString()})</span>}
                          </div>
                          {!reachedMax && <div className="exp-preview-remaining">만렙까지 {(expToMax - totalExp).toLocaleString()} EXP</div>}
                        </div>
                      )}

                      <button className="btn-levelup-exp" onClick={doLevelUp} disabled={!anySelected}>
                        아이템 사용
                      </button>
                    </>
                  );
                })()}

                <div className="growth-exp-area">
                  <div className="growth-exp-bar">
                    <div className="growth-exp-fill" style={{ width: `${d.exp / d.nextLevelExp * 100}%` }} />
                  </div>
                  <span className="growth-exp-text">Lv.{d.level} — {d.exp}/{d.nextLevelExp} EXP</span>
                </div>

                <h3 className="tab-section-title">승급 ({d.promotion}/{d.maxPromotion})</h3>
                {(() => {
                  if (!promoInfo) return <p className="growth-hint">승급 정보를 불러오는 중...</p>;
                  if (promoInfo.noData) return <p className="growth-hint">이 캐릭터의 승급 데이터가 아직 설정되지 않았습니다.</p>;
                  if (promoInfo.maxed) return <p className="growth-hint">최대 승급에 도달했습니다.</p>;
                  const rq = promoInfo.requirements;
                  const matsOk = (rq.materials || []).every(m => m.have >= m.need);
                  const canPromote = promoInfo.levelReached
                    && rq.gold.have >= rq.gold.need
                    && matsOk;
                  return (
                    <>
                      <p className="growth-hint">
                        최대 레벨에 도달하고 재료를 모아 승급합니다.
                        ({promoInfo.currentMaxLevel} {'→'} {promoInfo.nextMaxLevel})
                      </p>
                      <div className="promo-req-list">
                        <div className={`promo-req-item ${promoInfo.levelReached ? 'met' : 'unmet'}`}>
                          <span className="promo-req-label">레벨 달성</span>
                          <span className="promo-req-value">Lv.{d.level}/{promoInfo.currentMaxLevel}</span>
                        </div>
                        {rq.gold.need > 0 && (
                          <div className={`promo-req-item ${rq.gold.have >= rq.gold.need ? 'met' : 'unmet'}`}>
                            <span className="promo-req-label">비트</span>
                            <span className="promo-req-value">{rq.gold.have.toLocaleString()}/{rq.gold.need.toLocaleString()}</span>
                          </div>
                        )}
                        {(rq.materials || []).map((m, i) => (
                          <div key={i} className={`promo-req-item ${m.have >= m.need ? 'met' : 'unmet'}`}>
                            <span className="promo-req-label" dangerouslySetInnerHTML={{ __html: `${m.icon} ${m.name}` }} />
                            <span className="promo-req-value">{m.have}/{m.need}</span>
                          </div>
                        ))}
                      </div>
                      {promoInfo.rewards && Object.keys(promoInfo.rewards).length > 0 && (
                        <div className="promo-reward-list">
                          <span className="promo-reward-title" dangerouslySetInnerHTML={{ __html: '&#127873; 승급 보상' }} />
                          {promoInfo.rewards.attackSlots > 0 && (
                            <span className="promo-reward-tag">공격 스킬칸 +{promoInfo.rewards.attackSlots}</span>
                          )}
                          {promoInfo.rewards.defenseSlots > 0 && (
                            <span className="promo-reward-tag">방어 스킬칸 +{promoInfo.rewards.defenseSlots}</span>
                          )}
                          {promoInfo.rewards.bonusNotes > 0 && (
                            <span className="promo-reward-tag">턴 노트 +{promoInfo.rewards.bonusNotes}</span>
                          )}
                          {promoInfo.rewards.unlockTalent && (
                            <span className="promo-reward-tag">특기 해금</span>
                          )}
                        </div>
                      )}
                      <button className="btn-promote" onClick={doPromote} disabled={!canPromote}>
                        {'▲'} 승급하기
                      </button>
                    </>
                  );
                })()}

                <h3 className="tab-section-title" style={{ marginTop: 16 }}>각성 ({d.awakening}/5)</h3>
                {dupes.length > 0 ? (
                  <>
                    <p className="growth-hint">동일 캐릭터를 소모하여 각성합니다.</p>
                    <div className="awaken-list">
                      {dupes.map(dup => (
                        <button key={dup.inventory_id} className="btn-awaken" onClick={() => doAwaken(dup.inventory_id)}>
                          {dup.name} Lv.{dup.level} 소모
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="growth-hint">각성에 필요한 중복 캐릭터가 없습니다.</p>
                )}
              </div>
            )}
          </div>
        </div>
        </div>

        <button className="btn-detail-nav-side right" disabled={!nextChar}
          onClick={() => nextChar && selectChar(nextChar)}
          dangerouslySetInnerHTML={{ __html: '&#9654;' }} />
      </div>

      {bustZoom && (d.imageBust || d.imageUrl) && (
        <div className="bust-zoom-overlay" onClick={() => setBustZoom(false)}>
          <img src={d.imageBust || d.imageUrl} alt={d.name} className="bust-zoom-img" />
        </div>
      )}

      {promoCutscene && (
        <div className="promo-cutscene-overlay" onClick={() => setPromoCutscene(null)}>
          <div className="promo-cutscene-bg" />
          <div className="promo-cutscene-content">
            <img src={promoCutscene.imageLd} alt={promoCutscene.name} className="promo-cutscene-img" />
            <div className="promo-cutscene-info">
              <div className="promo-cutscene-stars">
                {Array.from({ length: promoCutscene.promotion }, (_, i) => (
                  <span key={i} className="promo-cutscene-star" dangerouslySetInnerHTML={{ __html: '&#9733;' }} />
                ))}
              </div>
              <span className="promo-cutscene-name">{promoCutscene.name}</span>
              {promoCutscene.title && <span className="promo-cutscene-title">{promoCutscene.title}</span>}
            </div>
            <div className="promo-cutscene-dialogue">{promoCutscene.text}</div>
            <p className="promo-cutscene-hint">탭하여 닫기</p>
          </div>
        </div>
      )}
    </div>
  );
}
