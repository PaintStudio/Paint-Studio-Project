import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { getSocket } from '../utils/socket';
import CharacterCard from '../components/CharacterCard';
import './TradePage.css';

export default function TradePage({ user, addToast }) {
  const [tab, setTab] = useState('list'); // list, new
  const [trades, setTrades] = useState([]);
  const [users, setUsers] = useState([]);
  const [myItems, setMyItems] = useState([]);
  const [targetUser, setTargetUser] = useState(null);
  const [targetItems, setTargetItems] = useState([]);
  const [offerItem, setOfferItem] = useState(null);
  const [wantItem, setWantItem] = useState(null);

  useEffect(() => { loadTrades(); }, []);

  const loadTrades = async () => {
    const d = await api.myTrades();
    setTrades(d.trades);
  };

  const startNewTrade = async () => {
    setTab('new');
    const [u, c] = await Promise.all([api.users(), api.myCollection()]);
    setUsers(u.users);
    setMyItems(c.items);
  };

  const selectTarget = async (u) => {
    setTargetUser(u);
    const d = await api.userCollection(u.id);
    setTargetItems(d.items);
  };

  const submitTrade = async () => {
    if (!offerItem || !wantItem) return;
    try {
      await api.offerTrade(targetUser.id, offerItem.inventory_id, wantItem.inventory_id);
      getSocket()?.emit('trade_offer', { toUserId: targetUser.id });
      addToast('교환 신청 완료!', 'trade');
      setTab('list');
      setOfferItem(null); setWantItem(null); setTargetUser(null);
      loadTrades();
    } catch (err) { addToast(err.message, 'error'); }
  };

  const handleAccept = async (id) => {
    await api.acceptTrade(id);
    addToast('교환 수락!', 'trade');
    loadTrades();
  };

  const handleReject = async (id) => {
    await api.rejectTrade(id);
    loadTrades();
  };

  const handleCancel = async (id) => {
    await api.cancelTrade(id);
    loadTrades();
  };

  if (tab === 'new') {
    return (
      <div className="trade-page">
        <div className="trade-header">
          <button className="btn-back" onClick={() => setTab('list')}>← 뒤로</button>
          <h2>새 교환</h2>
        </div>

        {!targetUser ? (
          <div className="trade-section">
            <h3>교환 상대 선택</h3>
            <div className="user-list">
              {users.map(u => (
                <button key={u.id} className="user-item" onClick={() => selectTarget(u)}>
                  <span className="user-avatar">{u.display_name[0]}</span>
                  <span>{u.display_name}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <p className="trade-target">교환 상대: <strong>{targetUser.display_name}</strong></p>

            <div className="trade-section">
              <h3>내가 줄 캐릭터</h3>
              <div className="trade-item-grid">
                {myItems.map(item => (
                  <div key={item.inventory_id}
                    className={`trade-item-select ${offerItem?.inventory_id === item.inventory_id ? 'selected' : ''}`}
                    onClick={() => setOfferItem(item)}>
                    <CharacterCard character={item} rarity={item.rarity} compact />
                  </div>
                ))}
              </div>
            </div>

            <div className="trade-section">
              <h3>상대에게 받을 캐릭터</h3>
              <div className="trade-item-grid">
                {targetItems.map(item => (
                  <div key={item.inventory_id}
                    className={`trade-item-select ${wantItem?.inventory_id === item.inventory_id ? 'selected' : ''}`}
                    onClick={() => setWantItem(item)}>
                    <CharacterCard character={item} rarity={item.rarity} compact />
                  </div>
                ))}
              </div>
            </div>

            {offerItem && wantItem && (
              <div className="trade-confirm">
                <div className="trade-preview">
                  <span className={`rarity-${offerItem.rarity}`}>{offerItem.name}</span>
                  <span>⇄</span>
                  <span className={`rarity-${wantItem.rarity}`}>{wantItem.name}</span>
                </div>
                <button className="btn-primary" onClick={submitTrade}>교환 신청</button>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  const pending = trades.filter(t => t.status === 'pending');
  const history = trades.filter(t => t.status !== 'pending');

  return (
    <div className="trade-page">
      <div className="trade-header">
        <h2>교환</h2>
        <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={startNewTrade}>
          + 새 교환
        </button>
      </div>

      {pending.length > 0 && (
        <div className="trade-section">
          <h3>진행 중 ({pending.length})</h3>
          {pending.map(t => (
            <div key={t.id} className="trade-card">
              <div className="trade-info">
                <span>{t.from_name}</span>
                <span className={`rarity-${t.offer_rarity} trade-char-name`}>
                  {t.offer_image_url && <img src={t.offer_image_url} alt="" className="trade-char-img" />}
                  {t.offer_char_name} ({t.offer_rarity})
                </span>
                <span>⇄</span>
                <span className={`rarity-${t.want_rarity} trade-char-name`}>
                  {t.want_image_url && <img src={t.want_image_url} alt="" className="trade-char-img" />}
                  {t.want_char_name} ({t.want_rarity})
                </span>
                <span>{t.to_name}</span>
              </div>
              <div className="trade-actions">
                {t.to_user_id === user.id ? (
                  <>
                    <button className="btn-accept" onClick={() => handleAccept(t.id)}>수락</button>
                    <button className="btn-reject" onClick={() => handleReject(t.id)}>거절</button>
                  </>
                ) : (
                  <button className="btn-cancel" onClick={() => handleCancel(t.id)}>취소</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <div className="trade-section">
          <h3>교환 기록</h3>
          {history.slice(0, 20).map(t => (
            <div key={t.id} className="trade-card history">
              <div className="trade-info">
                <span>{t.from_name}</span>
                <span className={`rarity-${t.offer_rarity} trade-char-name`}>
                  {t.offer_image_url && <img src={t.offer_image_url} alt="" className="trade-char-img" />}
                  {t.offer_char_name}
                </span>
                <span>⇄</span>
                <span className={`rarity-${t.want_rarity} trade-char-name`}>
                  {t.want_image_url && <img src={t.want_image_url} alt="" className="trade-char-img" />}
                  {t.want_char_name}
                </span>
                <span>{t.to_name}</span>
              </div>
              <span className={`trade-status status-${t.status}`}>{t.status === 'accepted' ? '완료' : t.status === 'rejected' ? '거절' : '취소'}</span>
            </div>
          ))}
        </div>
      )}

      {trades.length === 0 && <p className="empty-msg">아직 교환 기록이 없습니다</p>}
    </div>
  );
}
