import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import gameConfig from '@gameConfig';
import ProfileModal from '../components/ProfileModal';
import './LobbyPage.css';

const RARITY_COLORS = {};
for (const [k, v] of Object.entries(gameConfig.rarities)) RARITY_COLORS[k] = v.color;
const ORIGIN_LABELS = {};
for (const [k, v] of Object.entries(gameConfig.origins)) ORIGIN_LABELS[k] = v.label;

const getAccountLevel = (totalPulls) => {
  const p = totalPulls || 0;
  const level = Math.floor((1 + Math.sqrt(1 + 8 * p / 5)) / 2);
  const curr = 5 * (level - 1) * level / 2;
  const next = 5 * level * (level + 1) / 2;
  const exp = p - curr;
  const need = next - curr;
  return { level, exp, need, progress: need > 0 ? exp / need : 0 };
};

export default function LobbyPage({ user, navigate, addToast, onLogout, missions, onClaimMission, onRefresh }) {
  const [lobbyData, setLobbyData] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profile, setProfile] = useState(null);

  const [unreadMail, setUnreadMail] = useState(0);

  useEffect(() => { loadLobby(); loadProfile(); loadUnread(); }, []);

  const loadUnread = async () => {
    try { const d = await api.mailUnreadCount(); setUnreadMail(d.count); } catch {}
  };

  const loadLobby = async () => {
    try {
      const data = await api.lobby();
      setLobbyData(data);
    } catch (err) {
      addToast('로비 로드 실패', 'error');
    }
  };

  const loadProfile = async () => {
    try { const p = await api.profile(); setProfile(p); } catch {}
  };

  if (!lobbyData) return <div className="lobby-loading">로딩 중...</div>;

  const { representative: rep, notifications } = lobbyData;
  const rarityColor = rep ? (RARITY_COLORS[rep.rarity] || '#888') : '#888';

  const pendingMissions = missions?.filter(m => m.completed && !m.claimed).length || 0;
  const totalNotifs = (notifications.pendingMissions || 0) + (notifications.pendingTrades || 0);
  const accountLevel = getAccountLevel(profile?.totalPulls);

  return (
    <div className="lobby-page">
      {/* 배경 그라디언트 */}
      <div className="lobby-bg" />

      {/* 상단 재화 바 */}
      <div className="lobby-header">
        {/* 프로필 */}
        <button className="lobby-profile-btn" onClick={() => setShowProfile(true)}>
          <span className="lobby-profile-icon">
            {profile?.profileIcon
              ? <img src={profile.profileIcon} alt="" />
              : <span className="lobby-profile-initial">{(profile?.displayName || user.displayName || '?')[0]}</span>
            }
            <span className="lobby-profile-lvl-badge">
              {accountLevel.level}
            </span>
          </span>
          <span className="lobby-profile-info">
            <span className="lobby-profile-name">{profile?.displayName || user.displayName}</span>
            <span className="lobby-profile-level">Lv.{accountLevel.level}</span>
            <span className="lobby-profile-exp-bar">
              <span className="lobby-profile-exp-fill" style={{ width: `${accountLevel.progress * 100}%` }} />
            </span>
          </span>
        </button>
        <div className="lobby-header-resources">
          <span className="lobby-res">&#9889;{user.stamina || 0}</span>
          <span className="lobby-res gold">&#129689;{(user.gold || 0).toLocaleString()}</span>
          <span className="lobby-res diamond">&#128142;{(user.currency || 0).toLocaleString()}</span>
        </div>
        <button className="lobby-mail-btn" onClick={() => navigate('social', 'mail')}>
          &#128236;
          {unreadMail > 0 && <span className="lobby-mail-badge">{unreadMail}</span>}
        </button>
        <button className="lobby-settings-btn" onClick={() => setShowSettings(!showSettings)}>&#9881;&#65039;</button>
      </div>

      {/* 설정 드롭다운 */}
      {showSettings && (
        <div className="lobby-settings-menu">
          <button onClick={() => { navigate('admin'); setShowSettings(false); }}>&#128295; 관리</button>
          <button onClick={onLogout}>&#128682; 로그아웃</button>
        </div>
      )}

      {/* 메인 로비 영역 */}
      <div className="lobby-main-area">
        {/* 캐릭터 LD - 좌측 */}
        <div className="lobby-character-area">
          {rep ? (
            <div className="lobby-char-standing">
              {rep.image_ld ? (
                <img src={rep.image_ld} alt={rep.name} className="lobby-char-ld" />
              ) : rep.image_url ? (
                <img src={rep.image_url} alt={rep.name} className="lobby-char-fallback" />
              ) : (
                <div className="lobby-char-placeholder" style={{ borderColor: rarityColor }}>
                  {rep.name[0]}
                </div>
              )}
              <div className="lobby-char-info">
                <span className="lobby-char-name" style={{ color: rarityColor === 'rainbow' ? '#ffd700' : rarityColor }}>
                  {rep.name}
                </span>
                <span className="lobby-char-title">{rep.title}</span>
              </div>
            </div>
          ) : (
            <div className="lobby-no-char">
              <p>캐릭터가 없습니다</p>
              <button className="btn-primary" onClick={() => navigate('gacha')}>뽑기 하러 가기</button>
            </div>
          )}
        </div>

        {/* 우측 알림/배너 영역 */}
        <div className="lobby-side-area">
          {notifications.pendingTrades > 0 && (
            <button className="lobby-notice-item trade" onClick={() => navigate('social', 'trade')}>
              <span className="notice-icon">&#128260;</span>
              <span>교환 요청 {notifications.pendingTrades}건</span>
            </button>
          )}
          {notifications.pendingMissions > 0 && (
            <button className="lobby-notice-item mission" onClick={() => navigate('lobby')}>
              <span className="notice-icon">&#128203;</span>
              <span>미완료 미션 {notifications.pendingMissions}건</span>
            </button>
          )}
          {pendingMissions > 0 && (
            <button className="lobby-notice-item reward" onClick={() => navigate('lobby')}>
              <span className="notice-icon">&#127873;</span>
              <span>보상 수령 가능!</span>
            </button>
          )}
        </div>
      </div>

      {/* 캐릭터 대사 */}
      {rep?.quote && (
        <div className="lobby-quote-area">
          <span className="lobby-char-quote">"{rep.quote}"</span>
        </div>
      )}

      {/* 프로필 모달 */}
      {showProfile && (
        <ProfileModal
          user={user}
          onClose={() => setShowProfile(false)}
          onSave={() => { loadProfile(); onRefresh(); }}
        />
      )}
    </div>
  );
}
