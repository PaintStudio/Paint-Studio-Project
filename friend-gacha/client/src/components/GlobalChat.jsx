import React, { useState, useEffect, useRef } from 'react';
import { getSocket } from '../utils/socket';
import './GlobalChat.css';

export default function GlobalChat({ user }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [onlineCount, setOnlineCount] = useState(0);
  const [userProfiles, setUserProfiles] = useState({});
  const listRef = useRef(null);

  useEffect(() => {
    const onHistory = (history) => {
      setMessages(history);
      const profiles = {};
      for (const m of history) {
        if (m.profileIcon !== undefined) {
          profiles[m.userId] = { profileIcon: m.profileIcon, username: m.username };
        }
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
    if (sock) {
      setup(sock);
      return () => cleanup(sock);
    }

    const interval = setInterval(() => {
      sock = getSocket();
      if (sock) {
        clearInterval(interval);
        setup(sock);
      }
    }, 200);

    return () => {
      clearInterval(interval);
      sock = getSocket();
      if (sock) cleanup(sock);
    };
  }, []);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const send = () => {
    const text = input.trim();
    const socket = getSocket();
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

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    return (h < 12 ? '오전 ' : '오후 ') + (h % 12 || 12) + ':' + m;
  };

  return (
    <div className="global-chat">
      <div className="chat-panel">
        <div className="chat-header">
          <span>&#128172; &#52292;&#54021;</span>
          <span className="chat-online">{onlineCount}&#47749; &#51217;&#49549;</span>
        </div>
        <div className="chat-messages" ref={listRef}>
          {messages.map((m, i) => {
            const isMine = m.userId === user?.id;
            const profile = userProfiles[m.userId];
            const icon = profile?.profileIcon ?? m.profileIcon;
            const name = profile?.username ?? m.username;
            return (
              <div key={i} className={`chat-msg ${isMine ? 'mine' : ''}`}>
                <div className="chat-avatar-wrap">
                  {icon
                    ? <img src={icon} alt="" className="chat-avatar" />
                    : <div className="chat-avatar chat-avatar-default">{(name || '?')[0]}</div>
                  }
                </div>
                <div className="chat-body">
                  <div className="chat-meta">
                    <span className="chat-name">{name}</span>
                    <span className="chat-time">{formatTime(m.timestamp)}</span>
                  </div>
                  <span className="chat-text">{m.text}</span>
                </div>
              </div>
            );
          })}
          {messages.length === 0 && <p className="chat-empty">&#50500;&#51649; &#45824;&#54868;&#44032; &#50630;&#50612;&#50836;</p>}
        </div>
        <div className="chat-input-area">
          <input className="chat-input" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey} placeholder="&#47700;&#49884;&#51648; &#51077;&#47141;..." maxLength={200} />
          <button className="chat-send" onClick={send} disabled={!input.trim()}>&#51204;&#49569;</button>
        </div>
      </div>
    </div>
  );
}
