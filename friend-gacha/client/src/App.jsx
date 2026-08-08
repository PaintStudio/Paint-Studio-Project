import React, { useState, useEffect, useRef } from 'react';
import { api, setToken, clearToken } from './utils/api';
import { connectSocket, disconnectSocket } from './utils/socket';
import { addToast } from './utils/toast';
import { bgm } from './utils/bgm';
import useIsMobile from './hooks/useIsMobile';
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
import GlobalChat from './components/GlobalChat';
import AttendanceModal from './components/AttendanceModal';
import LoadingOverlay, { setLoadingSdImages } from './components/LoadingOverlay';
import MobileLobbyPage from './pages/mobile/MobileLobbyPage';
import MobileGrowthPage from './pages/mobile/MobileGrowthPage';
import MobileCollectionPage from './pages/mobile/MobileCollectionPage';
import MobileInventoryPage from './pages/mobile/MobileInventoryPage';
import MobileGachaPage from './pages/mobile/MobileGachaPage';
import MobileStoryPage from './pages/mobile/MobileStoryPage';
import MobileBattleHub from './pages/mobile/MobileBattleHub';
import MobileSocialPage from './pages/mobile/MobileSocialPage';
import MobileChat from './components/MobileChat';
import './styles/app.css';

const PAGE_BGM = {
  lobby: 'lobby',
  character: 'character',
  story: 'story',
  battle: 'battle_hub',
  gacha: 'gacha',
  inventory: 'inventory',
  collection: 'collection',
  social: 'social',
  admin: 'lobby',
};

const MOBILE_PAGES = new Set(['lobby', 'character', 'collection', 'inventory', 'gacha', 'story', 'battle', 'social']);

