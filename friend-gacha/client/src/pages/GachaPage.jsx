import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../utils/api';
import { getSocket } from '../utils/socket';
import CharacterCard from '../components/CharacterCard';
import CurrencyIcon from '../components/CurrencyIcon';
import DialogueBubble from '../components/DialogueBubble';
import { loadDialogues, getGachaLine } from '../utils/dialogues';
import gameConfig from '@gameConfig';
import { RARITY_COLORS, SKILL_TYPE_LABELS, SKILL_TYPE_COLORS, getRarityStyle, SKILL_RARITY_COLORS, SKILL_RARITY_LABELS, getSkillRarityStyle } from '../utils/gameConstants';
import './GachaPage.css';

export default function GachaPage({ user, onPull, addToast }) {
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

  const [gachaBubble, setGachaBubble] = useState(null);

  const isTutorialPull = (user.tutorialStep || 0) < 3 && (user.totalPulls || 0) === 0;

  useEffect(() => {
    api.banners().then(d => {
      setBanners(d.banners || []);
    }).catch(() => {});
    api.skillBanners().then(d => {
      setSkillBanners(d.banners || []);
    }).catch(() => {});
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
      if (featured.includes(charId)) {
        return totalRate * rateUp / featuredInRarity.length;
      }
      return nonFeaturedCount > 0 ? totalRate * (1 - rateUp) / nonFeaturedCount : 0;
    }
    return totalRate / chars.length;
  };

  const doPull = async (multi, bannerId) => {
    setPulling(true);
    setPhase('charging');

    try {
      const data = multi
        ? await api.pull10(bannerId)
        : await api.pull(bannerId);
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
    if (currentReveal < results.length - 1) {
      setCurrentReveal(prev => prev + 1);
    } else {
      setPhase('results');
    }
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

  // 스킬 가챠
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
      <div className="gacha-stage">
        <div className="charging-orb">
          <div className="orb-inner" />
          <div className="orb-ring" />
          <div className="orb-ring delay" />
        </div>
        <p className="charging-text">소환 중...</p>
      </div>
    );
  }

  if (phase === 'reveal' && results.length > 0) {
    const current = results[currentReveal];
    const r = current.rarity;
    const gachaLine = getGachaLine(current.character?.id);
    return (
      <div className="gacha-stage" onClick={nextReveal}>
        <div className={`reveal-bg rarity-glow-${r}`} />
        <div className="reveal-card animate-in">
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
        <div className="reveal-counter">{currentReveal + 1} / {results.length}</div>
        <p className="tap-hint">탭하여 다음</p>
        {results.length > 1 && (
          <button className="btn-skip" onClick={(e) => { e.stopPropagation(); skipToResults(); }}>
            전체 보기 →
          </button>
        )}
      </div>
    );
  }

  if (phase === 'results') {
    return (
      <div className="gacha-results">
        <h2 className="results-title">뽑기 결과</h2>
        <div className="results-grid">
          {results.map((r, i) => (
            <div key={i} className={`result-item rarity-bg-${r.rarity}`}>
              <div className={`result-avatar rarity-border-${r.rarity}`}>
                {r.character.image_url
                  ? <img src={r.character.image_url} alt={r.character.name} style={{width:'100%',height:'100%',borderRadius:'50%',objectFit:'cover'}} />
                  : r.character.name?.[0]}
              </div>
              <span className={`result-name rarity-${r.rarity}`}>{r.character.name}</span>
              <span className="result-rarity">{r.rarity}</span>
              {r.isNew && <span className="result-new">NEW</span>}
            </div>
          ))}
        </div>
        <button className="btn-primary" onClick={finish}>확인</button>
      </div>
    );
  }

  if (phase === 'skill-results') {
    return (
      <div className="gacha-results">
        <h2 className="results-title">스킬 뽑기 결과</h2>
        <div className="results-grid">
          {skillResults.map((r, i) => (
            <div key={i} className="result-item skill-result-item">
              <span className="skill-result-type" style={{ background: SKILL_TYPE_COLORS[r.skill.type] || '#666' }}>
                {SKILL_TYPE_LABELS[r.skill.type] || r.skill.type}
              </span>
              <span className="skill-result-name">{r.skill.name}</span>
              <span className="skill-result-rarity" style={getSkillRarityStyle(r.rarity)}>
                {SKILL_RARITY_LABELS[r.rarity] || r.rarity}
              </span>
              {r.skill.description && <span className="skill-result-desc">{r.skill.description}</span>}
            </div>
          ))}
        </div>
        <button className="btn-primary" onClick={finish}>확인</button>
      </div>
    );
  }

  const skillGachaCfg = gameConfig.skillGacha;
  const skillPullCost = skillGachaCfg.pullCost;
  const skillMultiCost = skillPullCost * skillGachaCfg.multiPullCount;

  return (
    <div className="gacha-main">
      <div className="gacha-currency-bar">
        <span className="gacha-currency-item"><CurrencyIcon type="prism" /> {user.currency?.toLocaleString() || 0}</span>
      </div>
      <div className="gacha-mode-tabs">
        <button className={`gacha-mode-tab ${gachaMode === 'character' ? 'active' : ''}`}
          onClick={() => setGachaMode('character')}>캐릭터 뽑기</button>
        <button className={`gacha-mode-tab ${gachaMode === 'skill' ? 'active' : ''}`}
          onClick={() => setGachaMode('skill')}>스킬 뽑기</button>
      </div>

      {gachaMode === 'character' && (
        <>
          <div className="pity-info">
            <span>천장까지</span>
            <div className="pity-bar">
              <div className="pity-fill" style={{ width: `${(user.pityCounter / 90) * 100}%` }} />
            </div>
            <span className="pity-count">{user.pityCounter}/90</span>
          </div>

          <div className="banner-list">
            {banners.map(b => {
              const bRates = b.rates || gameConfig.gacha.rates;
              return (
                <div key={b.id} className="banner-group">
                  <div className="gacha-banner" onClick={() => toggleRates(b.id)} style={{ cursor: 'pointer' }}>
                    {b.image ? (
                      <img src={b.image} alt={b.name} className="banner-img" />
                    ) : (
                      <div className="banner-bg" />
                    )}
                    {(b.showTitle !== false) && (
                      <div className="banner-overlay">
                        <h2 className="banner-title">{b.name}</h2>
                        {b.description && <p className="banner-sub">{b.description}</p>}
                        {b.type === 'limited' && b.endDate && (
                          <p className="banner-period">{b.endDate}까지</p>
                        )}
                      </div>
                    )}
                    {(b.showRates !== false) && (
                      <div className="banner-rates">
                        {Object.entries(bRates).reverse().map(([r, rate]) => (
                          <span key={r} style={getRarityStyle(r)} className="rate-badge">
                            {r} {(rate * 100).toFixed(rate < 0.01 ? 1 : 0)}%
                          </span>
                        ))}
                      </div>
                    )}
                    <span className="banner-rates-hint">&#128202; 확률 상세</span>
                  </div>

                  <div className="pull-buttons">
                    <button className="btn-pull btn-pull-single" onClick={() => doPull(false, b.id)}
                      disabled={pulling || (!isTutorialPull && user.currency < 100)}>
                      <span className="pull-label">1회 뽑기</span>
                      <span className="pull-cost">{isTutorialPull ? '무료' : <><CurrencyIcon type="prism" />100</>}</span>
                    </button>
                    <button className="btn-pull btn-pull-multi" onClick={() => doPull(true, b.id)}
                      disabled={pulling || user.currency < 1000}>
                      <span className="pull-label">10연차</span>
                      <span className="pull-cost"><CurrencyIcon type="prism" />1,000</span>
                      <span className="pull-bonus">SR&#51060;&#49345; 1&#44060; &#48372;&#51109;!</span>
                    </button>
                  </div>
                </div>
              );
            })}
            {banners.length === 0 && (
              <div className="banner-group">
                <div className="gacha-banner" onClick={() => toggleRates('default')} style={{ cursor: 'pointer' }}>
                  <div className="banner-bg" />
                  <div className="banner-overlay">
                    <h2 className="banner-title">가챠</h2>
                  </div>
                  <span className="banner-rates-hint">&#128202; 확률 상세</span>
                </div>

                <div className="pull-buttons">
                  <button className="btn-pull btn-pull-single" onClick={() => doPull(false)}
                    disabled={pulling || (!isTutorialPull && user.currency < 100)}>
                    <span className="pull-label">1회 뽑기</span>
                    <span className="pull-cost">{isTutorialPull ? '무료' : <><CurrencyIcon type="prism" />100</>}</span>
                  </button>
                  <button className="btn-pull btn-pull-multi" onClick={() => doPull(true)}
                    disabled={pulling || user.currency < 1000}>
                    <span className="pull-label">10연차</span>
                    <span className="pull-cost"><CurrencyIcon type="prism" />1,000</span>
                    <span className="pull-bonus">SR&#51060;&#49345; 1&#44060; &#48372;&#51109;!</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {showRatesFor && ratesData && createPortal(
        <div className="rates-modal-backdrop" onClick={() => setShowRatesFor(null)}>
          <div className="rates-modal" onClick={e => e.stopPropagation()}>
            <div className="rates-panel-header">
              <h3>&#128202; 출현 확률 상세</h3>
              <button className="rates-close" onClick={() => setShowRatesFor(null)}>&times;</button>
            </div>
            {['CR', 'SSR', 'SR', 'R', 'N'].map(rarity => {
              const totalRate = ratesData.rates[rarity] || 0;
              if (totalRate <= 0) return null;
              const chars = ratesData.characters.filter(c => c.rarity === rarity);
              if (chars.length === 0) return null;
              const featured = ratesData.featuredCharIds || [];
              return (
                <div key={rarity} className="rates-rarity-section">
                  <div className={`rates-rarity-header rarity-${rarity}`}>
                    <span style={getRarityStyle(rarity)}>{rarity}</span>
                    <span className="rates-total">{(totalRate * 100).toFixed(1)}%</span>
                    <span className="rates-count">{chars.length}종</span>
                  </div>
                  <div className="rates-char-grid">
                    {chars.map(c => {
                      const charRate = calcCharRate(rarity, c.id);
                      return (
                        <div key={c.id} className={`rates-char-item ${featured.includes(c.id) ? 'featured' : ''}`}>
                          <div className="rates-char-avatar">
                            {c.image_url ? <img src={c.image_url} alt={c.name} /> : c.name?.[0]}
                          </div>
                          <span className="rates-char-name">{c.name}</span>
                          <span className="rates-char-rate">{(charRate * 100).toFixed(3)}%</span>
                          {featured.includes(c.id) && <span className="rates-up-badge">UP</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>,
        document.getElementById('game-root')
      )}

      {gachaMode === 'skill' && (
        <>
          <div className="banner-list">
            {skillBanners.map(b => {
              const bRates = b.rates || gameConfig.skillGacha.rates;
              const cost = b.pullCost ?? skillPullCost;
              const multiCost = cost * (gameConfig.skillGacha.multiPullCount ?? 10);
              return (
                <div key={b.id} className="banner-group">
                  <div className="gacha-banner">
                    {b.image ? (
                      <img src={b.image} alt={b.name} className="banner-img" />
                    ) : (
                      <div className="banner-bg skill-banner-bg" />
                    )}
                    {(b.showTitle !== false) && (
                      <div className="banner-overlay">
                        <h2 className="banner-title">{b.name}</h2>
                        {b.description && <p className="banner-sub">{b.description}</p>}
                        {b.type === 'limited' && b.endDate && (
                          <p className="banner-period">{b.endDate}까지</p>
                        )}
                      </div>
                    )}
                    {(b.showRates !== false) && (
                      <div className="banner-rates">
                        {Object.entries(bRates).reverse().map(([r, rate]) => (
                          <span key={r} style={getSkillRarityStyle(r)} className="rate-badge">
                            {SKILL_RARITY_LABELS[r] || r} {(rate * 100).toFixed(rate < 0.01 ? 1 : 0)}%
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="pull-buttons">
                    <button className="btn-pull btn-pull-single" onClick={() => doSkillPull(false, b.id)}
                      disabled={pulling || user.currency < cost}>
                      <span className="pull-label">1회 뽑기</span>
                      <span className="pull-cost"><CurrencyIcon type="prism" />{cost}</span>
                    </button>
                    <button className="btn-pull btn-pull-multi" onClick={() => doSkillPull(true, b.id)}
                      disabled={pulling || user.currency < multiCost}>
                      <span className="pull-label">10연차</span>
                      <span className="pull-cost"><CurrencyIcon type="prism" />{multiCost.toLocaleString()}</span>
                      <span className="pull-bonus">담 이상 1개 보장!</span>
                    </button>
                  </div>
                </div>
              );
            })}
            {skillBanners.length === 0 && (
              <div className="skill-gacha-info">
                <h3 className="skill-gacha-title">&#9835; 스킬 가챠</h3>
                <p className="skill-gacha-desc">활성화된 스킬 배너가 없습니다</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
