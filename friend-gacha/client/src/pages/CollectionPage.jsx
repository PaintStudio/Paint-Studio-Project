import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import gameConfig from '@gameConfig';
import { ElementModal, OriginModal } from '../components/InfoModals';
import LoadingOverlay from '../components/LoadingOverlay';
import { ELEM_ICONS, ELEM_COLORS, ELEM_LABELS, ORIGIN_LABELS, ORIGIN_COLORS, RARITY_COLORS, SKILL_TYPE_LABELS, SKILL_TYPE_COLORS, getRarityStyle } from '../utils/gameConstants';
import '../components/CharacterGrid.css';
import './CollectionPage.css';

export default function CollectionPage({ user }) {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('skills');
  const [filterRarity, setFilterRarity] = useState(null);
  const [filterOwned, setFilterOwned] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(null);
  const [statPresetIdx, setStatPresetIdx] = useState(1);

  useEffect(() => { api.codex().then(setData).catch(() => {}); }, []);

  if (!data) return <LoadingOverlay />;

  let filtered = data.characters;
  if (filterRarity) filtered = filtered.filter(c => c.rarity === filterRarity);
  if (filterOwned === true) filtered = filtered.filter(c => c.owned);
  if (filterOwned === false) filtered = filtered.filter(c => !c.owned);

  // ========== 상세 뷰 ==========
  if (selected) {
    const c = selected;
    const rarityColor = RARITY_COLORS[c.rarity] || '#888';
    const elemColor = ELEM_COLORS[c.element] || '#95a5a6';
    const curIdx = filtered.findIndex(ch => ch.id === c.id);
    const prevChar = curIdx > 0 ? filtered[curIdx - 1] : null;
    const nextChar = curIdx < filtered.length - 1 ? filtered[curIdx + 1] : null;

    return (
      <div className="collection-page codex-detail-view">
        <button className="btn-back" onClick={() => { setSelected(null); setActiveTab('skills'); }}>&#8592; 목록</button>

        <div className="codex-detail-wrap">
          <button className="btn-detail-nav-side left" disabled={!prevChar}
            onClick={() => { prevChar && setSelected(prevChar); setStatPresetIdx(1); }}
            dangerouslySetInnerHTML={{ __html: '&#9664;' }} />

          <div className="codex-detail-layout">
            {/* 좌측 */}
            <div className="codex-left">
              <div className="codex-illust" style={{ borderColor: c.owned ? rarityColor : 'rgba(255,255,255,0.15)' }}>
                {(c.imageBust || c.imageUrl)
                  ? <img src={c.imageBust || c.imageUrl} alt={c.name} className="codex-illust-img"
                      style={!c.owned ? { filter: 'brightness(0.4) grayscale(0.7)' } : undefined} />
                  : <span className="codex-illust-ph">{c.name[0]}</span>}
              </div>

              <div className="codex-meta-row">
                <span className="codex-rarity" style={getRarityStyle(c.rarity)}>{c.rarity}</span>
                <span className="codex-elem codex-clickable" onClick={() => setShowInfoModal('element')}>
                  <span dangerouslySetInnerHTML={{ __html: ELEM_ICONS[c.element] }} />
                  <span style={{ color: elemColor }}>{ELEM_LABELS[c.element]}</span>
                </span>
                {c.origin && (
                  <span className="codex-origin codex-clickable" onClick={() => setShowInfoModal('origin')}>
                    <span className="codex-origin-icon" style={{
                      backgroundColor: elemColor,
                      WebkitMaskImage: `url(/uploads/origins/${c.origin}.png)`,
                      maskImage: `url(/uploads/origins/${c.origin}.png)`,
                    }} />
                    <span style={{ color: ORIGIN_COLORS[c.origin] }}>{ORIGIN_LABELS[c.origin]}</span>
                  </span>
                )}
              </div>

              <div className="codex-name-block">
                <h2 className="codex-char-name">{c.name}</h2>
                {c.title && <p className="codex-char-title">{c.title}</p>}
              </div>

              {c.statPresets && (() => {
                const idx = Math.min(statPresetIdx, c.statPresets.length - 1);
                const preset = c.statPresets[idx];
                return (<>
                  <div className="codex-badge-row">
                    <span className="codex-badge">&#9835; {preset.turnNotes}</span>
                    {!c.owned && <span className="codex-badge codex-badge-locked">미보유</span>}
                  </div>
                  <div className="codex-stat-section">
                    <button className="codex-stat-toggle"
                      onClick={() => setStatPresetIdx((idx + 1) % c.statPresets.length)}>
                      {preset.label} &#9654;
                    </button>
                    <div className="codex-stat-grid">
                      <div className="codex-stat"><span className="cs-label">HP</span><span className="cs-value">{preset.stats.hp}</span></div>
                      <div className="codex-stat"><span className="cs-label">ATK</span><span className="cs-value">{preset.stats.atk}</span></div>
                      <div className="codex-stat"><span className="cs-label">DEF</span><span className="cs-value">{preset.stats.def}</span></div>
                      <div className="codex-stat"><span className="cs-label">SPD</span><span className="cs-value">{preset.stats.spd}</span></div>
                    </div>
                  </div>
                </>);
              })()}

              {c.quote && <div className="codex-quote">"{c.quote}"</div>}
              {c.description && <p className="codex-desc">{c.description}</p>}
            </div>

            {/* 우측 */}
            <div className="codex-right">
              <div className="codex-tabs">
                <button className={`codex-tab ${activeTab === 'skills' ? 'active' : ''}`} onClick={() => setActiveTab('skills')}>스킬</button>
                <button className={`codex-tab ${activeTab === 'talent' ? 'active' : ''}`} onClick={() => setActiveTab('talent')}>특기</button>
                <button className={`codex-tab ${activeTab === 'lore' ? 'active' : ''}`} onClick={() => setActiveTab('lore')}>정보</button>
              </div>

              <div className="codex-tab-content">
                {activeTab === 'skills' && (
                  <div className="codex-skill-list">
                    {c.skills.length === 0 && <p className="empty-msg">스킬 데이터가 없습니다.</p>}
                    {c.skills.map(s => (
                      <div key={s.id} className={`codex-skill-card ${s.isFixed ? 'codex-skill-fixed' : ''}`}>
                        <div className="codex-skill-header">
                          <span className="codex-skill-type" style={{ background: SKILL_TYPE_COLORS[s.type] || '#666' }}>
                            {SKILL_TYPE_LABELS[s.type] || s.type}
                          </span>
                          {s.element && s.element !== 'neutral' && (
                            <span className="codex-skill-elem" style={{ color: ELEM_COLORS[s.element] }}
                              dangerouslySetInnerHTML={{ __html: ELEM_ICONS[s.element] + ' ' + ELEM_LABELS[s.element] }} />
                          )}
                          <span className="codex-skill-name">{s.name}</span>
                          {s.isFixed && <span className="codex-skill-lock">&#128274;</span>}
                          {s.awakeningRequired > 0 && (
                            <span className="codex-skill-awaken"
                              dangerouslySetInnerHTML={{ __html: s.awakeningRequired > 10 ? `승급${s.awakeningRequired - 10}` : `&#9733;${s.awakeningRequired}` }} />
                          )}
                        </div>
                        {s.description && <p className="codex-skill-desc">{s.description}</p>}
                        <div className="codex-skill-footer">
                          <span className="codex-skill-cost">
                            &#9835; {s.cost}
                            {s.power > 0 && ` · ${Math.round(s.power * 100)}%`}
                            {s.defense_mult > 0 && ` · 방어${Math.round(s.defense_mult * 100)}%`}
                            {s.cooldown > 0 && <span> &middot; CD {s.cooldown}</span>}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'talent' && (
                  <div className="codex-talent-list">
                    {c.talents.length === 0 && <p className="empty-msg">특기 데이터가 없습니다.</p>}
                    {c.talents.map((t, i) => (
                      <div key={i} className="codex-talent-card">
                        <div className="codex-talent-header">
                          <span className="codex-talent-name">{t.name}</span>
                          {i === 0 && <span className="codex-talent-badge">기본</span>}
                          {i > 0 && i <= 5 && <span className="codex-talent-badge">각성 {i}</span>}
                          {i > 5 && <span className="codex-talent-badge">승급</span>}
                        </div>
                        <p className="codex-talent-desc">{t.desc}</p>
                        {t.flavor && <p className="codex-talent-flavor">{t.flavor}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'lore' && (
                  <div className="codex-lore-list">
                    {(!c.lore || c.lore.length === 0) && <p className="empty-msg">정보가 등록되지 않았습니다.</p>}
                    {c.lore?.map((entry, i) => (
                      <div key={i} className={`codex-lore-card ${!entry.unlocked ? 'codex-lore-locked' : ''}`}>
                        <div className="codex-lore-header">
                          <span className="codex-lore-title">{entry.unlocked ? entry.title : '???'}</span>
                          <span className="codex-lore-badge">
                            {entry.unlock === 0 ? '획득' : `승급 ${entry.unlock}`}
                          </span>
                          {!entry.unlocked && <span className="codex-lore-lock" dangerouslySetInnerHTML={{ __html: '&#128274;' }} />}
                        </div>
                        {entry.unlocked
                          ? <p className="codex-lore-content">{entry.content}</p>
                          : <p className="codex-lore-content codex-lore-hidden">
                              {entry.unlock === 0 ? '캐릭터를 획득하면 해금됩니다.' : `승급 ${entry.unlock} 달성 시 해금됩니다.`}
                            </p>
                        }
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <button className="btn-detail-nav-side right" disabled={!nextChar}
            onClick={() => { nextChar && setSelected(nextChar); setStatPresetIdx(1); }}
            dangerouslySetInnerHTML={{ __html: '&#9654;' }} />
        </div>

        {showInfoModal === 'element' && <ElementModal onClose={() => setShowInfoModal(null)} />}
        {showInfoModal === 'origin' && <OriginModal onClose={() => setShowInfoModal(null)} />}
      </div>
    );
  }

  // ========== 그리드 뷰 ==========
  return (
    <div className="collection-page">
      <div className="collection-header">
        <h2>도감</h2>
        <div className="codex-completion">
          <div className="completion-bar">
            <div className="completion-fill" style={{ width: `${data.completion.rate}%` }} />
          </div>
          <span>{data.completion.collected}/{data.completion.total} ({data.completion.rate}%)</span>
        </div>
      </div>

      <div className="codex-filters">
        <div className="codex-filter-group">
          {['SSR', 'SR', 'R', 'N'].map(r => (
            <button key={r}
              className={`codex-filter-chip ${filterRarity === r ? 'active' : ''}`}
              style={filterRarity === r ? { borderColor: RARITY_COLORS[r], color: RARITY_COLORS[r] } : {}}
              onClick={() => setFilterRarity(filterRarity === r ? null : r)}>
              {r}
            </button>
          ))}
        </div>
        <div className="codex-filter-group">
          <button className={`codex-filter-chip ${filterOwned === true ? 'active' : ''}`}
            onClick={() => setFilterOwned(filterOwned === true ? null : true)}>보유</button>
          <button className={`codex-filter-chip ${filterOwned === false ? 'active' : ''}`}
            onClick={() => setFilterOwned(filterOwned === false ? null : false)}>미보유</button>
        </div>
      </div>

      <div className="codex-card-grid">
        {filtered.map(c => {
          const rarityColor = RARITY_COLORS[c.rarity] || '#666';
          const elemColor = ELEM_COLORS[c.element] || '#95a5a6';
          const originImg = `/uploads/origins/${c.origin}.png`;
          return (
            <div key={c.id}
              className={`char-card ${!c.owned ? 'codex-card-locked' : ''}`}
              onClick={() => setSelected(c)}
              style={{ borderColor: c.owned ? rarityColor : 'rgba(255,255,255,0.15)' }}>
              <div className="char-card-inner">
                <span className="char-card-origin-wrap">
                  <span className="char-card-origin" style={{
                    backgroundColor: elemColor,
                    WebkitMaskImage: `url(${originImg})`,
                    maskImage: `url(${originImg})`,
                  }} />
                </span>
                {(c.imageBust || c.imageUrl)
                  ? <img src={c.imageBust || c.imageUrl} alt={c.name}
                      className="char-card-img"
                      style={!c.owned ? { filter: 'brightness(0.35) grayscale(0.6)' } : undefined} />
                  : <span className="char-card-initial">{c.name[0]}</span>}
              </div>
              <div className="char-card-bottom">
                <span className="char-card-rarity" style={{ color: rarityColor }}>{c.rarity}</span>
                <span className="char-card-name">{c.name}</span>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="empty-msg">조건에 맞는 캐릭터가 없습니다</p>}
      </div>
    </div>
  );
}