function preloadImages(urls, onProgress) {
  let loaded = 0;
  const total = urls.length;
  if (total === 0) { onProgress(100); return Promise.resolve(); }
  const BATCH = 10;
  let i = 0;
  const next = () => {
    if (i >= total) return Promise.resolve();
    const batch = urls.slice(i, i + BATCH);
    i += BATCH;
    return Promise.all(batch.map(url =>
      new Promise(resolve => {
        const img = new Image();
        img.onload = img.onerror = () => {
          loaded++;
          onProgress(Math.round((loaded / total) * 100));
          resolve();
        };
        img.src = url;
      })
    )).then(next);
  };
  return next();
}

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('lobby');
  const [subPage, setSubPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState('접속 중...');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [missions, setMissions] = useState([]);
  const [titleReady, setTitleReady] = useState(false);
  const [showAttendance, setShowAttendance] = useState(false);
  const tutorialRef = useRef(null);
  const mobileChatRef = useRef(null);
  const [chatUnread, setChatUnread] = useState(0);
  const isMobile = useIsMobile();

  const isMobileRoot = isMobile && (loading || titleReady || !user || !user.tutorialDone || MOBILE_PAGES.has(page));

  useEffect(() => {
    const root = document.getElementById('game-root');
    root.classList.toggle('mobile-mode', isMobileRoot);
    window.dispatchEvent(new Event('resize'));
  }, [isMobileRoot]);

  const refreshUser = async () => {
    try { const u = await api.userStatus(); setUser(u); } catch {}
  };

  const loadMissions = async () => {
    try { const d = await api.missions(); setMissions(d.missions); } catch {}
  };

  useEffect(() => {
    const onSessionExpired = () => {
      disconnectSocket();
      setUser(null);
      setTitleReady(true);
      setPage('lobby');
      addToast('다른 기기에서 접속하여 로그아웃되었습니다.', 'error');
      bgm.play('title');
    };
    window.addEventListener('session_expired', onSessionExpired);
    return () => window.removeEventListener('session_expired', onSessionExpired);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('gacha_token');
    if (token) {
      api.me().then(async (u) => {
        setUser(u);
        setupSocket(token);
        try {
          const checkin = await api.checkin();
          if (!checkin.alreadyCheckedIn) setShowAttendance(true);
        } catch {}
        await refreshUser();
        loadMissions();
        if (window.innerWidth < 1024) {
          setLoadingProgress(100);
        } else {
          setLoadingMsg('리소스 로딩 중...');
          try {
            const { urls, sdUrls } = await api.preload();
            if (sdUrls?.length) setLoadingSdImages(sdUrls);
            await preloadImages(urls, setLoadingProgress);
          } catch {}
        }
        setTitleReady(true);
        setLoading(false);
        bgm.play('title');
      }).catch(() => { clearToken(); setLoading(false); });
    } else { setLoading(false); }
  }, []);

  const setupSocket = (token) => {
    const sock = connectSocket(token);
    sock.on('session_kicked', () => {
      disconnectSocket();
      addToast('다른 기기에서 접속이 감지되었습니다.', 'error');
      goToTitle();
    });
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
    setLoading(true);
    setLoadingMsg('접속 중...');
    setLoadingProgress(0);
    setupSocket(token);
    try {
      await api.checkin();
      setShowAttendance(true);
    } catch {}
    await refreshUser();
    loadMissions();
    if (window.innerWidth < 1024) {
      setLoadingProgress(100);
    } else {
      setLoadingMsg('리소스 로딩 중...');
      try {
        const { urls, sdUrls } = await api.preload();
        if (sdUrls?.length) setLoadingSdImages(sdUrls);
        await preloadImages(urls, setLoadingProgress);
      } catch {}
    }
    setTitleReady(true);
    setLoading(false);
    bgm.play('title');
  };

  const handleLogout = () => {
    clearToken(); disconnectSocket(); setUser(null); setPage('lobby'); setTitleReady(true);
    bgm.play('title');
  };

  const goToTitle = () => {
    setTitleReady(true); setPage('lobby');
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

  useEffect(() => {
    if (!loading && !titleReady && user && user.tutorialDone) {
      bgm.play(PAGE_BGM[page] || 'lobby');
    }
  }, [page, loading, titleReady, user?.tutorialDone]);

  useEffect(() => {
    if (isMobile && user && (user.tutorialStep || 0) < 999 && !user.tutorialDone) {
      api.tutorialAdvance(999).then(() => {
        setUser(prev => ({ ...prev, tutorialStep: 999, tutorialDone: true }));
      });
    }
  }, [user?.tutorialStep, user?.tutorialDone]);

  if (loading || titleReady || !user) return (
    <div className={`title-screen ${isMobile ? 'title-mobile' : ''}`}>
      <div className="title-bg" />
      <div className="title-content">
        <div className="title-logo">
          <span className="title-main">Colors Chronicle</span>
          <span className="title-sub">&#9835; Chromatic Records</span>
        </div>
        {!loading && !user ? (
          <LoginPage onLogin={handleLogin} />
        ) : loadingProgress < 100 ? (
          <div className="title-loading">
            <div className="title-bar-wrap">
              <div className="title-bar-fill" style={{ width: loadingProgress + '%' }} />
            </div>
            <span className="title-loading-text">{loadingMsg}</span>
          </div>
        ) : user ? (
          <div className="title-actions">
            <button className="title-start-btn" onClick={() => setTitleReady(false)}>
              TOUCH TO START
            </button>
            <button className="title-logout-btn" onClick={handleLogout}>&#128682; 로그아웃</button>
          </div>
        ) : (
          <LoginPage onLogin={handleLogin} />
        )}
      </div>
      <div className="title-footer">&#169; DawnSky Studio</div>
    </div>
  );
  if (!user.tutorialDone) return <TutorialPage onComplete={completeTutorial} />;

  const tabs = [
    { key: 'lobby', label: '로비', icon: '🏠' },
    { key: 'character', label: '캐릭터', icon: '👤' },
    { key: 'story', label: '스토리', icon: '📖' },
    { key: 'inventory', label: '보관함', icon: '🎒' },
    { key: 'battle', label: '배틀', icon: '⚔️' },
    { key: 'gacha', label: '뽑기', icon: '🎰' },
    { key: 'collection', label: '도감', icon: '📚' },
  ];

  const isLobby = page === 'lobby';

  if (isMobile && MOBILE_PAGES.has(page)) {
    return (
      <div className="mobile-app">
        {page === 'character' && (
          <div className="mobile-sub-tabs">
            <button className={`mobile-sub-tab ${!subPage ? 'active' : ''}`} onClick={() => setSubPage(null)}>{'육성'}</button>
            <button className={`mobile-sub-tab ${subPage === 'party' ? 'active' : ''}`} onClick={() => setSubPage('party')}>{'편성'}</button>
          </div>
        )}
        <main className="mobile-main">
          {page === 'lobby' && (
            <MobileLobbyPage
              user={user}
              navigate={navigate}
              addToast={addToast}
              onLogout={goToTitle}
              missions={missions}
              onClaimMission={claimMission}
              onShowAttendance={() => setShowAttendance(true)}
              onRefresh={() => { refreshUser(); loadMissions(); }}
            />
          )}
          {page === 'character' && (
            subPage === 'party'
              ? <PartyPage addToast={addToast} />
              : <MobileGrowthPage user={user} onRefresh={refreshUser} addToast={addToast} />
          )}
          {page === 'collection' && <MobileCollectionPage user={user} />}
          {page === 'inventory' && <MobileInventoryPage user={user} onRefresh={refreshUser} addToast={addToast} />}
          {page === 'gacha' && <MobileGachaPage user={user} onPull={() => { refreshUser(); loadMissions(); tutorialRef.current?.completeAction('gacha_pull'); }} addToast={addToast} />}
          {page === 'story' && <MobileStoryPage user={user} onRefresh={refreshUser} addToast={addToast} />}
          {page === 'battle' && <MobileBattleHub user={user} onRefresh={refreshUser} addToast={addToast} />}
          {page === 'social' && <MobileSocialPage user={user} addToast={addToast} onRefresh={refreshUser} navigate={navigate} />}
        </main>
        <MobileChat ref={mobileChatRef} user={user} onUnreadChange={setChatUnread} />
        <nav className="mobile-tab-bar">
          {tabs.map(tab => (
            <button key={tab.key}
              className={'mobile-tab-item' + (page === tab.key ? ' active' : '')}
              onClick={() => navigate(tab.key)}>
              <span className="mobile-tab-icon">{tab.icon}</span>
              <span className="mobile-tab-label">{tab.label}</span>
            </button>
          ))}
          <button className="mobile-tab-item" onClick={() => mobileChatRef.current?.toggle()}>
            <span className="mobile-tab-icon" style={{ position: 'relative' }}>
              <span dangerouslySetInnerHTML={{ __html: '&#128172;' }} />
              {chatUnread > 0 && (
                <span className="mchat-tab-badge">{chatUnread > 99 ? '99+' : chatUnread}</span>
              )}
            </span>
            <span className="mobile-tab-label">{'채팅'}</span>
          </button>
        </nav>
        {showAttendance && <AttendanceModal onClose={() => setShowAttendance(false)} />}
      </div>
    );
  }

  return (
    <div className="app">
      <div className="app-body">
        <div className="app-main-col">
          {page === 'character' && (
            <div className="sub-tabs">
              <button className={`sub-tab ${!subPage ? 'active' : ''}`} onClick={() => setSubPage(null)}>육성</button>
              <button className={`sub-tab ${subPage === 'party' ? 'active' : ''}`} onClick={() => setSubPage('party')}>편성</button>
            </div>
          )}
          <main className={`main-content ${isLobby ? 'main-lobby' : ''}`}>
          {page === 'lobby' && (
            <LobbyPage
              user={user}
              navigate={navigate}
              addToast={addToast}
              onLogout={goToTitle}
              missions={missions}
              onClaimMission={claimMission}
              onRefresh={() => { refreshUser(); loadMissions(); }}
              onShowAttendance={() => setShowAttendance(true)}
            />
          )}
          {page === 'character' && (
            subPage === 'party'
              ? <PartyPage addToast={addToast} />
              : <GrowthPage user={user} onRefresh={refreshUser} addToast={addToast} />
          )}
          {page === 'story' && <StoryPage user={user} onRefresh={refreshUser} addToast={addToast} />}
          {page === 'battle' && <BattleHub user={user} onRefresh={refreshUser} addToast={addToast} />}
          {page === 'gacha' && <GachaPage user={user} onPull={() => { refreshUser(); loadMissions(); tutorialRef.current?.completeAction('gacha_pull'); }} addToast={addToast} />}
          {page === 'inventory' && <InventoryPage user={user} onRefresh={refreshUser} addToast={addToast} />}
          {page === 'collection' && <CollectionPage user={user} />}
          {page === 'social' && <SocialPage user={user} addToast={addToast} onRefresh={refreshUser} />}
          {page === 'admin' && <AdminPage />}
          </main>
        </div>
        <GlobalChat user={user} />
      </div>

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

      {showAttendance && <AttendanceModal onClose={() => setShowAttendance(false)} />}
    </div>
  );
}
