import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import CurrencyIcon, { currencyImg } from '../components/CurrencyIcon';
import gameConfig from '@gameConfig';
import './InventoryPage.css';

const RARITY_COLORS = { N: '#aaa', R: '#5dadec', SR: '#c77dff', SSR: '#ffd700', CR: 'rainbow' };
const CATEGORY_LABELS = {
  material: '소재', awakening: '각성 재료', boss: '보스 소재', consumable: '소모품',
};

export default function InventoryPage({ user, onRefresh, addToast }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [using, setUsing] = useState(false);

  useEffect(() => { loadItems(); }, []);

  const loadItems = async () => {
    try {
      const data = await api.myItems();
      setItems(data.items || []);
    } catch {}
    setLoading(false);
  };

  const useStaminaItem = async (itemId) => {
    if (using) return;
    setUsing(true);
    try {
      const result = await api.useItem(itemId);
      addToast?.(`스태미나 회복! (${result.stamina})`, 'trade');
      onRefresh?.();
      loadItems();
      setSelected(null);
    } catch (err) {
      addToast?.(err.message, 'error');
    }
    setUsing(false);
  };

  const grouped = {};
  for (const it of items) {
    const cat = it.category || 'material';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(it);
  }

  const categoryOrder = ['material', 'awakening', 'boss', 'consumable'];

  return (
    <div className="inventory-page">
      <h2>보관함</h2>

      <div className="inv-section">
        <h3>보유 재화</h3>
        <div className="inv-currency-grid">
          <div className="inv-currency-card">
            <CurrencyIcon type="prism" />
            <div className="inv-currency-info">
              <span className="inv-currency-label">프리즘</span>
              <span className="inv-currency-value">{(user.currency || 0).toLocaleString()}</span>
            </div>
          </div>
          <div className="inv-currency-card">
            <CurrencyIcon type="bit" />
            <div className="inv-currency-info">
              <span className="inv-currency-label">비트</span>
              <span className="inv-currency-value">{(user.gold || 0).toLocaleString()}</span>
            </div>
          </div>
          <div className="inv-currency-card">
            <CurrencyIcon type="stamina" />
            <div className="inv-currency-info">
              <span className="inv-currency-label">스태미나</span>
              <span className="inv-currency-value">{user.stamina || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="inv-empty">로딩 중...</p>
      ) : items.length === 0 ? (
        <p className="inv-empty">보유한 아이템이 없습니다.</p>
      ) : (
        categoryOrder.map(cat => {
          const catItems = grouped[cat];
          if (!catItems || catItems.length === 0) return null;
          return (
            <div key={cat} className="inv-section">
              <h3>{CATEGORY_LABELS[cat] || cat} ({catItems.length})</h3>
              <div className="inv-item-grid">
                {catItems.map(it => (
                  <div key={it.itemId}
                    className={`inv-item-card rarity-glow-${it.rarity}`}
                    onClick={() => setSelected(it)}>
                    <div className="inv-item-icon-wrap">
                      {it.image
                        ? <img src={it.image} alt={it.name} className="inv-item-img" />
                        : <span className="inv-item-icon" dangerouslySetInnerHTML={{ __html: it.icon || '&#10067;' }} />
                      }
                    </div>
                    {it.quantity > 1 && <span className="inv-item-qty">{it.quantity}</span>}
                    <span className={`inv-item-rarity-dot ${it.rarity === 'CR' ? 'rarity-dot-CR' : ''}`} style={it.rarity !== 'CR' ? { background: RARITY_COLORS[it.rarity] || '#aaa' } : undefined} />
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      {selected && (
        <div className="inv-modal-overlay" onClick={() => setSelected(null)}>
          <div className="inv-modal" onClick={e => e.stopPropagation()}>
            <button className="inv-modal-close" onClick={() => setSelected(null)} dangerouslySetInnerHTML={{ __html: '&#10005;' }} />
            <div className="inv-modal-icon-area">
              {selected.image
                ? <img src={selected.image} alt={selected.name} className="inv-modal-img" />
                : <span className="inv-modal-icon" dangerouslySetInnerHTML={{ __html: selected.icon || '&#10067;' }} />
              }
            </div>
            <div className="inv-modal-info">
              <span className={`inv-modal-rarity ${selected.rarity === 'CR' ? 'rarity-CR' : ''}`} style={selected.rarity !== 'CR' ? { color: RARITY_COLORS[selected.rarity] || '#aaa' } : undefined}>{selected.rarity}</span>
              <h3 className="inv-modal-name">{selected.name}</h3>
              <span className="inv-modal-cat">{CATEGORY_LABELS[selected.category] || selected.category}</span>
            </div>
            {selected.description && <p className="inv-modal-desc">{selected.description}</p>}
            <div className="inv-modal-footer">
              <span className="inv-modal-qty">보유: {selected.quantity}개</span>
              {selected.sellPrice > 0 && (
                <span className="inv-modal-sell" dangerouslySetInnerHTML={{ __html: `판매가: ${currencyImg('bit')} ${selected.sellPrice}` }} />
              )}
            </div>
            {selected.effect?.type === 'stamina' && (
              (user.stamina || 0) >= gameConfig.stamina.max
                ? <div className="inv-modal-use-blocked">스태미나가 최대치 이상입니다</div>
                : <button className="inv-modal-use-btn" onClick={() => useStaminaItem(selected.itemId)} disabled={using}>
                    {using ? '사용 중...' : '사용하기'}
                  </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
