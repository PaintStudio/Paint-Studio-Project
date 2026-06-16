import React, { useState } from 'react';
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
  const [phase, setPhase] = useState('idle'); // idle, charging, reveal, results
  const [results, setResults] = useState([]);
  const [currentReveal, setCurrentReveal] = useState(0);

  const doPull = async (multi) => {
    setPulling(true);
    setPhase('charging');

    try {
      const data = multi ? await api.pull10() : await api.pull();
      const pullResults = multi ? data.results : [data.result];

      // 소켓으로 결과 브로드캐스트
      const socket = getSocket();
      pullResults.forEach(r => {
        if (r.rarity === 'CR' || r.rarity === 'SSR' || r.rarity === 'SR') {
          socket?.emit('pull_result', { characterName: r.character.name, rarity: r.rarity });
        }
      });

      // 연출 시작
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

  const skipToResults = () => {
    setPhase('results');
  };

  const finish = () => {
    setPhase('idle');
    setPulling(false);
    setResults([]);
    setCurrentReveal(0);
    onPull();
  };

  // 충전 연출
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

  // 한 장씩 공개
  if (phase === 'reveal' && results.length > 0) {
    const current = results[currentReveal];
    const r = current.rarity;
    return (
      <div className="gacha-stage" onClick={nextReveal}>
        <div className={`reveal-bg rarity-glow-${r}`} />
        <div className={`reveal-card animate-in`}>
          <CharacterCard character={current.character} rarity={r} isNew={current.isNew} />
        </div>
        <div className="reveal-counter">
          {currentReveal + 1} / {results.length}
        </div>
        <p className="tap-hint">탭하여 다음</p>
        {results.length > 1 && (
          <button className="btn-skip" onClick={(e) => { e.stopPropagation(); skipToResults(); }}>
            전체 보기 →
          </button>
        )}
      </div>
    );
  }

  // 전체 결과
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

  // 메인 가챠 화면
  return (
    <div className="gacha-main">
      <div className="gacha-banner">
        <div className="banner-bg" />
        <h2 className="banner-title">가챠</h2>
        <p className="banner-sub">「돌려」</p>
        <div className="banner-rates">
          {Object.entries(gameConfig.gacha.rates).reverse().map(([r, rate]) => (
            <span key={r} style={getRarityStyle(r)} className="rate-badge">
              {r} {(rate * 100).toFixed(rate < 0.01 ? 1 : 0)}%
            </span>
          ))}
        </div>
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
          <span className="pull-cost">💎 100</span>
        </button>
        <button
          className="btn-pull btn-pull-multi"
          onClick={() => doPull(true)}
          disabled={pulling || user.currency < 1000}
        >
          <span className="pull-label">10연차</span>
          <span className="pull-cost">💎 1,000</span>
          <span className="pull-bonus">R이상 1개 보장!</span>
        </button>
      </div>
    </div>
  );
}
