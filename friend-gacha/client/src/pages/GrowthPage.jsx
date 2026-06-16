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

function getRarityStyle(rarity) {
  if (rarity === 'CR') return { background: 'linear-gradient(90deg, #ff0000, #ff8800, #ffff00, #00ff00, #0088ff, #8800ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 'bold' };
  return { color: RARITY_COLORS[rarity] || '#888' };
}

function getRarityBorderStyle(rarity) {
  if (rarity === 'CR') return { borderImage: 'linear-gradient(90deg, #ff0000, #ff8800, #ffff00, #00ff00, #0088ff, #8800ff) 1' };
  return { borderColor: RARITY_COLORS[rarity] || '#888' };
}
const SKILL_TYPE_LABELS = {};
const SKILL_TYPE_COLORS = {};
for (const [k, v] of Object.entries(gameConfig.skillTypes)) {
  SKILL_TYPE_LABELS[k] = v.label;
  SKILL_TYPE_COLORS[k] = v.color;
}
const RARITY_COLORS = {};
for (const [k, v] of Object.entries(gameConfig.rarities)) RARITY_COLORS[k] = v.color;

export default function GrowthPage({ user, onRefresh, addToast }) {
  const [characters, setCharacters] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [showSkillManager, setShowSkillManager] = useState(false);
  const [dupes, setDupes] = useState([]);

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
      // 같은 캐릭터 중복 찾기
      const d = characters.filter(c => c.character_id === data.characterId && c.inventory_id !== invId);
      setDupes(d);
    } catch (err) { addToast(err.message, 'error'); }
  };

  const selectChar = (c) => {
    setSelected(c.inventory_id);
    setShowSkillManager(false);
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
      addToast('스킬 장착!', 'trade');
    } catch (err) { addToast(err.message, 'error'); }
  };

  // 캐릭터 목록
  if (!detail) {
    return (
      <div className="growth-page">
        <h2>캐릭터 리스트</h2>
        <div className="char-card-grid">
          {characters.map(c => {
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

  const d = detail;
  const rarityColor = RARITY_COLORS[d.rarity] || '#888';

  return (
    <div className="growth-page">
      <button className="btn-back" onClick={() => { setDetail(null); setSelected(null); }}>← 목록</button>

      {/* 캐릭터 카드 */}
      <div className="growth-card" style={{ borderColor: rarityColor }}>
        <div className="growth-avatar" style={{ borderColor: rarityColor }}>
          {(d.imageLd || d.imageUrl)
            ? <img src={d.imageLd || d.imageUrl} alt={d.name} className="growth-avatar-img" />
            : d.name[0]}
          <span className="growth-elem">{ELEM_ICONS[d.element]}</span>
        </div>
        <div className="growth-info">
          <h2>{d.name} <span className={`rarity-inline ${d.rarity.toLowerCase()}`} style={getRarityStyle(d.rarity)}>[{d.rarity}]</span></h2>
          <div className="growth-title">{d.title}</div>
          <div className="growth-level">Lv.{d.level}/{d.maxLevel} · 각성 {d.awakening}/5 · 🎵{d.turnNotes}</div>
          {d.origin && <div className="growth-origin" style={{ color: ORIGIN_COLORS[d.origin] }}>근원: {ORIGIN_LABELS[d.origin] || d.origin}</div>}
        </div>
      </div>

      {/* 스탯 */}
      <div className="stat-grid">
        <div className="stat-item"><span className="stat-label">HP</span><span className="stat-value">{d.stats.hp}</span></div>
        <div className="stat-item"><span className="stat-label">ATK</span><span className="stat-value">{d.stats.atk}</span></div>
        <div className="stat-item"><span className="stat-label">DEF</span><span className="stat-value">{d.stats.def}</span></div>
        <div className="stat-item"><span className="stat-label">SPD</span><span className="stat-value">{d.stats.spd}</span></div>
      </div>

      {/* 경험치 */}
      <div className="exp-section">
        <div className="exp-bar">
          <div className="exp-fill" style={{ width: `${d.exp / d.nextLevelExp * 100}%` }} />
        </div>
        <div className="exp-text">{d.exp}/{d.nextLevelExp} EXP</div>
      </div>

      {/* 장착 스킬 */}
      <div className="skill-section">
        <div className="skill-section-header">
          <h3>장착 스킬</h3>
          <button className="btn-manage-skills" onClick={() => setShowSkillManager(!showSkillManager)}>
            {showSkillManager ? '닫기' : '스킬 관리'}
          </button>
        </div>
        <div className="equipped-skills">
          {d.equippedSkills.map((s, i) => (
            <div key={i} className="skill-item" style={{ borderLeftColor: SKILL_TYPE_COLORS[s.type] || '#666' }}>
              <div className="skill-name">{s.name} <span className="skill-type-badge">{SKILL_TYPE_LABELS[s.type]}</span></div>
              <div className="skill-desc">{s.description}</div>
              <div className="skill-cost">🎵{s.cost}{s.power > 0 ? ` · ${Math.round(s.power * 100)}%` : ''}{s.defense_mult > 0 ? ` · 방어${Math.round(s.defense_mult * 100)}%` : ''}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 스킬 관리 */}
      {showSkillManager && (
        <div className="skill-manager">
          <h3>스킬 풀 (슬롯 클릭으로 장착)</h3>
          <div className="skill-pool-grid">
            {d.skillPool.map(s => {
              const isEquipped = d.equippedSkills.some(es => es.id === s.id);
              return (
                <div key={s.id} className={`skill-pool-item ${isEquipped ? 'equipped' : ''}`}
                  onClick={() => {
                    if (!isEquipped) {
                      const nextSlot = d.equippedSkills.length;
                      equipSkill(s.id, nextSlot);
                    }
                  }}>
                  <div className="skill-name">{s.name} {isEquipped ? '✓' : ''}</div>
                  <div className="skill-desc">{s.description}</div>
                  <div className="skill-cost" style={{ color: SKILL_TYPE_COLORS[s.type] }}>
                    {SKILL_TYPE_LABELS[s.type]} · 🎵{s.cost}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 레벨업 */}
      <div className="action-section">
        <h3>레벨업 (골드 → 경험치)</h3>
        <div className="levelup-buttons">
          <button className="btn-secondary" onClick={() => doLevelUp(1000)} disabled={user.gold < 1000}>1K 🪙</button>
          <button className="btn-secondary" onClick={() => doLevelUp(3000)} disabled={user.gold < 3000}>3K 🪙</button>
          <button className="btn-secondary" onClick={() => doLevelUp(5000)} disabled={user.gold < 5000}>5K 🪙</button>
        </div>
      </div>

      {/* 각성 */}
      {dupes.length > 0 && (
        <div className="action-section">
          <h3>각성 (중복 캐릭터 소모)</h3>
          <div className="awaken-list">
            {dupes.map(d => (
              <button key={d.inventory_id} className="btn-secondary awaken-btn" onClick={() => doAwaken(d.inventory_id)}>
                {d.name} Lv.{d.level} 소모하여 각성
              </button>
            ))}
          </div>
        </div>
      )}

      {d.quote && <div className="growth-quote">"{d.quote}"</div>}
      {d.description && <div className="growth-desc">{d.description}</div>}

      <div className="action-section">
        <button className="btn-secondary" style={{ width: '100%' }} onClick={async () => {
          try {
            await api.setRepresentative(selected);
            addToast(`${d.name}을(를) 대표 캐릭터로 설정!`, 'trade');
          } catch (err) { addToast(err.message, 'error'); }
        }}>⭐ 대표 캐릭터로 설정</button>
      </div>
    </div>
  );
}
