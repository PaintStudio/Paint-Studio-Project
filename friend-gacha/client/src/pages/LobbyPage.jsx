import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import gameConfig from '@gameConfig';
import './LobbyPage.css';

const RARITY_COLORS = {};
for (const [k, v] of Object.entries(gameConfig.rarities)) RARITY_COLORS[k] = v.color;
const ORIGIN_LABELS = {};
for (const [k, v] of Object.entries(gameConfig.origins)) ORIGIN_LABELS[k] = v.label;

export default function LobbyPage({ user, navigate, addToast, onLogout, missions, onClaimMission, onRefresh }) {
  const [lobbyData, setLobbyData] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => { loadLobby(); }, []);

  const loadLobby = async () => {
    try {
      const data = await api.lobby();
      setLobbyData(data);
    } catch (err) {
      addToast('로비 로드 실패', 'error');
    }
  };

  if (!lobbyData) return <div className="lobby-loading">로딩 중...</div>;

  const { representative: rep, notifications } = lobbyData;
  const rarityColor = rep ? (RARITY_COLORS[rep.rarity] || '#888') : '#888';

  const pendingMissions = missions?.filter(m => m.completed && !m.claimed).length || 0;
  const totalNotifs = (notifications.pendingMissions || 0) + (notifications.pendingTrades || 0);

  return (
    <div className="lobby-page">
      {/* 배경 그라디언트 */}
      <div className="lobby-bg" />

      {/* 상단 바 */}
      <div className="lobby-header">
        <div className="lobby-header-left">
          <span className="lobby-title">대충 가챠겜</span>
        </div>
        <div className="lobby-header-right">
          <span className="lobby-res">⚡{user.stamina || 0}</span>
          <span className="lobby-res gold">🪙{(user.gold || 0).toLocaleString()}</span>
          <span className="lobby-res diamond">💎{(user.currency || 0).toLocaleString()}</span>
          <button className="lobby-settings-btn" onClick={() => setShowSettings(!showSettings)}>⚙️</button>
        </div>
      </div>

      {/* 설정 드롭다운 */}
      {showSettings && (
        <div className="lobby-settings-menu">
          <button onClick={() => { navigate('admin'); setShowSettings(false); }}>🔧 관리</button>
          <button onClick={onLogout}>🚪 로그아웃</button>
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
              <span className="notice-icon">🔄</span>
              <span>교환 요청 {notifications.pendingTrades}건</span>
            </button>
          )}
          {notifications.pendingMissions > 0 && (
            <button className="lobby-notice-item mission" onClick={() => navigate('lobby')}>
              <span className="notice-icon">📋</span>
              <span>미완료 미션 {notifications.pendingMissions}건</span>
            </button>
          )}
          {pendingMissions > 0 && (
            <button className="lobby-notice-item reward" onClick={() => navigate('lobby')}>
              <span className="notice-icon">🎁</span>
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
    </div>
  );
}
