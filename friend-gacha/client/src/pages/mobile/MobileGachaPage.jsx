import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { getSocket } from '../../utils/socket';
import CharacterCard from '../../components/CharacterCard';
import CurrencyIcon from '../../components/CurrencyIcon';
import DialogueBubble from '../../components/DialogueBubble';
import { loadDialogues, getGachaLine } from '../../utils/dialogues';
import gameConfig from '@gameConfig';
import { RARITY_COLORS, SKILL_TYPE_LABELS, SKILL_TYPE_COLORS, getRarityStyle, SKILL_RARITY_COLORS, SKILL_RARITY_LABELS, getSkillRarityStyle } from '../../utils/gameConstants';
import './MobileGachaPage.css';

export default function MobileGachaPage({ user, onPull, addToast }) {
  const [pulling, setPulling] = useState(false);
  const [phase, setPhase] = useState('idle');
  const [results, setResults] = useState([]);
  const [currentReveal, setCurrentReveal] = useState(0);
  const [banners, setBanners] = useState([]);
  const [gachaMode, setGachaMode] = useState('character');
  const [skillResults, setSkillResults] = useState([]);
  const [skillBanners, setSkillBanners] = useState([]);
  const [showRatesFor, setShowRatesFor] = useState(null);
  const [ratesData, setRatesData] = useState(null);

  const isTutorialPull = (user.tutorialStep || 0) < 3 && (user.totalPulls || 0) === 0;

  useEffect(() => {
    api.banners().then(d => setBanners(d.banners || [])).catch(() => {});
    api.skillBanners().then(d => setSkillBanners(d.banners || [])).catch(() => {});
    loadDialogues();
  }, []);

  const toggleRates = async (bannerId) => {
    if (showRatesFor === bannerId) { setShowRatesFor(null); return; }
    try {
      const data = await api.rates(bannerId);
      setRatesData(data);
      setShowRatesFor(bannerId);
    } catch { addToast('확률 정보를 불러올 수 없습니다', 'error'); }
  };

  const calcCharRate = (rarity, charId) => {
    if (!ratesData) return 0;
    const totalRate = ratesData.rates[rarity] || 0;
    const chars = ratesData.characters.filter(c => c.rarity === rarity);
    if (chars.length === 0) return 0;
    const featured = ratesData.featuredCharIds || [];
    const featuredInRarity = chars.filter(c => featured.includes(c.id));
    const rateUp = ratesData.featuredRateUp || 0;
    if (rateUp > 0 && featuredInRarity.length > 0) {
      const nonFeaturedCount = chars.length - featuredInRarity.length;
      if (featured.includes(charId)) return totalRate * rateUp / featuredInRarity.length;
      return nonFeaturedCount > 0 ? totalRate * (1 - rateUp) / nonFeaturedCount : 0;
    }
    return totalRate / chars.length;
  };

  const doPull = async (multi, bannerId) => {
    setPulling(true);
    setPhase('charging');
    try {
      const data = multi ? await api.pull10(bannerId) : await api.pull(bannerId);
      const pullResults = multi ? data.results : [data.result];
      const socket = getSocket();
      pullResults.forEach(r => {
        if (r.rarity === 'CR' || r.rarity === 'SSR' || r.rarity === 'SR') {
          socket?.emit('pull_result', { characterName: r.character.name, rarity: r.rarity });
        }
      });
      setTimeout(() => {
        setResults(pullResults);
        setCurrentReveal(0);
        setPhase('reveal');
      }, 1500);
    } catch (err) {
      addToast(err.message, 'error');
      setPhase('idle');
      setPulling(false);
    }
  };

  const nextReveal = () => {
    if (currentReveal < results.length - 1) setCurrentReveal(prev => prev + 1);
    else setPhase('results');
  };

  const skipToResults = () => setPhase('results');

  const finish = () => {
    setPhase('idle');
    setPulling(false);
    setResults([]);
    setSkillResults([]);
    setCurrentReveal(0);
    onPull();
  };

  const doSkillPull = async (multi, bannerId) => {
    setPulling(true);
    setPhase('charging');
    try {
      const data = multi ? await api.skillPull10(bannerId) : await api.skillPull(bannerId);
      const pullResults = multi ? data.results : [data.result];
      setTimeout(() => {
        setSkillResults(pullResults);
        setPhase('skill-results');
      }, 1200);
    } catch (err) {
      addToast(err.message, 'error');
      setPhase('idle');
      setPulling(false);
    }
  };

  if (phase === 'charging') {
    return (
      <div className="mg-stage">
        <div className="mg-charging-orb">
          <div className="mg-orb-inner" />
          <div className="mg-orb-ring" />
          <div className="mg-orb-ring mg-delay" />
        </div>
        <p className="mg-charging-text">{'소환 중...'}</p>
      </div>
    );
  }

  if (phase === 'reveal' && results.length > 0) {
    const current = results[currentReveal];
    const r = current.rarity;
    const gachaLine = getGachaLine(current.character?.id);
    return (
      <div className="mg-stage" onClick={nextReveal}>
        <div className={`mg-reveal-bg rarity-glow-${r}`} />
        <div className="mg-reveal-card">
          <CharacterCard character={current.character} rarity={r} isNew={current.isNew} />
        </div>
        {gachaLine && (
          <DialogueBubble
            key={currentReveal}
            speaker={current.character?.name}
            text={gachaLine}
            duration={8000}
            variant="gacha"
          />
        )}
        <div className="mg-reveal-counter">{currentReveal + 1} / {results.length}</div>
        <p className="mg-tap-hint">{'탭하여 다음'}</p>
        {results.length > 1 && (
          <button className="mg-btn-skip" onClick={(e) => { e.stopPropagation(); skipToResults(); }}
            dangerouslySetInnerHTML={{ __html: '전체 보기 &#8594;' }} />
        )}
      </div>
    );
  }

  if (phase === 'results') {
    return (
      <div className="mg-results">
        <h2 className="mg-results-title">{'뽑기 결과'}</h2>
        <div className="mg-results-grid">
          {results.map((r, i) => (
            <div key={i} className={`mg-result-item rarity-bg-${r.rarity}`}>
              <div className={`mg-result-avatar rarity-border-${r.rarity}`}>
                {r.character.image_url
                  ? <img src={r.character.image_url} alt={r.character.name} />
                  : r.character.name?.[0]}
              </div>
              <span className={`mg-result-name rarity-${r.rarity}`}>{r.character.name}</span>
              <span className="mg-result-rarity">{r.rarity}</span>
              {r.isNew && <span className="mg-result-new">NEW</span>}
            </div>
          ))}
        </div>
        <button className="mg-btn-confirm" onClick={finish}>{'확인'}</button>
      </div>
    );
  }

  if (phase === 'skill-results') {
    return (
      <div className="mg-results">
        <h2 className="mg-results-title">{'스킬 뽑기 결과'}</h2>
        <div className="mg-results-grid">
          {skillResults.map((r, i) => (
            <div key={i} className="mg-result-item mg-skill-result">
              <span className="mg-skill-type" style={{ background: SKILL_TYPE_COLORS[r.skill.type] || '#666' }}>
                {SKILL_TYPE_LABELS[r.skill.type] || r.skill.type}
              </span>
              <span className="mg-skill-name">{r.skill.name}</span>
              <span className="mg-skill-rarity" style={getSkillRarityStyle(r.rarity)}>
                {SKILL_RARITY_LABELS[r.rarity] || r.rarity}
              </span>
              {r.skill.description && <span className="mg-skill-desc">{r.skill.description}</span>}
            </div>
          ))}
        </div>
        <button className="mg-btn-confirm" onClick={finish}>{'확인'}</button>
      </div>
    );
  }

  const skillGachaCfg = gameConfig.skillGacha;
  const skillPullCost = skillGachaCfg.pullCost;

  return (
    <div className="mg-page">
      <div className="mg-currency-bar">
        <span className="mg-currency-chip"><CurrencyIcon type="prism" size={18} /> {user.currency?.toLocaleString() || 0}</span>
      </div>

      <div className="mg-mode-tabs">
        <button className={`mg-mode-tab ${gachaMode === 'character' ? 'active' : ''}`}
          onClick={() => setGachaMode('character')}>{'캐릭터 뽑기'}</button>
        <button className={`mg-mode-tab ${gachaMode === 'skill' ? 'active' : ''}`}
          onClick={() => setGachaMode('skill')}>{'스킬 뽑기'}</button>
      </div>

      {gachaMode === 'character' && (
        <div className="mg-banner-area">
          <div className="mg-pity">
            <span>{'천장까지'}</span>
            <div className="mg-pity-bar">
              <div className="mg-pity-fill" style={{ width: `${(user.pityCounter / 90) * 100}%` }} />
            </div>
            <span className="mg-pity-count">{user.pityCounter}/90</span>
          </div>

          <div className="mg-banner-list">
            {banners.map(b => {
              const bRates = b.rates || gameConfig.gacha.rates;
              return (
                <div key={b.id} className="mg-banner-group">
                  <div className="mg-banner" onClick={() => toggleRates(b.id)}>
                    {b.image ? (
                      <img src={b.image} alt={b.name} className="mg-banner-img" />
                    ) : (
                      <div className="mg-banner-bg" />
                    )}
                    {(b.showTitle !== false) && (
                      <div className="mg-banner-overlay">
                        <h2 className="mg-banner-title">{b.name}</h2>
                        {b.description && <p className="mg-banner-sub">{b.description}</p>}
                        {b.type === 'limited' && b.endDate && (
                          <p className="mg-banner-period">{b.endDate}{'까지'}</p>
                        )}
                      </div>
                    )}
                    {(b.showRates !== false) && (
                      <div className="mg-banner-rates">
                        {Object.entries(bRates).reverse().map(([r, rate]) => (
                          <span key={r} style={getRarityStyle(r)} className="mg-rate-badge">
                            {r} {(rate * 100).toFixed(rate < 0.01 ? 1 : 0)}%
                          </span>
                        ))}
                      </div>
                    )}
                    <span className="mg-rates-hint" dangerouslySetInnerHTML={{ __html: '&#128202; 확률 상세' }} />
                  </div>

                  <div className="mg-pull-buttons">
                    <button className="mg-btn-pull mg-btn-single" onClick={() => doPull(false, b.id)}
                      disabled={pulling || (!isTutorialPull && user.currency < 100)}>
                      <span className="mg-pull-label">{'1회 뽑기'}</span>
                      <span className="mg-pull-cost">{isTutorialPull ? '무료' : <><CurrencyIcon type="prism" size={14} />100</>}</span>
                    </button>
                    <button className="mg-btn-pull mg-btn-multi" onClick={() => doPull(true, b.id)}
                      disabled={pulling || user.currency < 1000}>
                      <span className="mg-pull-label">{'10연차'}</span>
                      <span className="mg-pull-cost"><CurrencyIcon type="prism" size={14} />1,000</span>
                      <span className="mg-pull-bonus" dangerouslySetInnerHTML={{ __html: 'SR&#51060;&#49345; 1&#44060; &#48372;&#51109;!' }} />
                    </button>
                  </div>
                </div>
              );
            })}
            {banners.length === 0 && (
              <div className="mg-banner-group">
                <div className="mg-banner" onClick={() => toggleRates('default')}>
                  <div className="mg-banner-bg" />
                  <div className="mg-banner-overlay">
                    <h2 className="mg-banner-title">{'가챠'}</h2>
                  </div>
                  <span className="mg-rates-hint" dangerouslySetInnerHTML={{ __html: '&#128202; 확률 상세' }} />
                </div>
                <div className="mg-pull-buttons">
                  <button className="mg-btn-pull mg-btn-single" onClick={() => doPull(false)}
                    disabled={pulling || (!isTutorialPull && user.currency < 100)}>
                    <span className="mg-pull-label">{'1회 뽑기'}</span>
                    <span className="mg-pull-cost">{isTutorialPull ? '무료' : <><CurrencyIcon type="prism" size={14} />100</>}</span>
                  </button>
                  <button className="mg-btn-pull mg-btn-multi" onClick={() => doPull(true)}
                    disabled={pulling || user.currency < 1000}>
                    <span className="mg-pull-label">{'10연차'}</span>
                    <span className="mg-pull-cost"><CurrencyIcon type="prism" size={14} />1,000</span>
                    <span className="mg-pull-bonus" dangerouslySetInnerHTML={{ __html: 'SR&#51060;&#49345; 1&#44060; &#48372;&#51109;!' }} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {gachaMode === 'skill' && (
        <div className="mg-banner-area">
          <div className="mg-banner-list">
            {skillBanners.map(b => {
              const bRates = b.rates || gameConfig.skillGacha.rates;
              const cost = b.pullCost ?? skillPullCost;
              const multiCost = cost * (gameConfig.skillGacha.multiPullCount ?? 10);
              return (
                <div key={b.id} className="mg-banner-group">
                  <div className="mg-banner">
                    {b.image ? (
                      <img src={b.image} alt={b.name} className="mg-banner-img" />
                    ) : (
                      <div className="mg-banner-bg mg-skill-bg" />
                    )}
                    {(b.showTitle !== false) && (
                      <div className="mg-banner-overlay">
                        <h2 className="mg-banner-title">{b.name}</h2>
                        {b.description && <p className="mg-banner-sub">{b.description}</p>}
                        {b.type === 'limited' && b.endDate && (
                          <p className="mg-banner-period">{b.endDate}{'까지'}</p>
                        )}
                      </div>
                    )}
                    {(b.showRates !== false) && (
                      <div className="mg-banner-rates">
                        {Object.entries(bRates).reverse().map(([r, rate]) => (
                          <span key={r} style={getSkillRarityStyle(r)} className="mg-rate-badge">
                            {SKILL_RARITY_LABELS[r] || r} {(rate * 100).toFixed(rate < 0.01 ? 1 : 0)}%
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mg-pull-buttons">
                    <button className="mg-btn-pull mg-btn-single" onClick={() => doSkillPull(false, b.id)}
                      disabled={pulling || user.currency < cost}>
                      <span className="mg-pull-label">{'1회 뽑기'}</span>
                      <span className="mg-pull-cost"><CurrencyIcon type="prism" size={14} />{cost}</span>
                    </button>
                    <button className="mg-btn-pull mg-btn-multi" onClick={() => doSkillPull(true, b.id)}
                      disabled={pulling || user.currency < multiCost}>
                      <span className="mg-pull-label">{'10연차'}</span>
                      <span className="mg-pull-cost"><CurrencyIcon type="prism" size={14} />{multiCost.toLocaleString()}</span>
                      <span className="mg-pull-bonus">{'담 이상 1개 보장!'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
            {skillBanners.length === 0 && (
              <div className="mg-skill-empty">
                <h3 dangerouslySetInnerHTML={{ __html: '&#9835; 스킬 가챠' }} />
                <p>{'활성화된 스킬 배너가 없습니다'}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {showRatesFor && ratesData && (
        <div className="mg-rates-overlay" onClick={() => setShowRatesFor(null)}>
          <div className="mg-rates-modal" onClick={e => e.stopPropagation()}>
            <div className="mg-rates-header">
              <h3 dangerouslySetInnerHTML={{ __html: '&#128202; 출현 확률 상세' }} />
              <button className="mg-rates-close" onClick={() => setShowRatesFor(null)}>&times;</button>
            </div>
            <div className="mg-rates-body">
              {['CR', 'SSR', 'SR', 'R', 'N'].map(rarity => {
                const totalRate = ratesData.rates[rarity] || 0;
                if (totalRate <= 0) return null;
                const chars = ratesData.characters.filter(c => c.rarity === rarity);
                if (chars.length === 0) return null;
                const featured = ratesData.featuredCharIds || [];
                return (
                  <div key={rarity} className="mg-rates-section">
                    <div className={`mg-rates-rarity-header rarity-${rarity}`}>
                      <span style={getRarityStyle(rarity)}>{rarity}</span>
                      <span className="mg-rates-total">{(totalRate * 100).toFixed(1)}%</span>
                      <span className="mg-rates-count">{chars.length}{'종'}</span>
                    </div>
                    <div className="mg-rates-char-list">
                      {chars.map(c => {
                        const charRate = calcCharRate(rarity, c.id);
                        return (
                          <div key={c.id} className={`mg-rates-char ${featured.includes(c.id) ? 'mg-featured' : ''}`}>
                            <div className="mg-rates-avatar">
                              {c.image_url ? <img src={c.image_url} alt={c.name} /> : c.name?.[0]}
                            </div>
                            <span className="mg-rates-name">{c.name}</span>
                            <span className="mg-rates-pct">{(charRate * 100).toFixed(3)}%</span>
                            {featured.includes(c.id) && <span className="mg-rates-up">UP</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
