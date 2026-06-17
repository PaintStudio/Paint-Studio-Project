import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import gameConfig from '@gameConfig';
import './GrowthPage.css';

const ELEM_ICONS = { fire: '🔥', water: '💧', wind: '🌿', light: '✨', dark: '🌑', neutral: '⚪' };

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

function getRarityStyle(rarity) {
  if (rarity === 'CR') return { background: 'linear-gradient(90deg, #ff0000, #ff8800, #ffff00, #00ff00, #0088ff, #8800ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 'bold' };
  return { color: RARITY_COLORS[rarity] || '#888' };
}

function SkillTypeBadge({ type }) {
  return (
    <span className="skill-type-badge" style={{ background: SKILL_TYPE_COLORS[type] || '#666' }}>
      {SKILL_TYPE_LABELS[type] || type}
    </span>
  );
}

function SkillCard({ skill, equipped, onAction, actionLabel }) {
  return (
    <div className={`sk-card ${equipped ? 'sk-equipped' : ''}`} onClick={onAction}>
      <div className="sk-card-header">
        <SkillTypeBadge type={skill.type} />
        <span className="sk-card-name">{skill.name}{equipped !== undefined && equipped && ' ✓'}</span>
      </div>
      {skill.description && <p className="sk-card-desc">{skill.description}</p>}
      <div className="sk-card-footer">
        <span className="sk-card-cost">
          ♪ {skill.cost}
          {skill.power > 0 ? ` · ${Math.round(skill.power * 100)}%` : ''}
          {skill.defense_mult > 0 ? ` · 방어${Math.round(skill.defense_mult * 100)}%` : ''}
        </span>
        {actionLabel && <button className="sk-card-action" onClick={(e) => { e.stopPropagation(); onAction(); }}>{actionLabel}</button>}
      </div>
    </div>
  );
}

const POOL_PAGE_SIZE = 6; // 2열 x 3행

const RARITY_ORDER = { N: 0, R: 1, SR: 2, SSR: 3, CR: 4 };

const SORT_OPTIONS = [
  { key: 'rarity', label: '레어도' },
  { key: 'acquired', label: '획득순' },
  { key: 'name', label: '이름' },
  { key: 'level', label: '레벨' },
  { key: 'element', label: '속성' },
  { key: 'origin', label: '근원' },
];

function compareByKey(a, b, key) {
  switch (key) {
    case 'rarity': return (RARITY_ORDER[a.rarity] || 0) - (RARITY_ORDER[b.rarity] || 0);
    case 'acquired': return a.inventory_id - b.inventory_id;
    case 'name': return a.name.localeCompare(b.name, 'ko');
    case 'level': return a.level - b.level;
    case 'element': return a.element.localeCompare(b.element);
    case 'origin': return (a.origin || '').localeCompare(b.origin || '');
    default: return 0;
  }
}

function sortCharacters(chars, sortStack) {
  return [...chars].sort((a, b) => {
    for (const { key, dir } of sortStack) {
      const cmp = compareByKey(a, b, key);
      if (cmp !== 0) return cmp * (dir === 'asc' ? 1 : -1);
    }
    return 0;
  });
}

export default function GrowthPage({ user, onRefresh, addToast }) {
  const [characters, setCharacters] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [dupes, setDupes] = useState([]);
  const [activeTab, setActiveTab] = useState('skills');
  const [poolPage, setPoolPage] = useState(0);
  const [sortStack, setSortStack] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem('charSortStack')); if (Array.isArray(s) && s.length) return s; } catch {}
    return [{ key: 'rarity', dir: 'desc' }];
  });

  useEffect(() => { loadChars(); }, []);

  const loadChars = async () => {
    try {
      const data = await api.partyList();
      setCharacters(data.characters);
    } catch (err) { addToast(err.message, 'error'); }
  };

  const loadDetail = async (invId) => {
    try {
      const data = await api.charDetail(invId);
      setDetail(data);
      const d = characters.filter(c => c.character_id === data.characterId && c.inventory_id !== invId);
      setDupes(d);
    } catch (err) { addToast(err.message, 'error'); }
  };

  const selectChar = (c) => {
    setSelected(c.inventory_id);
    setActiveTab('skills');
    setPoolPage(0);
    loadDetail(c.inventory_id);
  };

  const doLevelUp = async (amount) => {
    try {
      const result = await api.levelUp(selected, amount);
      addToast(`레벨업! Lv.${result.level} (+${result.levelsGained})`, 'sr');
      loadDetail(selected);
      loadChars();
      onRefresh();
    } catch (err) { addToast(err.message, 'error'); }
  };

  const doAwaken = async (materialId) => {
    try {
      const result = await api.awaken(selected, materialId);
      addToast(`각성 ${result.awakening}단계!`, 'ssr');
      loadDetail(selected);
      loadChars();
      onRefresh();
    } catch (err) { addToast(err.message, 'error'); }
  };

  const equipSkill = async (skillId, slot) => {
    try {
      await api.equipSkill(selected, skillId, slot);
      loadDetail(selected);
      setPoolPage(0);
      addToast('스킬 장착!', 'trade');
    } catch (err) { addToast(err.message, 'error'); }
  };

  const unequipSkill = async (slot) => {
    try {
      await api.unequipSkill(selected, slot);
      loadDetail(selected);
      addToast('스킬 해제', 'trade');
    } catch (err) { addToast(err.message, 'error'); }
  };

  // ========== 캐릭터 목록 ==========
  const sorted = sortCharacters(characters, sortStack);

  const handleSort = (key) => {
    setSortStack(prev => {
      const idx = prev.findIndex(s => s.key === key);
      let next;
      if (idx === 0) {
        next = [{ key, dir: prev[0].dir === 'desc' ? 'asc' : 'desc' }, ...prev.slice(1)];
      } else {
        const rest = prev.filter(s => s.key !== key);
        next = [{ key, dir: 'desc' }, ...rest];
      }
      localStorage.setItem('charSortStack', JSON.stringify(next));
      return next;
    });
  };

  if (!detail) {
    return (
      <div className="growth-page">
        <div className="char-list-header">
          <h2>캐릭터 리스트</h2>
          <div className="sort-bar">
            {SORT_OPTIONS.map(opt => {
              const idx = sortStack.findIndex(s => s.key === opt.key);
              const entry = idx >= 0 ? sortStack[idx] : null;
              return (
                <button key={opt.key}
                  className={`sort-btn ${idx === 0 ? 'active' : idx > 0 ? 'sub' : ''}`}
                  onClick={() => handleSort(opt.key)}>
                  {idx >= 0 && <span className="sort-rank">{idx + 1}</span>}
                  {opt.label}
                  {entry && <span className="sort-arrow">{entry.dir === 'desc' ? '▼' : '▲'}</span>}
                </button>
              );
            })}
          </div>
        </div>
        <div className="char-card-grid">
          {sorted.map(c => {
            const originColor = ORIGIN_COLORS[c.origin] || '#666';
            return (
              <div key={c.inventory_id} className="char-card" onClick={() => selectChar(c)}
                style={{ borderColor: originColor }}>
                <div className="char-card-inner">
                  <span className="char-card-elem">{ELEM_ICONS[c.element]}</span>
                  {(c.image_bust || c.image_url)
                    ? <img src={c.image_bust || c.image_url} alt={c.name} className="char-card-img" />
                    : <span className="char-card-initial">{c.name[0]}</span>}
                  <div className="char-card-level">Lv.{c.level}</div>
                </div>
                <div className="char-card-bottom">
                  <span className="char-card-rarity" style={{ color: RARITY_COLORS[c.rarity] === 'rainbow' ? '#ffd700' : (RARITY_COLORS[c.rarity] || '#aaa') }}>{c.rarity}</span>
                  <span className="char-card-name">{c.name}</span>
                </div>
              </div>
            );
          })}
          {characters.length === 0 && <p className="empty-msg">가챠에서 캐릭터를 뽑아보세요!</p>}
        </div>
      </div>
    );
  }

  // ========== 캐릭터 상세 ==========
  const d = detail;
  const rarityColor = RARITY_COLORS[d.rarity] || '#888';

  // 스킬 풀 페이지네이션
  const totalPoolPages = Math.max(1, Math.ceil(d.skillPool.length / POOL_PAGE_SIZE));
  const pagedPool = d.skillPool.slice(poolPage * POOL_PAGE_SIZE, (poolPage + 1) * POOL_PAGE_SIZE);

  return (
    <div className="growth-page detail-view">
      <button className="btn-back" onClick={() => { setDetail(null); setSelected(null); }}>← 목록</button>

      <div className="detail-layout">
        {/* ====== 좌측 ====== */}
        <div className="detail-left">
          <div className="detail-left-inner">
            <div className="detail-illust" style={{ borderColor: rarityColor }}>
              {(d.imageLd || d.imageBust || d.imageUrl)
                ? <img src={d.imageLd || d.imageBust || d.imageUrl} alt={d.name} className="detail-illust-img" />
                : <span className="detail-illust-placeholder">일러스트</span>}
            </div>

            <div className="detail-meta-row">
              <span className="detail-rarity-badge" style={getRarityStyle(d.rarity)}>{d.rarity}</span>
              <span className="detail-elem-icon">{ELEM_ICONS[d.element]}</span>
              {d.origin && <span className="detail-origin-text" style={{ color: ORIGIN_COLORS[d.origin] }}>{ORIGIN_LABELS[d.origin]}</span>}
            </div>

            <div className="detail-name-block">
              <h2 className="detail-char-name">{d.name}</h2>
              {d.title && <p className="detail-char-title">{d.title}</p>}
            </div>

            <div className="detail-badge-row">
              <span className="detail-badge">Lv.{d.level}/{d.maxLevel}</span>
              <span className="detail-badge">{d.awakening}/5 ★</span>
              <span className="detail-badge">🎵 {d.turnNotes}</span>
            </div>

            <div className="detail-exp-line">{d.exp}/{d.nextLevelExp} EXP</div>

            <div className="detail-stat-grid">
              <div className="detail-stat"><span className="ds-label">HP</span><span className="ds-value">{d.stats.hp}</span></div>
              <div className="detail-stat"><span className="ds-label">ATK</span><span className="ds-value">{d.stats.atk}</span></div>
              <div className="detail-stat"><span className="ds-label">DEF</span><span className="ds-value">{d.stats.def}</span></div>
              <div className="detail-stat"><span className="ds-label">SPD</span><span className="ds-value">{d.stats.spd}</span></div>
            </div>

            {d.quote && <div className="detail-quote">"{d.quote}"</div>}

            <button className="btn-representative" onClick={async () => {
              try {
                await api.setRepresentative(selected);
                addToast(`${d.name}을(를) 대표 캐릭터로 설정!`, 'trade');
              } catch (err) { addToast(err.message, 'error'); }
            }}>⭐ 대표 캐릭터로 설정</button>
          </div>
        </div>

        {/* ====== 우측 ====== */}
        <div className="detail-right">
          <div className="detail-tabs">
            <button className={`detail-tab ${activeTab === 'skills' ? 'active' : ''}`} onClick={() => setActiveTab('skills')}>스킬</button>
            <button className={`detail-tab ${activeTab === 'growth' ? 'active' : ''}`} onClick={() => setActiveTab('growth')}>육성</button>
          </div>

          <div className="detail-tab-content">
            {/* === 스킬 탭 === */}
            {activeTab === 'skills' && (
              <div className="tab-skills">
                <h3 className="tab-section-title">장착 스킬</h3>
                <div className="equipped-list">
                  {d.equippedSkills.map((s, i) => (
                    <SkillCard key={i} skill={s} actionLabel="해제"
                      onAction={() => unequipSkill(i)} />
                  ))}
                  {d.equippedSkills.length === 0 && <p className="empty-msg">장착된 스킬이 없습니다</p>}
                </div>

                <div className="pool-header">
                  <h3 className="tab-section-title">스킬 풀</h3>
                  {totalPoolPages > 1 && (
                    <div className="pool-pager">
                      <button className="pool-arrow" disabled={poolPage <= 0} onClick={() => setPoolPage(p => p - 1)}>‹</button>
                      <span className="pool-page-num">{poolPage + 1}/{totalPoolPages}</span>
                      <button className="pool-arrow" disabled={poolPage >= totalPoolPages - 1} onClick={() => setPoolPage(p => p + 1)}>›</button>
                    </div>
                  )}
                </div>
                <div className="pool-grid">
                  {pagedPool.map(s => {
                    const isEquipped = d.equippedSkills.some(es => es.id === s.id);
                    return (
                      <SkillCard key={s.id} skill={s} equipped={isEquipped}
                        onAction={() => {
                          if (!isEquipped) equipSkill(s.id, d.equippedSkills.length);
                        }} />
                    );
                  })}
                </div>
              </div>
            )}

            {/* === 육성 탭 === */}
            {activeTab === 'growth' && (
              <div className="tab-growth">
                <h3 className="tab-section-title">레벨업</h3>
                <p className="growth-hint">골드를 소모하여 경험치를 획득합니다. (보유: {user.gold?.toLocaleString() || 0} 🪙)</p>
                <div className="levelup-buttons">
                  <button className="btn-levelup" onClick={() => doLevelUp(1000)} disabled={user.gold < 1000}>
                    <span className="levelup-amount">1,000</span><span className="levelup-unit">🪙</span>
                  </button>
                  <button className="btn-levelup" onClick={() => doLevelUp(3000)} disabled={user.gold < 3000}>
                    <span className="levelup-amount">3,000</span><span className="levelup-unit">🪙</span>
                  </button>
                  <button className="btn-levelup" onClick={() => doLevelUp(5000)} disabled={user.gold < 5000}>
                    <span className="levelup-amount">5,000</span><span className="levelup-unit">🪙</span>
                  </button>
                </div>

                <div className="growth-exp-area">
                  <div className="growth-exp-bar">
                    <div className="growth-exp-fill" style={{ width: `${d.exp / d.nextLevelExp * 100}%` }} />
                  </div>
                  <span className="growth-exp-text">Lv.{d.level} — {d.exp}/{d.nextLevelExp} EXP</span>
                </div>

                <h3 className="tab-section-title">각성 ({d.awakening}/5)</h3>
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
    </div>
  );
}
