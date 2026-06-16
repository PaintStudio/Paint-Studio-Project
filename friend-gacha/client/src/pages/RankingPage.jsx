import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import './RankingPage.css';

export default function RankingPage({ currentUserId }) {
  const [rankings, setRankings] = useState([]);

  useEffect(() => {
    api.rankings().then(d => setRankings(d.rankings));
  }, []);

  return (
    <div className="ranking-page">
      <h2>랭킹</h2>
      <div className="ranking-list">
        {rankings.map((r, i) => (
          <div key={r.id} className={`ranking-item ${r.id === currentUserId ? 'is-me' : ''}`}>
            <span className={`rank-num ${i < 3 ? `rank-${i + 1}` : ''}`}>
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
            </span>
            <div className="rank-avatar">{r.display_name[0]}</div>
            <div className="rank-info">
              <span className="rank-name">{r.display_name}</span>
              <span className="rank-stats">
                도감 {r.unique_count}종 · SSR {r.ssr_count}개 · {r.total_pulls}회 뽑기
              </span>
            </div>
          </div>
        ))}
      </div>
      {rankings.length === 0 && <p className="empty-msg">아직 데이터가 없습니다</p>}
    </div>
  );
}
