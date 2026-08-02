import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../utils/api';
import { getSocket } from '../../utils/socket';
import CurrencyIcon, { currencyImg } from '../../components/CurrencyIcon';
import CharacterCard from '../../components/CharacterCard';
import { timeAgo } from '../../utils/gameConstants';
import './MobileSocialPage.css';

function MobileMailBox({ addToast, onRefreshUser }) {
  const [mails, setMails] = useState([]);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    try { const d = await api.mailList(); setMails(d.mails); } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const claim = async (id) => {
    try {
      const r = await api.mailClaim(id);
      const parts = [];
      if (r.rewards?.currency) parts.push(`${currencyImg('prism')} ${r.rewards.currency}`);
      if (r.rewards?.gold) parts.push(`${currencyImg('bit')} ${r.rewards.gold}`);
      if (r.rewards?.items) r.rewards.items.forEach(it => parts.push(`${it.name || it.itemId} x${it.count}`));
      addToast('보상 수령! ' + parts.join(' '), 'trade');
      load();
      onRefreshUser();
    } catch (e) { addToast(e.message, 'error'); }
  };

  const claimAll = async () => {
    try {
      const r = await api.mailClaimAll();
      if (r.claimed === 0) return addToast('수령할 우편이 없습니다', 'error');
      const parts = [];
      if (r.totalRewards?.currency) parts.push(`${currencyImg('prism')} ${r.totalRewards.currency}`);
      if (r.totalRewards?.gold) parts.push(`${currencyImg('bit')} ${r.totalRewards.gold}`);
      addToast(`${r.claimed}건 일괄 수령! ${parts.join(' ')}`, 'trade');
      load();
      onRefreshUser();
    } catch (e) { addToast(e.message, 'error'); }
  };

  const cleanup = async () => {
    try {
      const r = await api.mailCleanup();
      addToast(`${r.deleted}건 정리 완료`, 'trade');
      load();
    } catch {}
  };

  const markRead = async (mail) => {
    if (!mail.is_read) {
      try { await api.mailRead(mail.id); } catch {}
    }
    setSelected(mail.id === selected ? null : mail.id);
  };

  return (
    <div className="mso-mail">
      <div className="mso-mail-actions">
        <button className="mso-btn-claim-all" onClick={claimAll}>일괄 수령</button>
        <button className="mso-btn-cleanup" onClick={cleanup}>정리</button>
      </div>
      {mails.length === 0 && <p className="mso-empty">우편이 없습니다</p>}
      <div className="mso-mail-list">
        {mails.map(m => (
          <div key={m.id} className={`mso-mail-item ${m.is_read ? 'read' : 'unread'} ${selected === m.id ? 'open' : ''}`}>
            <div className="mso-mail-row" onClick={() => markRead(m)}>
              {!m.is_read && <span className="mso-mail-dot" />}
              <div className="mso-mail-info">
                <span className="mso-mail-title">{m.title}</span>
                <span className="mso-mail-sender">{m.senderName} · {timeAgo(m.created_at)}</span>
              </div>
              {m.rewards && !m.is_claimed && <span className="mso-mail-gift">&#127873;</span>}
              {m.is_claimed && <span className="mso-mail-claimed">수령됨</span>}
            </div>
            {selected === m.id && (
              <div className="mso-mail-detail">
                {m.body && <p className="mso-mail-body">{m.body}</p>}
                {m.rewards && (
                  <div className="mso-mail-rewards">
                    {m.rewards.currency && <span><CurrencyIcon type="prism" /> {m.rewards.currency}</span>}
                    {m.rewards.gold && <span><CurrencyIcon type="bit" /> {m.rewards.gold}</span>}
                    {m.rewards.items && m.rewards.items.map((it, i) => (
                      <span key={i}>{it.name || it.itemId} x{it.count}</span>
                    ))}
                  </div>
                )}
                {m.rewards && !m.is_claimed && (
                  <button className="mso-btn-claim" onClick={() => claim(m.id)}>수령</button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MobileTrade({ user, addToast }) {
  const [tab, setTab] = useState('list');
  const [trades, setTrades] = useState([]);
  const [users, setUsers] = useState([]);
  const [myItems, setMyItems] = useState([]);
  const [targetUser, setTargetUser] = useState(null);
  const [targetItems, setTargetItems] = useState([]);
  const [offerItem, setOfferItem] = useState(null);
  const [wantItem, setWantItem] = useState(null);

  useEffect(() => { loadTrades(); }, []);

  const loadTrades = async () => {
    try { const d = await api.myTrades(); setTrades(d.trades); } catch {}
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
  const handleReject = async (id) => { await api.rejectTrade(id); loadTrades(); };
  const handleCancel = async (id) => { await api.cancelTrade(id); loadTrades(); };

  if (tab === 'new') {
    return (
      <div className="mso-trade">
        <button className="mso-back" onClick={() => setTab('list')}>&larr; 뒤로</button>
        {!targetUser ? (
          <div className="mso-trade-section">
            <h4>교환 상대 선택</h4>
            <div className="mso-user-list">
              {users.map(u => (
                <button key={u.id} className="mso-user-item" onClick={() => selectTarget(u)}>
                  <span className="mso-user-avatar">{u.display_name[0]}</span>
                  <span>{u.display_name}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <p className="mso-trade-target">상대: <strong>{targetUser.display_name}</strong></p>
            <div className="mso-trade-section">
              <h4>내가 줄 캐릭터</h4>
              <div className="mso-trade-grid">
                {myItems.map(item => (
                  <div key={item.inventory_id}
                    className={`mso-trade-select ${offerItem?.inventory_id === item.inventory_id ? 'selected' : ''}`}
                    onClick={() => setOfferItem(item)}>
                    <CharacterCard character={item} rarity={item.rarity} compact />
                  </div>
                ))}
              </div>
            </div>
            <div className="mso-trade-section">
              <h4>상대에게 받을 캐릭터</h4>
              <div className="mso-trade-grid">
                {targetItems.map(item => (
                  <div key={item.inventory_id}
                    className={`mso-trade-select ${wantItem?.inventory_id === item.inventory_id ? 'selected' : ''}`}
                    onClick={() => setWantItem(item)}>
                    <CharacterCard character={item} rarity={item.rarity} compact />
                  </div>
                ))}
              </div>
            </div>
            {offerItem && wantItem && (
              <div className="mso-trade-confirm">
                <div className="mso-trade-preview">
                  <span className={`rarity-${offerItem.rarity}`}>{offerItem.name}</span>
                  <span>&#8644;</span>
                  <span className={`rarity-${wantItem.rarity}`}>{wantItem.name}</span>
                </div>
                <button className="mso-btn-primary" onClick={submitTrade}>교환 신청</button>
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
    <div className="mso-trade">
      <button className="mso-btn-new-trade" onClick={startNewTrade}>+ 새 교환</button>
      {pending.length > 0 && (
        <div className="mso-trade-section">
          <h4>진행 중 ({pending.length})</h4>
          {pending.map(t => (
            <div key={t.id} className="mso-trade-card">
              <div className="mso-trade-info">
                <span className="mso-trade-from">{t.from_name}</span>
                <span className={`rarity-${t.offer_rarity} mso-trade-char`}>
                  {t.offer_image_url && <img src={t.offer_image_url} alt="" className="mso-trade-img" />}
                  {t.offer_char_name}
                </span>
                <span>&#8644;</span>
                <span className={`rarity-${t.want_rarity} mso-trade-char`}>
                  {t.want_image_url && <img src={t.want_image_url} alt="" className="mso-trade-img" />}
                  {t.want_char_name}
                </span>
                <span className="mso-trade-to">{t.to_name}</span>
              </div>
              <div className="mso-trade-actions">
                {t.to_user_id === user.id ? (
                  <>
                    <button className="mso-btn-accept" onClick={() => handleAccept(t.id)}>수락</button>
                    <button className="mso-btn-reject" onClick={() => handleReject(t.id)}>거절</button>
                  </>
                ) : (
                  <button className="mso-btn-cancel" onClick={() => handleCancel(t.id)}>취소</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {history.length > 0 && (
        <div className="mso-trade-section">
          <h4>기록</h4>
          {history.slice(0, 20).map(t => (
            <div key={t.id} className="mso-trade-card history">
              <div className="mso-trade-info">
                <span className="mso-trade-from">{t.from_name}</span>
                <span className={`rarity-${t.offer_rarity} mso-trade-char`}>{t.offer_char_name}</span>
                <span>&#8644;</span>
                <span className={`rarity-${t.want_rarity} mso-trade-char`}>{t.want_char_name}</span>
                <span className="mso-trade-to">{t.to_name}</span>
              </div>
              <span className={`mso-trade-status status-${t.status}`}>
                {t.status === 'accepted' ? '완료' : t.status === 'rejected' ? '거절' : '취소'}
              </span>
            </div>
          ))}
        </div>
      )}
      {trades.length === 0 && <p className="mso-empty">교환 기록이 없습니다</p>}
    </div>
  );
}

function MobileFeed() {
  const [feed, setFeed] = useState([]);
  useEffect(() => { api.feed().then(d => setFeed(d.feed)).catch(() => {}); }, []);

  return (
    <div className="mso-feed">
      {feed.map(item => (
        <div key={item.id} className="mso-feed-row">
          <span className="mso-feed-user">{item.display_name}</span>
          <span className={`mso-feed-rarity rarity-${item.rarity}`}>[{item.rarity}] {item.char_name}</span>
          <span className="mso-feed-time">{timeAgo(item.pulled_at)}</span>
        </div>
      ))}
      {feed.length === 0 && <p className="mso-empty">아직 기록 없음</p>}
    </div>
  );
}

function MobileRanking({ currentUserId }) {
  const [rankings, setRankings] = useState([]);
  useEffect(() => { api.rankings().then(d => setRankings(d.rankings)).catch(() => {}); }, []);

  return (
    <div className="mso-ranking">
      {rankings.map((r, i) => (
        <div key={r.id} className={`mso-rank-item ${r.id === currentUserId ? 'is-me' : ''}`}>
          <span className={`mso-rank-num ${i < 3 ? `top-${i + 1}` : ''}`}>
            {i === 0 ? '&#129351;' : i === 1 ? '&#129352;' : i === 2 ? '&#129353;' : `#${i + 1}`}
          </span>
          <div className="mso-rank-avatar">{r.display_name[0]}</div>
          <div className="mso-rank-info">
            <span className="mso-rank-name">{r.display_name}</span>
            <span className="mso-rank-stats">도감 {r.unique_count} · SSR {r.ssr_count} · {r.total_pulls}회</span>
          </div>
        </div>
      ))}
      {rankings.length === 0 && <p className="mso-empty">아직 데이터가 없습니다</p>}
    </div>
  );
}

const TABS = [
  { key: 'mail', label: '우편함', icon: '&#128236;' },
  { key: 'trade', label: '교환', icon: '&#128260;' },
  { key: 'feed', label: '피드', icon: '&#128240;' },
  { key: 'ranking', label: '랭킹', icon: '&#127942;' },
];

export default function MobileSocialPage({ user, addToast, onRefresh, navigate, initialTab }) {
  const [tab, setTab] = useState(initialTab || 'mail');
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    api.mailUnreadCount().then(d => setUnread(d.count)).catch(() => {});
  }, [tab]);

  return (
    <div className="mso-page">
      <div className="mso-top">
        <button className="mso-back" onClick={() => navigate('lobby')}>&larr;</button>
        <div className="mso-tabs">
          {TABS.map(t => (
            <button key={t.key}
              className={`mso-tab ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}>
              <span dangerouslySetInnerHTML={{ __html: t.icon }} />
              <span>{t.label}</span>
              {t.key === 'mail' && unread > 0 && <span className="mso-tab-badge">{unread}</span>}
            </button>
          ))}
        </div>
      </div>
      <div className="mso-content">
        {tab === 'mail' && <MobileMailBox addToast={addToast} onRefreshUser={onRefresh} />}
        {tab === 'trade' && <MobileTrade user={user} addToast={addToast} />}
        {tab === 'feed' && <MobileFeed />}
        {tab === 'ranking' && <MobileRanking currentUserId={user?.id} />}
      </div>
    </div>
  );
}
