import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import './FeedPage.css';

export default function FeedPage() {
  const [feed, setFeed] = useState([]);

  useEffect(() => {
    api.feed().then(d => setFeed(d.feed));
  }, []);

  const timeAgo = (dateStr) => {
    const diff = (Date.now() - new Date(dateStr + 'Z').getTime()) / 1000;
    if (diff < 60) return '방금 전';
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    return `${Math.floor(diff / 86400)}일 전`;
  };

  return (
    <div className="feed-page">
      <h2>실시간 피드</h2>
      <div className="feed-list">
        {feed.map(item => (
          <div key={item.id} className={`feed-item rarity-bg-${item.rarity}`}>
            <div className={`feed-avatar rarity-border-${item.rarity}`}>
              {item.display_name[0]}
            </div>
            <div className="feed-content">
              <span className="feed-user">{item.display_name}</span>
              <span className="feed-text">
                이(가) <span className={`rarity-${item.rarity}`}>[{item.rarity}] {item.char_name}</span>을(를) 뽑았다!
              </span>
              <span className="feed-time">{timeAgo(item.pulled_at)}</span>
            </div>
          </div>
        ))}
      </div>
      {feed.length === 0 && <p className="empty-msg">아직 뽑기 기록이 없습니다</p>}
    </div>
  );
}
