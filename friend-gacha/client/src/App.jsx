import React, { useState, useEffect } from 'react';
import { api, setToken, clearToken } from './utils/api';
import { connectSocket, disconnectSocket, getSocket } from './utils/socket';
import { addToast } from './utils/toast';
import LoginPage from './pages/LoginPage';
import LobbyPage from './pages/LobbyPage';
import GachaPage from './pages/GachaPage';
import CollectionPage from './pages/CollectionPage';
import SocialPage from './pages/SocialPage';
import StagePage from './pages/StagePage';
import RaidPage from './pages/RaidPage';
import GrowthPage from './pages/GrowthPage';
import InventoryPage from './pages/InventoryPage';
import AdminPage from './pages/AdminPage';
import ToastContainer from './components/Toast';
import './styles/app.css';

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('lobby');
  const [subPage, setSubPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [missions, setMissions] = useState([]);

  const refreshUser = async () => {
    try { const u = await api.userStatus(); setUser(u); } catch {}
  };

  const loadMissions = async () => {
    try { const d = await api.missions(); setMissions(d.missions); } catch {}
  };

  useEffect(() => {
    const token = localStorage.getItem('gacha_token');
    if (token) {
      api.me().then(async (u) => {
        setUser(u);
        setupSocket(token);
        try {
          const checkin = await api.checkin();
          if (!checkin.alreadyCheckedIn) {
            addToast('출석 완료! ' + checkin.streak + '일 연속', 'sr');
          }
        } catch {}
        await refreshUser();
        loadMissions();
      }).catch(() => clearToken()).finally(() => setLoading(false));
    } else { setLoading(false); }
  }, []);

  const setupSocket = (token) => {
    const sock = connectSocket(token);
    sock.on('someone_pulled', (data) => {
      if (data.rarity === 'SSR' || data.rarity === 'SR' || data.rarity === 'CR') {
        addToast(data.username + ' [' + data.rarity + '] ' + data.characterName, data.rarity === 'SSR' || data.rarity === 'CR' ? 'ssr' : 'sr');
      }
    });
    sock.on('trade_incoming', (data) => {
      addToast(data.fromUsername + ' 교환 신청!', 'trade');
    });
  };

  const handleLogin = async (userData, token) => {
    setToken(token);
    setUser(userData);
    setupSocket(token);
    try {
      const checkin = await api.checkin();
      if (!checkin.alreadyCheckedIn) {
        addToast('출석 완료! ' + checkin.streak + '일 연속', 'sr');
      }
    } catch {}
    refreshUser();
    loadMissions();
  };

  const handleLogout = () => {
    clearToken(); disconnectSocket(); setUser(null); setPage('lobby');
  };

  const navigate = (p, sub = null) => {
    setPage(p);
    setSubPage(sub);
  };

  const claimMission = async (id) => {
    try {
      await api.claimMission(id);
      addToast('보상 수령!', 'trade');
      loadMissions(); refreshUser();
    } catch (err) { addToast(err.message, 'error'); }
  };

  if (loading) return <div className="loading-screen">로딩 중...</div>;
  if (!user) return <LoginPage onLogin={handleLogin} />;

  // 하단 탭 정의
  const tabs = [
    { key: 'lobby', label: '로비', icon: '🏠' },
    { key: 'character', label: '캐릭터', icon: '👤' },
    { key: 'inventory', label: '보관함', icon: '🎒' },
    { key: 'battle', label: '배틀', icon: '⚔️' },
    { key: 'gacha', label: '뽑기', icon: '🎰' },
    { key: 'social', label: '소셜', icon: '💬' },
  ];

  const isLobby = page === 'lobby';

  return (
    <div className="app">
      <main className={`main-content ${isLobby ? 'main-lobby' : ''}`}>
        {page === 'lobby' && (
          <LobbyPage
            user={user}
            navigate={navigate}
            addToast={addToast}
            onLogout={handleLogout}
            missions={missions}
            onClaimMission={claimMission}
            onRefresh={() => { refreshUser(); loadMissions(); }}
          />
        )}
        {page === 'character' && (
          subPage === 'collection'
            ? <CollectionPage user={user} />
            : <GrowthPage user={user} onRefresh={refreshUser} addToast={addToast} />
        )}
        {page === 'battle' && (
          subPage === 'raid'
            ? <RaidPage user={user} onRefresh={refreshUser} addToast={addToast} />
            : <StagePage user={user} onRefresh={refreshUser} addToast={addToast} />
        )}
        {page === 'gacha' && <GachaPage user={user} onPull={() => { refreshUser(); loadMissions(); }} addToast={addToast} />}
        {page === 'inventory' && <InventoryPage user={user} />}
        {page === 'social' && <SocialPage user={user} addToast={addToast} onRefresh={refreshUser} />}
        {page === 'admin' && <AdminPage />}
      </main>

      {/* 서브탭 (캐릭터/배틀/소셜) */}
      {page === 'character' && (
        <div className="sub-tabs">
          <button className={`sub-tab ${subPage !== 'collection' ? 'active' : ''}`} onClick={() => setSubPage(null)}>육성</button>
          <button className={`sub-tab ${subPage === 'collection' ? 'active' : ''}`} onClick={() => setSubPage('collection')}>도감</button>
        </div>
      )}
      {page === 'battle' && (
        <div className="sub-tabs">
          <button className={`sub-tab ${subPage !== 'raid' ? 'active' : ''}`} onClick={() => setSubPage(null)}>스테이지</button>
          <button className={`sub-tab ${subPage === 'raid' ? 'active' : ''}`} onClick={() => setSubPage('raid')}>레이드</button>
        </div>
      )}

      {/* 하단 탭바 */}
      <nav className="tab-bar">
        {tabs.map(tab => (
          <button key={tab.key}
            className={'tab-item' + (page === tab.key ? ' active' : '')}
            onClick={() => navigate(tab.key)}>
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </nav>

      <ToastContainer />
    </div>
  );
}
