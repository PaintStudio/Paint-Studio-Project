import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { ElementModal, OriginModal } from '../../components/InfoModals';
import LoadingOverlay from '../../components/LoadingOverlay';
import { ELEM_ICONS, ELEM_COLORS, ELEM_LABELS, ORIGIN_LABELS, ORIGIN_COLORS, RARITY_COLORS, SKILL_TYPE_LABELS, SKILL_TYPE_COLORS, getRarityStyle } from '../../utils/gameConstants';
import './MobileCollectionPage.css';

function preloadImgUrls(urls) {
  if (!urls || urls.length === 0) return Promise.resolve();
  return Promise.all(urls.map(u => new Promise(r => { const img = new Image(); img.onload = img.onerror = r; img.src = u; })));
}

export default function MobileCollectionPage({ user }) {
  const [data, setData] = useState(null);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('skills');
  const [filterRarity, setFilterRarity] = useState(null);
  const [filterOwned, setFilterOwned] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(null);
  const [statPresetIdx, setStatPresetIdx] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        const d = await api.codex();
        setData(d);
        const urls = d.characters.map(c => c.imageBust || c.imageUrl).filter(Boolean);
        await preloadImgUrls(urls);
      } catch {}
      setReady(true);
    })();
  }, []);

  if (!ready) return <LoadingOverlay />;

  let filtered = data.characters;
  if (filterRarity) filtered = filtered.filter(c => c.rarity === filterRarity);
  if (filterOwned === true) filtered = filtered.filter(c => c.owned);
  if (filterOwned === false) filtered = filtered.filter(c => !c.owned);

  if (selected) {
    const c = selected;
    const rarityColor = RARITY_COLORS[c.rarity] || '#888';
    const elemColor = ELEM_COLORS[c.element] || '#95a5a6';
    const curIdx = filtered.findIndex(ch => ch.id === c.id);
    const prevChar = curIdx > 0 ? filtered[curIdx - 1] : null;
    const nextChar = curIdx < filtered.length - 1 ? filtered[curIdx + 1] : null;

    return (
      <div className="mc-page mc-has-detail">
        <div className="mc-detail-header">
          <button className="mc-back" onClick={() => { setSelected(null); setActiveTab('skills'); }}
            dangerouslySetInnerHTML={{ __html: '&#8592; 목록' }} />
          <div className="mc-detail-nav">
            <button className="mc-nav-btn" disabled={!prevChar}
              onClick={() => { prevChar && setSelected(prevChar); setStatPresetIdx(1); }}
              dangerouslySetInnerHTML={{ __html: '&#9664;' }} />
            <button className="mc-nav-btn" disabled={!nextChar}
              onClick={() => { nextChar && setSelected(nextChar); setStatPresetIdx(1); }}
              dangerouslySetInnerHTML={{ __html: '&#9654;' }} />
          </div>
        </div>

        <div className="mc-detail-body">
          <div className="mc-char-card">
            <div className="mc-illust" style={{ borderColor: c.owned ? rarityColor : 'rgba(255,255,255,0.15)' }}>
              {(c.imageBust || c.imageUrl)
                ? <img src={c.imageBust || c.imageUrl} alt={c.name} className="mc-illust-img"
                    style={!c.owned ? { filter: 'brightness(0.4) grayscale(0.7)' } : undefined} />
                : <span className="mc-illust-ph">{c.name[0]}</span>}
            </div>
            <div className="mc-char-info">
              <div className="mc-meta-row">
                <span className="mc-rarity" style={getRarityStyle(c.rarity)}>{c.rarity}</span>
                <span className="mc-elem mc-clickable" onClick={() => setShowInfoModal('element')}>
                  <span dangerouslySetInnerHTML={{ __html: ELEM_ICONS[c.element] }} />
                  <span style={{ color: elemColor }}>{ELEM_LABELS[c.element]}</span>
                </span>
                {c.origin && (
                  <span className="mc-origin mc-clickable" onClick={() => setShowInfoModal('origin')}>
                    <span className="mc-origin-icon" style={{
                      backgroundColor: elemColor,
                      WebkitMaskImage: `url(/uploads/origins/${c.origin}.png)`,
                      maskImage: `url(/uploads/origins/${c.origin}.png)`,
                    }} />
                    <span style={{ color: ORIGIN_COLORS[c.origin] }}>{ORIGIN_LABELS[c.origin]}</span>
                  </span>
                )}
              </div>
              <h2 className="mc-char-name">{c.name}</h2>
              {c.title && <p className="mc-char-title">{c.title}</p>}
              <div className="mc-badge-row">
                {!c.owned && <span className="mc-badge mc-badge-locked">{'미보유'}</span>}
              </div>
            </div>
          </div>

          {c.statPresets && (() => {
            const idx = Math.min(statPresetIdx, c.statPresets.length - 1);
            const preset = c.statPresets[idx];
            return (
              <div className="mc-stat-section">
                <button className="mc-stat-toggle"
                  onClick={() => setStatPresetIdx((idx + 1) % c.statPresets.length)}>
                  {preset.label} {'▶'}
                </button>
                <div className="mc-stat-grid">
                  <div className="mc-stat"><span className="mc-sl">HP</span><span className="mc-sv">{preset.stats.hp}</span></div>
                  <div className="mc-stat"><span className="mc-sl">ATK</span><span className="mc-sv">{preset.stats.atk}</span></div>
                  <div className="mc-stat"><span className="mc-sl">DEF</span><span className="mc-sv">{preset.stats.def}</span></div>
                  <div className="mc-stat"><span className="mc-sl">SPD</span><span className="mc-sv">{preset.stats.spd}</span></div>
                </div>
                <span className="mc-note-badge">{'♫'} {preset.turnNotes}</span>
              </div>
            );
          })()}

          {c.quote && <div className="mc-quote">"{c.quote}"</div>}
          {c.description && <p className="mc-desc">{c.description}</p>}

          <div className="mc-tabs">
            <button className={`mc-tab ${activeTab === 'skills' ? 'active' : ''}`} onClick={() => setActiveTab('skills')}>{'스킬'}</button>
            <button className={`mc-tab ${activeTab === 'talent' ? 'active' : ''}`} onClick={() => setActiveTab('talent')}>{'특기'}</button>
            <button className={`mc-tab ${activeTab === 'lore' ? 'active' : ''}`} onClick={() => setActiveTab('lore')}>{'정보'}</button>
          </div>

          <div className="mc-tab-content">
            {activeTab === 'skills' && (
              <div className="mc-skill-list">
                {c.skills.length === 0 && <p className="mc-empty">{'스킬 데이터가 없습니다.'}</p>}
                {c.skills.map(s => (
                  <div key={s.id} className={`mc-skill-card ${s.isFixed ? 'mc-skill-fixed' : ''}`}>
                    <div className="mc-skill-header">
                      <span className="mc-skill-type" style={{ background: SKILL_TYPE_COLORS[s.type] || '#666' }}>
                        {SKILL_TYPE_LABELS[s.type] || s.type}
                      </span>
                      {s.element && s.element !== 'neutral' && (
                        <span className="mc-skill-elem" style={{ color: ELEM_COLORS[s.element] }}
                          dangerouslySetInnerHTML={{ __html: ELEM_ICONS[s.element] + ' ' + ELEM_LABELS[s.element] }} />
                      )}
                      <span className="mc-skill-name">{s.name}</span>
                      {s.isFixed && <span className="mc-skill-lock" dangerouslySetInnerHTML={{ __html: '&#128274;' }} />}
                      {s.awakeningRequired > 0 && (
                        <span className="mc-skill-awaken"
                          dangerouslySetInnerHTML={{ __html: s.awakeningRequired > 10 ? `승급${s.awakeningRequired - 10}` : `&#9733;${s.awakeningRequired}` }} />
                      )}
                    </div>
                    {s.description && <p className="mc-skill-desc">{s.description}</p>}
                    <div className="mc-skill-footer">
                      <span className="mc-skill-cost">
                        {'♫'} {s.cost}
                        {s.power > 0 && ` · ${Math.round(s.power * 100)}%`}
                        {s.defense_mult > 0 && ` · 방어${Math.round(s.defense_mult * 100)}%`}
                        {s.cooldown > 0 && <span> {'·'} CD {s.cooldown}</span>}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'talent' && (
              <div className="mc-talent-list">
                {c.talents.length === 0 && <p className="mc-empty">{'특기 데이터가 없습니다.'}</p>}
                {c.talents.map((t, i) => (
                  <div key={i} className="mc-talent-card">
                    <div className="mc-talent-header">
                      <span className="mc-talent-name">{t.name}</span>
                      {i === 0 && <span className="mc-talent-badge">{'기본'}</span>}
                      {i > 0 && i <= 5 && <span className="mc-talent-badge">{'각성'} {i}</span>}
                      {i > 5 && <span className="mc-talent-badge">{'승급'}</span>}
                    </div>
                    <p className="mc-talent-desc">{t.desc}</p>
                    {t.flavor && <p className="mc-talent-flavor">{t.flavor}</p>}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'lore' && (
              <div className="mc-lore-list">
                {(!c.lore || c.lore.length === 0) && <p className="mc-empty">{'정보가 등록되지 않았습니다.'}</p>}
                {c.lore?.map((entry, i) => (
                  <div key={i} className={`mc-lore-card ${!entry.unlocked ? 'mc-lore-locked' : ''}`}>
                    <div className="mc-lore-header">
                      <span className="mc-lore-title">{entry.unlocked ? entry.title : '???'}</span>
                      <span className="mc-lore-badge">
                        {entry.unlock === 0 ? '획득' : `승급 ${entry.unlock}`}
                      </span>
                      {!entry.unlocked && <span className="mc-lore-lock" dangerouslySetInnerHTML={{ __html: '&#128274;' }} />}
                    </div>
                    {entry.unlocked
                      ? <p className="mc-lore-content">{entry.content}</p>
                      : <p className="mc-lore-content mc-lore-hidden">
                          {entry.unlock === 0 ? '캐릭터를 획득하면 해금됩니다.' : `승급 ${entry.unlock} 달성 시 해금됩니다.`}
                        </p>
                    }
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {showInfoModal === 'element' && <ElementModal onClose={() => setShowInfoModal(null)} />}
        {showInfoModal === 'origin' && <OriginModal onClose={() => setShowInfoModal(null)} />}
      </div>
    );
  }

  return (
    <div className="mc-page">
      <div className="mc-grid-header">
        <h2>{'도감'}</h2>
        <div className="mc-completion">
          <div className="mc-completion-bar">
            <div className="mc-completion-fill" style={{ width: `${data.completion.rate}%` }} />
          </div>
          <span>{data.completion.collected}/{data.completion.total} ({data.completion.rate}%)</span>
        </div>
      </div>

      <div className="mc-filters">
        <div className="mc-filter-group">
          {['SSR', 'SR', 'R', 'N'].map(r => (
            <button key={r}
              className={`mc-filter-chip ${filterRarity === r ? 'active' : ''}`}
              style={filterRarity === r ? { borderColor: RARITY_COLORS[r], color: RARITY_COLORS[r] } : {}}
              onClick={() => setFilterRarity(filterRarity === r ? null : r)}>
              {r}
            </button>
          ))}
        </div>
        <div className="mc-filter-group">
          <button className={`mc-filter-chip ${filterOwned === true ? 'active' : ''}`}
            onClick={() => setFilterOwned(filterOwned === true ? null : true)}>{'보유'}</button>
          <button className={`mc-filter-chip ${filterOwned === false ? 'active' : ''}`}
            onClick={() => setFilterOwned(filterOwned === false ? null : false)}>{'미보유'}</button>
        </div>
      </div>

      <div className="mc-card-grid">
        {filtered.map(c => {
          const rarityColor = RARITY_COLORS[c.rarity] || '#666';
          const elemColor = ELEM_COLORS[c.element] || '#95a5a6';
          const originImg = `/uploads/origins/${c.origin}.png`;
          return (
            <div key={c.id}
              className={`mc-card ${!c.owned ? 'mc-card-locked' : ''}`}
              onClick={() => setSelected(c)}
              style={{ borderColor: c.owned ? rarityColor : 'rgba(255,255,255,0.15)' }}>
              <div className="mc-card-inner">
                <span className="mc-card-origin-wrap">
                  <span className="mc-card-origin" style={{
                    backgroundColor: elemColor,
                    WebkitMaskImage: `url(${originImg})`,
                    maskImage: `url(${originImg})`,
                  }} />
                </span>
                {(c.imageBust || c.imageUrl)
                  ? <img src={c.imageBust || c.imageUrl} alt={c.name} className="mc-card-img"
                      style={!c.owned ? { filter: 'brightness(0.35) grayscale(0.6)' } : undefined} />
                  : <span className="mc-card-initial">{c.name[0]}</span>}
              </div>
              <div className="mc-card-bottom">
                <span className="mc-card-rarity" style={{ color: rarityColor }}>{c.rarity}</span>
                <span className="mc-card-name">{c.name}</span>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="mc-empty">{'조건에 맞는 캐릭터가 없습니다'}</p>}
      </div>
    </div>
  );
}
