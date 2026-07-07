import React, { useState, useEffect, useRef } from 'react';
import { api, setToken, clearToken } from './utils/api';
import { connectSocket, disconnectSocket, getSocket } from './utils/socket';
import { addToast } from './utils/toast';
import LoginPage from './pages/LoginPage';
import LobbyPage from './pages/LobbyPage';
import GachaPage from './pages/GachaPage';
import CollectionPage from './pages/CollectionPage';
import PartyPage from './pages/PartyPage';
import SocialPage from './pages/SocialPage';
import BattleHub from './pages/BattleHub';
import StoryPage from './pages/StoryPage';
import GrowthPage from './pages/GrowthPage';
import InventoryPage from './pages/InventoryPage';
import AdminPage from './pages/AdminPage';
import TutorialPage from './pages/TutorialPage';
import TutorialGuide from './components/TutorialGuide';
import ToastContainer from './components/Toast';
import './styles/app.css';

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('lobby');
  const [subPage, setSubPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [missions, setMissions] = useState([]);
  const tutorialRef = useRef(null);

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

  const completeTutorial = async () => {
    try {
      await api.tutorialDone();
      await api.tutorialAdvance(1);
    } catch {}
    setUser(prev => ({ ...prev, tutorialDone: true, tutorialStep: 1 }));
  };

  if (loading) return <div className="loading-screen">로딩 중...</div>;
  if (!user) return <LoginPage onLogin={handleLogin} />;
  if (!user.tutorialDone) return <TutorialPage onComplete={completeTutorial} />;

  // 하단 탭 정의
  const tabs = [
    { key: 'lobby', label: '로비', icon: '🏠' },
    { key: 'story', label: '스토리', icon: '📖' },
    { key: 'character', label: '캐릭터', icon: '👤' },
    { key: 'inventory', label: '보관함', icon: '🎒' },
    { key: 'battle', label: '작전', icon: '⚔️' },
    { key: 'gacha', label: '뽑기', icon: '🎰' },
    { key: 'social', label: '소셜', icon: '💬' },
  ];

  const isLobby = page === 'lobby';

  return (
    <div className="app">
      {page === 'character' && (
        <div className="sub-tabs">
          <button className={`sub-tab ${!subPage ? 'active' : ''}`} onClick={() => setSubPage(null)}>육성</button>
          <button className={`sub-tab ${subPage === 'party' ? 'active' : ''}`} onClick={() => setSubPage('party')}>편성</button>
          <button className={`sub-tab ${subPage === 'collection' ? 'active' : ''}`} onClick={() => setSubPage('collection')}>도감</button>
        </div>
      )}

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
            : subPage === 'party'
            ? <PartyPage addToast={addToast} />
            : <GrowthPage user={user} onRefresh={refreshUser} addToast={addToast} />
        )}
        {page === 'story' && <StoryPage user={user} onRefresh={refreshUser} addToast={addToast} />}
        {page === 'battle' && <BattleHub user={user} onRefresh={refreshUser} addToast={addToast} />}
        {page === 'gacha' && <GachaPage user={user} onPull={() => { refreshUser(); loadMissions(); tutorialRef.current?.completeAction('gacha_pull'); }} addToast={addToast} />}
        {page === 'inventory' && <InventoryPage user={user} onRefresh={refreshUser} addToast={addToast} />}
        {page === 'social' && <SocialPage user={user} addToast={addToast} onRefresh={refreshUser} />}
        {page === 'admin' && <AdminPage />}
      </main>

      {/* 하단 탭바 */}
      <nav className="tab-bar">
        {tabs.map(tab => {
          const blocked = tutorialRef.current?.isTabBlocked(tab.key);
          return (
            <button key={tab.key}
              data-tab={tab.key}
              className={'tab-item' + (page === tab.key ? ' active' : '') + (blocked ? ' tab-blocked' : '')}
              onClick={() => {
                if (blocked) return;
                const handled = tutorialRef.current?.completeAction('tab_click');
                if (!handled) navigate(tab.key);
              }}>
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <TutorialGuide
        ref={tutorialRef}
        user={user}
        currentPage={page}
        onNavigate={navigate}
        onUserUpdate={setUser}
      />

      <ToastContainer />
    </div>
  );
}
