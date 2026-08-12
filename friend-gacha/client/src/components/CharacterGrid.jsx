import React, { useState, useEffect } from 'react';
import gameConfig from '@gameConfig';
import { ELEM_COLORS, RARITY_COLORS } from '../utils/gameConstants';
import './CharacterGrid.css';

const RARITY_ORDER = { N: 0, R: 1, SR: 2, SSR: 3, CR: 4 };

const SORT_OPTIONS = [
  { key: 'rarity', label: '레어도' },
  { key: 'acquired', label: '획득순' },
  { key: 'name', label: '이름' },
  { key: 'level', label: '레벨' },
  { key: 'element', label: '속성' },
  { key: 'origin', label: '근원' },
];

const ELEM_FILTERS = Object.entries(gameConfig.elements).map(([k, v]) => ({ key: k, label: v.label, color: v.color }));
const ORIGIN_FILTERS = Object.entries(gameConfig.origins).map(([k, v]) => ({ key: k, label: v.label, color: v.color }));

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

function sortCharacters(chars, sort) {
  return [...chars].sort((a, b) => {
    const cmp = compareByKey(a, b, sort.key);
    if (cmp !== 0) return cmp * (sort.dir === 'asc' ? 1 : -1);
    if (sort.key !== 'name') return a.name.localeCompare(b.name, 'ko');
    return 0;
  });
}

