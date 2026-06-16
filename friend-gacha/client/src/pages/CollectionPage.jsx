import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import CharacterCard from '../components/CharacterCard';
import './CollectionPage.css';

export default function CollectionPage({ user }) {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => { loadCollection(); }, []);

  const loadCollection = async () => {
    const d = await api.myCollection();
    setData(d);
  };

  if (!data) return <div className="loading">로딩 중...</div>;

  const filtered = filter === 'all'
    ? data.items
    : data.items.filter(i => i.rarity === filter);

  // 유니크 캐릭터 그룹핑
  const grouped = {};
  filtered.forEach(item => {
    if (!grouped[item.character_id]) {
      grouped[item.character_id] = { ...item, count: 1 };
    } else {
      grouped[item.character_id].count++;
    }
  });
  const uniqueItems = Object.values(grouped);

  return (
    <div className="collection-page">
      <div className="collection-header">
        <h2>도감</h2>
        <div className="completion">
          <div className="completion-bar">
            <div className="completion-fill" style={{ width: `${data.completion.rate}%` }} />
          </div>
          <span>{data.completion.collected}/{data.completion.total} ({data.completion.rate}%)</span>
        </div>
      </div>

      <div className="filter-tabs">
        {['all', 'SSR', 'SR', 'R', 'N'].map(f => (
          <button key={f} className={`filter-btn ${filter === f ? 'active' : ''} ${f !== 'all' ? `rarity-${f}` : ''}`}
            onClick={() => setFilter(f)}>
            {f === 'all' ? '전체' : f} {f !== 'all' && <span className="filter-count">({data.items.filter(i => i.rarity === f).length})</span>}
          </button>
        ))}
      </div>

      <div className="collection-grid">
        {uniqueItems.map(item => (
          <div key={item.character_id} className={`coll-item rarity-bg-${item.rarity}`} onClick={() => setSelected(item)}>
            <div className={`coll-avatar rarity-border-${item.rarity}`}>
              {item.image_url ? <img src={item.image_url} alt={item.name} className="coll-avatar-img" /> : item.name[0]}
            </div>
            <span className={`coll-name rarity-${item.rarity}`}>{item.name}</span>
            {item.count > 1 && <span className="coll-count">x{item.count}</span>}
          </div>
        ))}
      </div>

      {uniqueItems.length === 0 && <p className="empty-msg">아직 뽑은 캐릭터가 없습니다</p>}

      {/* 상세 모달 */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <CharacterCard character={selected} rarity={selected.rarity} />
            <button className="btn-secondary" style={{ marginTop: 12, width: '100%' }}
              onClick={() => { api.toggleFavorite(selected.inventory_id); setSelected(null); }}>
              {selected.is_favorite ? '★ 즐겨찾기 해제' : '☆ 즐겨찾기'}
            </button>
            <button className="btn-close" onClick={() => setSelected(null)}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
