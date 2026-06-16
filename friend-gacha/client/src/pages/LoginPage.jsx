import React, { useState } from 'react';
import { api } from '../utils/api';
import './LoginPage.css';

export default function LoginPage({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = isRegister
        ? await api.register(username, password, displayName)
        : await api.login(username, password);
      onLogin(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-hero">
        <h1 className="login-title">대충 공포의 세계관묶음가챠겜</h1>
        <p className="login-subtitle">만들고 싶은 대로 만든다</p>
      </div>

      <form className="login-form" onSubmit={handleSubmit}>
        <input
          type="text" placeholder="아이디" value={username}
          onChange={e => setUsername(e.target.value)} required autoFocus
        />
        <input
          type="password" placeholder="비밀번호" value={password}
          onChange={e => setPassword(e.target.value)} required
        />
        {isRegister && (
          <input
            type="text" placeholder="닉네임 (표시 이름)" value={displayName}
            onChange={e => setDisplayName(e.target.value)}
          />
        )}

        {error && <p className="login-error">{error}</p>}

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? '...' : isRegister ? '가입하기' : '로그인'}
        </button>

        <button type="button" className="btn-switch" onClick={() => { setIsRegister(!isRegister); setError(''); }}>
          {isRegister ? '이미 계정이 있다면 → 로그인' : '처음이라면 → 회원가입'}
        </button>
      </form>
    </div>
  );
}
