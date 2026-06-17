import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { getSocket } from '../utils/socket';
import CharacterCard from '../components/CharacterCard';
import gameConfig from '@gameConfig';
import './GachaPage.css';

const RARITY_COLORS = {};
for (const [k, v] of Object.entries(gameConfig.rarities)) RARITY_COLORS[k] = v.color;

function getRarityStyle(rarity) {
  if (rarity === 'CR') return { background: 'linear-gradient(90deg, #ff0000, #ff8800, #ffff00, #00ff00, #0088ff, #8800ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 'bold' };
  return { color: RARITY_COLORS[rarity] || '#888' };
}

export default function GachaPage({ user, onPull, addToast }) {
  const [pulling, setPulling] = useState(false);
  const [phase, setPhase] = useState('idle');
  const [results, setResults] = useState([]);
  const [currentReveal, setCurrentReveal] = useState(0);
  const [banners, setBanners] = useState([]);
  const [selectedBanner, setSelectedBanner] = useState(null);

  useEffect(() => {
    api.banners().then(d => {
      setBanners(d.banners || []);
      if (d.banners?.length > 0) setSelectedBanner(d.banners[0]);
    }).catch(() => {});
  }, []);

  const banner = selectedBanner;
  const rates = banner?.rates || gameConfig.gacha.rates;

  const doPull = async (multi) => {
    setPulling(true);
    setPhase('charging');

    try {
      const data = multi
        ? await api.pull10(banner?.id)
        : await api.pull(banner?.id);
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
    setCurrentReveal(0);
    onPull();
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
    return (
      <div className="gacha-stage" onClick={nextReveal}>
        <div className={`reveal-bg rarity-glow-${r}`} />
        <div className="reveal-card animate-in">
          <CharacterCard character={current.character} rarity={r} isNew={current.isNew} />
        </div>
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

  return (
    <div className="gacha-main">
      <div className="banner-list">
        {banners.map(b => {
          const selected = banner?.id === b.id;
          const bRates = b.rates || gameConfig.gacha.rates;
          return (
            <div key={b.id}
              className={`gacha-banner ${selected ? 'selected' : ''}`}
              onClick={() => setSelectedBanner(b)}>
              {b.image ? (
                <img src={b.image} alt={b.name} className="banner-img" />
              ) : (
                <div className="banner-bg" />
              )}
              <div className="banner-overlay">
                <h2 className="banner-title">{b.name}</h2>
                {b.description && <p className="banner-sub">{b.description}</p>}
                {b.type === 'limited' && b.endDate && (
                  <p className="banner-period">{b.endDate}까지</p>
                )}
              </div>
              {(b.showRates !== false) && (
                <div className="banner-rates">
                  {Object.entries(bRates).reverse().map(([r, rate]) => (
                    <span key={r} style={getRarityStyle(r)} className="rate-badge">
                      {r} {(rate * 100).toFixed(rate < 0.01 ? 1 : 0)}%
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {banners.length === 0 && (
          <div className="gacha-banner">
            <div className="banner-bg" />
            <div className="banner-overlay">
              <h2 className="banner-title">가챠</h2>
            </div>
          </div>
        )}
      </div>

      <div className="pity-info">
        <span>천장까지</span>
        <div className="pity-bar">
          <div className="pity-fill" style={{ width: `${(user.pityCounter / 90) * 100}%` }} />
        </div>
        <span className="pity-count">{user.pityCounter}/90</span>
      </div>

      <div className="pull-buttons">
        <button
          className="btn-pull btn-pull-single"
          onClick={() => doPull(false)}
          disabled={pulling || user.currency < 100}
        >
          <span className="pull-label">1회 뽑기</span>
          <span className="pull-cost">&#128142; 100</span>
        </button>
        <button
          className="btn-pull btn-pull-multi"
          onClick={() => doPull(true)}
          disabled={pulling || user.currency < 1000}
        >
          <span className="pull-label">10연차</span>
          <span className="pull-cost">&#128142; 1,000</span>
          <span className="pull-bonus">R이상 1개 보장!</span>
        </button>
      </div>
    </div>
  );
}
