import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../utils/api';
import { getSocket } from '../utils/socket';
import TradePage from './TradePage';
import RankingPage from './RankingPage';
import './SocialPage.css';

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr + (dateStr.includes('Z') ? '' : 'Z')).getTime()) / 1000;
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

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
      if (r.rewards?.currency) parts.push(`💎 ${r.rewards.currency}`);
      if (r.rewards?.gold) parts.push(`🪙 ${r.rewards.gold}`);
      addToast('보상 수령! ' + parts.join(' '), 'trade');
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
        <button className="btn-cleanup" onClick={cleanup}>읽은 우편 정리</button>
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
                    {m.rewards.currency && <span>💎 {m.rewards.currency}</span>}
                    {m.rewards.gold && <span>🪙 {m.rewards.gold}</span>}
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

// ========== 채팅 ==========
function ChatPanel({ user }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [onlineCount, setOnlineCount] = useState(0);
  const listRef = useRef(null);
  const socket = getSocket();

  useEffect(() => {
    if (!socket) return;

    const onMsg = (msg) => {
      setMessages(prev => {
        const next = [...prev, msg];
        return next.length > 100 ? next.slice(-100) : next;
      });
    };
    const onOnline = (users) => setOnlineCount(users.length);

    socket.on('chat_message', onMsg);
    socket.on('online_users', onOnline);

    return () => {
      socket.off('chat_message', onMsg);
      socket.off('online_users', onOnline);
    };
  }, [socket]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const send = () => {
    const text = input.trim();
    if (!text || !socket) return;
    socket.emit('chat_message', { text });
    setInput('');
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <span>채팅</span>
        <span className="chat-online">{onlineCount}명 접속</span>
      </div>
      <div className="chat-messages" ref={listRef}>
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.userId === user?.id ? 'mine' : ''}`}>
            <div className="chat-name-row">
              {m.profileIcon && <img src={m.profileIcon} alt="" className="chat-avatar" />}
              <span className="chat-name">{m.username}</span>
            </div>
            <span className="chat-text">{m.text}</span>
          </div>
        ))}
        {messages.length === 0 && <p className="chat-empty">아직 대화가 없어요</p>}
      </div>
      <div className="chat-input-area">
        <input className="chat-input" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey} placeholder="메시지 입력..." maxLength={200} />
        <button className="chat-send" onClick={send} disabled={!input.trim()}>전송</button>
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
      <div className="social-left">
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
      <div className="social-right">
        <ChatPanel user={user} />
      </div>
    </div>
  );
}
