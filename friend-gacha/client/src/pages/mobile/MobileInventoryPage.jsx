import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import CurrencyIcon, { currencyImg } from '../../components/CurrencyIcon';
import LoadingOverlay from '../../components/LoadingOverlay';
import gameConfig from '@gameConfig';
import { RARITY_COLORS } from '../../utils/gameConstants';
import './MobileInventoryPage.css';
const CATEGORY_LABELS = {
  material: '소재', awakening: '각성 재료', boss: '보스 소재', consumable: '소모품',
};
const CATEGORY_ORDER = ['material', 'awakening', 'boss', 'consumable'];

export default function MobileInventoryPage({ user, onRefresh, addToast }) {
  const [items, setItems] = useState([]);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState(null);
  const [using, setUsing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.myItems();
        setItems(data.items || []);
      } catch {}
      setReady(true);
    })();
  }, []);

  const loadItems = async () => {
    try {
      const data = await api.myItems();
      setItems(data.items || []);
    } catch {}
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

  if (!ready) return <LoadingOverlay />;

  const grouped = {};
  for (const it of items) {
    const cat = it.category || 'material';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(it);
  }

  return (
    <div className="mi-page">
      <h2 className="mi-title">{'보관함'}</h2>

      <div className="mi-currency-row">
        <div className="mi-currency">
          <CurrencyIcon type="prism" size={22} />
          <div className="mi-currency-info">
            <span className="mi-currency-label">{'프리즘'}</span>
            <span className="mi-currency-val">{(user.currency || 0).toLocaleString()}</span>
          </div>
        </div>
        <div className="mi-currency">
          <CurrencyIcon type="bit" size={22} />
          <div className="mi-currency-info">
            <span className="mi-currency-label">{'비트'}</span>
            <span className="mi-currency-val">{(user.gold || 0).toLocaleString()}</span>
          </div>
        </div>
        <div className="mi-currency">
          <CurrencyIcon type="stamina" size={22} />
          <div className="mi-currency-info">
            <span className="mi-currency-label">{'스태미나'}</span>
            <span className="mi-currency-val">{user.stamina || 0}</span>
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="mi-empty">{'보유한 아이템이 없습니다.'}</p>
      ) : (
        CATEGORY_ORDER.map(cat => {
          const catItems = grouped[cat];
          if (!catItems || catItems.length === 0) return null;
          return (
            <div key={cat} className="mi-section">
              <h3 className="mi-section-title">{CATEGORY_LABELS[cat] || cat} ({catItems.length})</h3>
              <div className="mi-item-grid">
                {catItems.map(it => (
                  <div key={it.itemId}
                    className={`mi-item rarity-glow-${it.rarity}`}
                    onClick={() => setSelected(it)}>
                    <div className="mi-item-icon-wrap">
                      {it.image
                        ? <img src={it.image} alt={it.name} className="mi-item-img" />
                        : <span className="mi-item-icon" dangerouslySetInnerHTML={{ __html: it.icon || '&#10067;' }} />
                      }
                    </div>
                    {it.quantity > 1 && <span className="mi-item-qty">{it.quantity}</span>}
                    <span className={`mi-item-dot ${it.rarity === 'CR' ? 'mi-dot-cr' : ''}`}
                      style={it.rarity !== 'CR' ? { background: RARITY_COLORS[it.rarity] || '#aaa' } : undefined} />
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      {selected && (
        <div className="mi-modal-overlay" onClick={() => setSelected(null)}>
          <div className="mi-modal" onClick={e => e.stopPropagation()}>
            <button className="mi-modal-close" onClick={() => setSelected(null)} dangerouslySetInnerHTML={{ __html: '&#10005;' }} />
            <div className="mi-modal-icon-area">
              {selected.image
                ? <img src={selected.image} alt={selected.name} className="mi-modal-img" />
                : <span className="mi-modal-icon" dangerouslySetInnerHTML={{ __html: selected.icon || '&#10067;' }} />
              }
            </div>
            <div className="mi-modal-info">
              <span className={`mi-modal-rarity ${selected.rarity === 'CR' ? 'rarity-CR' : ''}`}
                style={selected.rarity !== 'CR' ? { color: RARITY_COLORS[selected.rarity] || '#aaa' } : undefined}>
                {selected.rarity}
              </span>
              <h3 className="mi-modal-name">{selected.name}</h3>
              <span className="mi-modal-cat">{CATEGORY_LABELS[selected.category] || selected.category}</span>
            </div>
            {selected.description && <p className="mi-modal-desc">{selected.description}</p>}
            {selected.flavor && <p className="mi-modal-flavor">{selected.flavor}</p>}
            <div className="mi-modal-footer">
              <span className="mi-modal-qty">{'보유:'} {selected.quantity}{'개'}</span>
            </div>
            {selected.effect?.type === 'stamina' && (
              (user.stamina || 0) >= gameConfig.stamina.max
                ? <div className="mi-modal-blocked">{'스태미나가 최대치 이상입니다'}</div>
                : <button className="mi-modal-use-btn" onClick={() => useStaminaItem(selected.itemId)} disabled={using}>
                    {using ? '사용 중...' : '사용하기'}
                  </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