export default function CharacterGrid({ characters, onSelect, onBatchLock, selectedIds, title }) {
  const [sort, setSort] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem('charSort')); if (s?.key) return s; } catch {}
    return { key: 'rarity', dir: 'desc' };
  });
  const [filterRarity, setFilterRarity] = useState(null);
  const [filterElem, setFilterElem] = useState(null);
  const [filterOrigin, setFilterOrigin] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [lockMode, setLockMode] = useState(false);
  const [lockSelection, setLockSelection] = useState(new Set());

  const handleSort = (key) => {
    setSort(prev => {
      const next = prev.key === key
        ? { key, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
        : { key, dir: 'desc' };
      localStorage.setItem('charSort', JSON.stringify(next));
      return next;
    });
  };

  let filtered = characters;
  if (filterRarity) filtered = filtered.filter(c => c.rarity === filterRarity);
  if (filterElem) filtered = filtered.filter(c => c.element === filterElem);
  if (filterOrigin) filtered = filtered.filter(c => c.origin === filterOrigin);
  const sorted = sortCharacters(filtered, sort);

  const activeFilterCount = [filterRarity, filterElem, filterOrigin].filter(Boolean).length;

  return (
    <div className="char-grid-panel">
      <div className="char-list-header">
        <h2>{title || '캐릭터 리스트'}</h2>
        <div className="char-list-controls">
          {onBatchLock && !lockMode && (
            <button className="filter-toggle-btn" onClick={() => {
              const initial = new Set(characters.filter(c => c.is_locked === 1).map(c => c.inventory_id));
              setLockSelection(initial);
              setLockMode(true);
            }} dangerouslySetInnerHTML={{ __html: '&#128274; 잠금 관리' }} />
          )}
          <button className={`filter-toggle-btn ${activeFilterCount > 0 ? 'has-filter' : ''}`}
            onClick={() => setShowFilters(v => !v)}>
            &#9776; 필터{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </button>
          <div className="sort-bar">
            {SORT_OPTIONS.map(opt => (
              <button key={opt.key}
                className={`sort-btn ${sort.key === opt.key ? 'active' : ''}`}
                onClick={() => handleSort(opt.key)}>
                {opt.label}
                {sort.key === opt.key && <span className="sort-arrow">{sort.dir === 'desc' ? '▼' : '▲'}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="filter-panel">
          <div className="filter-row">
            <span className="filter-label">레어도</span>
            <div className="filter-chips">
              {['N', 'R', 'SR', 'SSR', 'CR'].map(r => (
                <button key={r}
                  className={`filter-chip ${filterRarity === r ? 'active' : ''} ${filterRarity === r && r === 'CR' ? 'rarity-CR' : ''}`}
                  style={filterRarity === r ? { borderColor: RARITY_COLORS[r] === 'rainbow' ? '#ff6b6b' : RARITY_COLORS[r], color: RARITY_COLORS[r] === 'rainbow' ? undefined : RARITY_COLORS[r] } : {}}
                  onClick={() => setFilterRarity(filterRarity === r ? null : r)}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-row">
            <span className="filter-label">속성</span>
            <div className="filter-chips">
              {ELEM_FILTERS.map(e => (
                <button key={e.key}
                  className={`filter-chip ${filterElem === e.key ? 'active' : ''}`}
                  style={filterElem === e.key ? { borderColor: e.color, color: e.color } : {}}
                  onClick={() => setFilterElem(filterElem === e.key ? null : e.key)}>
                  {e.label}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-row">
            <span className="filter-label">근원</span>
            <div className="filter-chips">
              {ORIGIN_FILTERS.map(o => (
                <button key={o.key}
                  className={`filter-chip ${filterOrigin === o.key ? 'active' : ''}`}
                  style={filterOrigin === o.key ? { borderColor: o.color, color: o.color } : {}}
                  onClick={() => setFilterOrigin(filterOrigin === o.key ? null : o.key)}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          {activeFilterCount > 0 && (
            <button className="filter-clear-btn" onClick={() => { setFilterRarity(null); setFilterElem(null); setFilterOrigin(null); }}>
              필터 초기화
            </button>
          )}
        </div>
      )}

      {lockMode && (
        <div className="lock-mode-bar">
          <span className="lock-mode-label" dangerouslySetInnerHTML={{ __html: `&#128274; 잠금할 캐릭터를 선택하세요 (${lockSelection.size}개 선택)` }} />
          <div className="lock-mode-actions">
            <button className="btn-lock-cancel" onClick={() => setLockMode(false)}>취소</button>
            <button className="btn-lock-confirm" onClick={() => {
              onBatchLock([...lockSelection]);
              setLockMode(false);
            }}>확인</button>
          </div>
        </div>
      )}

      <div className="char-card-grid">
        {sorted.map(c => {
          const rarityColor = RARITY_COLORS[c.rarity] || '#666';
          const elemColor = ELEM_COLORS[c.element] || '#95a5a6';
          const originImg = `/uploads/origins/${c.origin}.png`;
          const isSelected = selectedIds?.includes(c.inventory_id);
          const selOrder = isSelected ? selectedIds.indexOf(c.inventory_id) + 1 : 0;
          const isLockSelected = lockMode && lockSelection.has(c.inventory_id);
          return (
            <div key={c.inventory_id}
              className={`char-card ${isSelected ? 'char-card-selected' : ''} ${lockMode ? 'lock-mode' : ''} ${isLockSelected ? 'lock-selected' : ''} ${c.rarity === 'CR' ? 'rarity-border-CR' : ''}`}
              onClick={() => {
                if (lockMode) {
                  setLockSelection(prev => {
                    const next = new Set(prev);
                    if (next.has(c.inventory_id)) next.delete(c.inventory_id);
                    else next.add(c.inventory_id);
                    return next;
                  });
                } else {
                  onSelect(c);
                }
              }}
              style={{ borderColor: lockMode
                ? (isLockSelected ? '#f39c12' : 'rgba(255,255,255,0.1)')
                : (isSelected ? 'var(--accent)' : (c.rarity === 'CR' ? undefined : rarityColor)) }}>
              <div className="char-card-inner">
                <span className="char-card-origin-wrap">
                  <span className="char-card-origin" style={{
                    backgroundColor: elemColor,
                    WebkitMaskImage: `url(${originImg})`,
                    maskImage: `url(${originImg})`,
                  }} />
                </span>
                {(c.image_bust || c.image_url)
                  ? <img src={c.image_bust || c.image_url} alt={c.name} className="char-card-img" />
                  : <span className="char-card-initial">{c.name[0]}</span>}
                {selOrder > 0 && !lockMode && <div className="char-card-order">{selOrder}</div>}
                {lockMode && isLockSelected && <div className="char-card-lock-check" dangerouslySetInnerHTML={{ __html: '&#128274;' }} />}
                {!lockMode && c.is_locked === 1 && <div className="char-card-lock-icon" dangerouslySetInnerHTML={{ __html: '&#128274;' }} />}
              </div>
              <div className="char-card-bottom">
                <span className={`char-card-rarity ${c.rarity === 'CR' ? 'rarity-CR' : ''}`} style={c.rarity !== 'CR' ? { color: rarityColor || '#aaa' } : undefined}>{c.rarity}</span>
                <span className="char-card-name">{c.name}</span>
                {c.awakening > 0 && <span className="char-card-awakening">{'★'.repeat(c.awakening)}</span>}
                {c.promotion > 0 && <span className="char-card-promotion">{'▲'.repeat(c.promotion)}</span>}
                <span className="char-card-level">Lv.{c.level}</span>
              </div>
            </div>
          );
        })}
        {sorted.length === 0 && <p className="empty-msg">{characters.length === 0 ? '가챠에서 캐릭터를 뽑아보세요!' : '조건에 맞는 캐릭터가 없습니다'}</p>}
      </div>
    </div>
  );
}
