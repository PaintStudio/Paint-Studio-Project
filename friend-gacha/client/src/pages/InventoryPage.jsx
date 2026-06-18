import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import gameConfig from '@gameConfig';
import './InventoryPage.css';

const SKILL_TYPE_LABELS = {};
const SKILL_TYPE_COLORS = {};
for (const [k, v] of Object.entries(gameConfig.skillTypes)) {
  SKILL_TYPE_LABELS[k] = v.label;
  SKILL_TYPE_COLORS[k] = v.color;
}

const SKILL_RARITY_COLORS = { faint: '#aaa', pale: '#5dade2', deep: '#a569bd', iridescent: '#f39c12' };
const SKILL_RARITY_LABELS = { faint: '희미', pale: '옅은', deep: '짙은', iridescent: '무지개빛' };

export default function InventoryPage({ user }) {
  const [skillInv, setSkillInv] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadSkillInv(); }, []);

  const loadSkillInv = async () => {
    try {
      const data = await api.skillInventory();
      setSkillInv(data.skills || []);
    } catch {}
    setLoading(false);
  };

  return (
    <div className="inventory-page">
      <h2>보관함</h2>

      <div className="inv-section">
        <h3>보유 재화</h3>
        <div className="inv-currency-grid">
          <div className="inv-currency-card">
            <span className="inv-currency-icon">&#128142;</span>
            <div className="inv-currency-info">
              <span className="inv-currency-label">다이아</span>
              <span className="inv-currency-value">{(user.currency || 0).toLocaleString()}</span>
            </div>
          </div>
          <div className="inv-currency-card">
            <span className="inv-currency-icon">&#129689;</span>
            <div className="inv-currency-info">
              <span className="inv-currency-label">골드</span>
              <span className="inv-currency-value">{(user.gold || 0).toLocaleString()}</span>
            </div>
          </div>
          <div className="inv-currency-card">
            <span className="inv-currency-icon">&#9889;</span>
            <div className="inv-currency-info">
              <span className="inv-currency-label">스태미나</span>
              <span className="inv-currency-value">{user.stamina || 0}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="inv-section">
        <h3>보유 스킬 ({skillInv.length})</h3>
        {loading ? (
          <p className="inv-empty">로딩 중...</p>
        ) : skillInv.length === 0 ? (
          <p className="inv-empty">보유한 스킬이 없습니다.</p>
        ) : (() => {
          const grouped = {};
          for (const s of skillInv) {
            const key = s.id;
            if (!grouped[key]) {
              grouped[key] = { ...s, count: 0, freeCount: 0, equippedChars: [] };
            }
            grouped[key].count++;
            if (s.equippedOn) grouped[key].equippedChars.push(s.equippedOn);
            else grouped[key].freeCount++;
          }
          const groups = Object.values(grouped);
          return (
            <div className="inv-skill-grid">
              {groups.map(g => (
                <div key={g.id} className={'inv-skill-card' + (g.freeCount === 0 ? ' equipped' : '')}>
                  <div className="inv-skill-header">
                    <span className="inv-skill-type" style={{ background: SKILL_TYPE_COLORS[g.type] || '#666' }}>
                      {SKILL_TYPE_LABELS[g.type] || g.type}
                    </span>
                    <span className="inv-skill-rarity" style={{ color: SKILL_RARITY_COLORS[g.rarity] || '#aaa' }}>
                      {SKILL_RARITY_LABELS[g.rarity] || g.rarity}
                    </span>
                    {g.count > 1 && <span className="inv-skill-count">&#215;{g.count}</span>}
                  </div>
                  <span className="inv-skill-name">{g.name}</span>
                  {g.description && <span className="inv-skill-desc">{g.description}</span>}
                  <div className="inv-skill-footer">
                    <span className="inv-skill-cost">&#9835; {g.cost}{g.power > 0 ? ` · ${Math.round(g.power * 100)}%` : ''}</span>
                    {g.equippedChars.length > 0 && <span className="inv-skill-equipped">&#128100; {g.equippedChars.join(', ')}</span>}
                    {g.freeCount > 0 && <span className="inv-skill-free">미장착 {g.count > 1 ? g.freeCount : ''}</span>}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      <div className="inv-section">
        <h3>성장 재료</h3>
        <p className="inv-empty">아직 보유한 재료가 없습니다.</p>
      </div>

      <div className="inv-section">
        <h3>소모품</h3>
        <p className="inv-empty">아직 보유한 소모품이 없습니다.</p>
      </div>
    </div>
  );
}
