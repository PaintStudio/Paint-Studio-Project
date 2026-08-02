import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { getSocket } from '../utils/socket';
import './MobileChat.css';

const MobileChat = forwardRef(function MobileChat({ user, onUnreadChange }, ref) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [onlineCount, setOnlineCount] = useState(0);
  const [userProfiles, setUserProfiles] = useState({});
  const [unread, setUnread] = useState(0);
  const [dragY, setDragY] = useState(0);
  const listRef = useRef(null);
  const openRef = useRef(false);
  const touchStartY = useRef(0);
  const dragRef = useRef(0);
  const onUnreadRef = useRef(onUnreadChange);
  onUnreadRef.current = onUnreadChange;

  const onHandleTouchStart = useCallback((e) => {
    touchStartY.current = e.touches[0].clientY;
    dragRef.current = 0;
  }, []);

  const onHandleTouchMove = useCallback((e) => {
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy > 0) {
      dragRef.current = dy;
      setDragY(dy);
    }
  }, []);

  const onHandleTouchEnd = useCallback(() => {
    if (dragRef.current > 80) {
      setOpen(false);
    }
    setDragY(0);
    dragRef.current = 0;
  }, []);

  useEffect(() => { openRef.current = open; }, [open]);
  useEffect(() => { onUnreadRef.current?.(unread); }, [unread]);

  useImperativeHandle(ref, () => ({
    toggle() {
      setOpen(prev => {
        if (!prev) setUnread(0);
        return !prev;
      });
    },
  }), []);

  useEffect(() => {
    const onHistory = (history) => {
      setMessages(history);
      const profiles = {};
      for (const m of history) {
        if (m.profileIcon !== undefined) profiles[m.userId] = { profileIcon: m.profileIcon, username: m.username };
      }
      setUserProfiles(prev => ({ ...prev, ...profiles }));
    };
    const onMsg = (msg) => {
      setMessages(prev => {
        const next = [...prev, msg];
        return next.length > 100 ? next.slice(-100) : next;
      });
      if (msg.profileIcon !== undefined) {
        setUserProfiles(prev => ({ ...prev, [msg.userId]: { profileIcon: msg.profileIcon, username: msg.username } }));
      }
      if (!openRef.current && msg.userId !== user?.id) {
        setUnread(prev => prev + 1);
      }
    };
    const onOnline = (users) => setOnlineCount(users.length);
    const onProfileChanged = (data) => {
      setUserProfiles(prev => ({ ...prev, [data.userId]: { profileIcon: data.profileIcon, username: data.username } }));
    };

    const setup = (sock) => {
      sock.on('chat_history', onHistory);
      sock.on('chat_message', onMsg);
      sock.on('online_users', onOnline);
      sock.on('user_profile_changed', onProfileChanged);
      sock.emit('request_chat_history');
    };
    const cleanup = (sock) => {
      sock.off('chat_history', onHistory);
      sock.off('chat_message', onMsg);
      sock.off('online_users', onOnline);
      sock.off('user_profile_changed', onProfileChanged);
    };

    let sock = getSocket();
    if (sock) { setup(sock); return () => cleanup(sock); }

    const interval = setInterval(() => {
      sock = getSocket();
      if (sock) { clearInterval(interval); setup(sock); }
    }, 200);
    return () => {
      clearInterval(interval);
      sock = getSocket();
      if (sock) cleanup(sock);
    };
  }, []);

  useEffect(() => {
    if (open && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  const send = () => {
    const text = input.trim();
    const socket = getSocket();
    if (!text || !socket) return;
    socket.emit('chat_message', { text });
    setInput('');
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    return (h < 12 ? '오전 ' : '오후 ') + (h % 12 || 12) + ':' + m;
  };

  if (!open) return null;

  return (
    <div className="mchat-panel" style={dragY > 0 ? { transform: 'translateY(' + dragY + 'px)', transition: 'none' } : undefined}>
      <div className="mchat-drag-handle"
        onTouchStart={onHandleTouchStart}
        onTouchMove={onHandleTouchMove}
        onTouchEnd={onHandleTouchEnd}
      >
        <div className="mchat-drag-bar" />
      </div>
      <div className="mchat-header">
        <span dangerouslySetInnerHTML={{ __html: '&#128172; 채팅' }} />
        <span className="mchat-online">{onlineCount}{'명 접속'}</span>
      </div>
      <div className="mchat-messages" ref={listRef}>
        {messages.map((m, i) => {
          const isMine = m.userId === user?.id;
          const profile = userProfiles[m.userId];
          const icon = profile?.profileIcon ?? m.profileIcon;
          const name = profile?.username ?? m.username;
          return (
            <div key={i} className={`mchat-msg ${isMine ? 'mchat-mine' : ''}`}>
              <div className="mchat-avatar-wrap">
                {icon
                  ? <img src={icon} alt="" className="mchat-avatar" />
                  : <div className="mchat-avatar mchat-avatar-default">{(name || '?')[0]}</div>
                }
              </div>
              <div className="mchat-body">
                <div className="mchat-meta">
                  <span className="mchat-name">{name}</span>
                  <span className="mchat-time">{formatTime(m.timestamp)}</span>
                </div>
                <span className="mchat-text">{m.text}</span>
              </div>
            </div>
          );
        })}
        {messages.length === 0 && <p className="mchat-empty">{'아직 대화가 없어요'}</p>}
      </div>
      <div className="mchat-input-area">
        <input className="mchat-input" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey} placeholder="메시지 입력..." maxLength={200} />
        <button className="mchat-send" onClick={send} disabled={!input.trim()}>{'전송'}</button>
        </div>
    </div>
  );
});

export default MobileChat;
