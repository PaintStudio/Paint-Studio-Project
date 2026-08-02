import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import TradePage from './TradePage';
import RankingPage from './RankingPage';
import CurrencyIcon, { currencyImg } from '../components/CurrencyIcon';
import { timeAgo } from '../utils/gameConstants';
import './SocialPage.css';

// ========== 우편함 ==========
function MailBox({ addToast, onRefreshUser }) {
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
    <div className="mailbox">
      <div className="mailbox-header">
        <h3>우편함</h3>
        <div className="mailbox-actions">
          <button className="btn-claim-all" onClick={claimAll}>일괄 수령</button>
          <button className="btn-cleanup" onClick={cleanup}>읽은 우편 정리</button>
        </div>
      </div>
      {mails.length === 0 && <p className="empty-msg">우편이 없습니다</p>}
      <div className="mail-list">
        {mails.map(m => (
          <div key={m.id} className={`mail-item ${m.is_read ? 'read' : 'unread'} ${selected === m.id ? 'open' : ''}`}>
            <div className="mail-row" onClick={() => markRead(m)}>
              {!m.is_read && <span className="mail-dot" />}
              <div className="mail-info">
                <span className="mail-title">{m.title}</span>
                <span className="mail-sender">{m.senderName} · {timeAgo(m.created_at)}</span>
              </div>
              {m.rewards && !m.is_claimed && <span className="mail-gift">🎁</span>}
              {m.is_claimed && <span className="mail-claimed">수령됨</span>}
            </div>
            {selected === m.id && (
              <div className="mail-detail">
                {m.body && <p className="mail-body">{m.body}</p>}
                {m.rewards && (
                  <div className="mail-rewards">
                    {m.rewards.currency && <span><CurrencyIcon type="prism" /> {m.rewards.currency}</span>}
                    {m.rewards.gold && <span><CurrencyIcon type="bit" /> {m.rewards.gold}</span>}
                    {m.rewards.items && m.rewards.items.map((it, i) => (
                      <span key={i}>{it.name || it.itemId} x{it.count}</span>
                    ))}
                  </div>
                )}
                {m.rewards && !m.is_claimed && (
                  <button className="btn-claim-mail" onClick={() => claim(m.id)}>수령</button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ========== 피드 ==========
function Feed() {
  const [feed, setFeed] = useState([]);
  useEffect(() => { api.feed().then(d => setFeed(d.feed)); }, []);

  return (
    <div className="feed-inline">
      <h3>뽑기 피드</h3>
      <div className="feed-list-compact">
        {feed.map(item => (
          <div key={item.id} className="feed-row">
            <span className="feed-user-sm">{item.display_name}</span>
            <span className={`feed-rarity rarity-${item.rarity}`}>[{item.rarity}] {item.char_name}</span>
            <span className="feed-time-sm">{timeAgo(item.pulled_at)}</span>
          </div>
        ))}
        {feed.length === 0 && <p className="empty-msg">아직 기록 없음</p>}
      </div>
    </div>
  );
}

// ========== 메인 ==========
const TABS = [
  { key: 'mail', label: '우편함', icon: '📬' },
  { key: 'trade', label: '교환', icon: '🔄' },
  { key: 'feed', label: '피드', icon: '📰' },
  { key: 'ranking', label: '랭킹', icon: '🏆' },
];

export default function SocialPage({ user, addToast, onRefresh }) {
  const [tab, setTab] = useState('mail');
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    api.mailUnreadCount().then(d => setUnread(d.count)).catch(() => {});
  }, [tab]);

  return (
    <div className="social-page">
      <div className="social-tabs">
        {TABS.map(t => (
          <button key={t.key}
            className={`social-tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}>
            <span className="social-tab-icon">{t.icon}</span>
            <span>{t.label}</span>
            {t.key === 'mail' && unread > 0 && <span className="tab-badge">{unread}</span>}
          </button>
        ))}
      </div>
      <div className="social-content">
        {tab === 'mail' && <MailBox addToast={addToast} onRefreshUser={onRefresh} />}
        {tab === 'trade' && <TradePage user={user} addToast={addToast} />}
        {tab === 'feed' && <Feed />}
        {tab === 'ranking' && <RankingPage currentUserId={user?.id} />}
      </div>
    </div>
  );
}
