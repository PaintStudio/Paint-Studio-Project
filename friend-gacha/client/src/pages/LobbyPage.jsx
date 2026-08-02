import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../utils/api';
import { bgm } from '../utils/bgm';
import gameConfig from '@gameConfig';
import ProfileModal from '../components/ProfileModal';
import CurrencyIcon from '../components/CurrencyIcon';
import DialogueBubble from '../components/DialogueBubble';
import { loadDialogues, getLobbyLine } from '../utils/dialogues';
import LoadingOverlay from '../components/LoadingOverlay';
import { RARITY_COLORS, ORIGIN_LABELS } from '../utils/gameConstants';
import './LobbyPage.css';

function getAccountLevelInfo(profile) {
  const level = profile?.accountLevel || 1;
  const exp = profile?.accountExp || 0;
  if (level >= 80) return { level, exp: 0, need: 0, progress: 1 };
  const need = Math.floor(40 * Math.pow(level, 1.15));
  return { level, exp, need, progress: need > 0 ? exp / need : 0 };
}

export default function LobbyPage({ user, navigate, addToast, onLogout, missions, onClaimMission, onRefresh }) {
  const [lobbyData, setLobbyData] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profile, setProfile] = useState(null);
  const [bgmState, setBgmState] = useState(bgm.getState);

  useEffect(() => bgm.subscribe(setBgmState), []);

  const [unreadMail, setUnreadMail] = useState(0);
  const [bubbleText, setBubbleText] = useState(null);
  const [staminaTooltip, setStaminaTooltip] = useState(null);
  const staminaTimerRef = useRef(null);

  useEffect(() => { loadLobby(); loadProfile(); loadUnread(); loadDialogues(); }, []);

  const handleCharTap = useCallback(() => {
    if (!lobbyData?.representative) return;
    const rep = lobbyData.representative;
    const line = getLobbyLine(rep.character_id, rep.awakening || 0, rep.promotion || 0, lobbyData.ownedCharIds || []);
    if (line) setBubbleText(line);
  }, [lobbyData]);

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

  const calcStaminaTooltip = useCallback(() => {
    const max = gameConfig.stamina.max;
    const cur = user.stamina || 0;
    if (cur >= max) return { full: true };
    const recoveryMs = (gameConfig.stamina.recoveryMinutes || 5) * 60 * 1000;
    const lastUpdate = user.staminaUpdatedAt
      ? new Date(user.staminaUpdatedAt + (user.staminaUpdatedAt.includes('Z') ? '' : 'Z')).getTime()
      : Date.now();
    const elapsed = Date.now() - lastUpdate;
    const nextMs = Math.max(0, recoveryMs - (elapsed % recoveryMs));
    const remaining = max - cur;
    const fullMs = Math.max(0, (remaining - 1) * recoveryMs + nextMs);
    return { full: false, nextMs, fullMs };
  }, [user.stamina, user.staminaUpdatedAt]);

  const formatTime = (ms) => {
    const totalSec = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const onStaminaEnter = () => {
    setStaminaTooltip(calcStaminaTooltip());
    staminaTimerRef.current = setInterval(() => {
      setStaminaTooltip(calcStaminaTooltip());
    }, 1000);
  };

  const onStaminaLeave = () => {
    setStaminaTooltip(null);
    if (staminaTimerRef.current) {
      clearInterval(staminaTimerRef.current);
      staminaTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => { if (staminaTimerRef.current) clearInterval(staminaTimerRef.current); };
  }, []);

  if (!lobbyData) return <LoadingOverlay />;

  const { representative: rep } = lobbyData;
  const rarityColor = rep ? (RARITY_COLORS[rep.rarity] || '#888') : '#888';
  const accountLevel = getAccountLevelInfo(profile);

  return (
    <div className="lobby-page">
      {/* 배경 그라디언트 */}
      <div className="lobby-bg" />

      {/* 좌상단 프로필 */}
      <button className="lobby-profile-btn" onClick={() => setShowProfile(true)}>
        <span className="lobby-profile-icon">
          {profile?.profileIcon
            ? <img src={profile.profileIcon} alt="" />
            : <span className="lobby-profile-initial">{(profile?.displayName || user.displayName || '?')[0]}</span>
          }
        </span>
        <span className="lobby-profile-info">
          <span className="lobby-profile-name">{profile?.displayName || user.displayName}</span>
          <span className="lobby-profile-level">Lv.{accountLevel.level}</span>
          <span className="lobby-profile-exp-bar">
            <span className="lobby-profile-exp-fill" style={{ width: `${accountLevel.progress * 100}%` }} />
          </span>
        </span>
      </button>

      {/* 우상단 재화/메일/설정 */}
      <div className="lobby-top-right">
        <div className="lobby-res-box stamina-box" onMouseEnter={onStaminaEnter} onMouseLeave={onStaminaLeave}>
          <span className="lobby-res-icon"><CurrencyIcon type="stamina" size={32} /></span>
          <div className="lobby-res-inner stamina">
            <div className="stamina-fill" style={{ width: `${Math.min(100, ((user.stamina || 0) / gameConfig.stamina.max) * 100)}%` }} />
            <span className="lobby-res-value">{user.stamina || 0}/{gameConfig.stamina.max}</span>
          </div>
          {staminaTooltip && (
            <div className="stamina-tooltip">
              {staminaTooltip.full ? (
                <span className="stamina-tooltip-info">{gameConfig.stamina.recoveryMinutes || 5}분마다 1 회복</span>
              ) : (
                <>
                  <div className="stamina-tooltip-row">
                    <span>다음 회복</span><span>{formatTime(staminaTooltip.nextMs)}</span>
                  </div>
                  <div className="stamina-tooltip-row">
                    <span>만충까지</span><span>{formatTime(staminaTooltip.fullMs)}</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        <div className="lobby-res-box">
          <span className="lobby-res-icon"><CurrencyIcon type="bit" size={32} /></span>
          <div className="lobby-res-inner">
            <span className="lobby-res-value">{(user.gold || 0).toLocaleString()}</span>
          </div>
        </div>
        <div className="lobby-res-box">
          <span className="lobby-res-icon"><CurrencyIcon type="prism" size={32} /></span>
          <div className="lobby-res-inner">
            <span className="lobby-res-value">{(user.currency || 0).toLocaleString()}</span>
          </div>
        </div>
        <button className="lobby-mail-btn" onClick={() => navigate('social', 'mail')}>
          &#128236;
          {unreadMail > 0 && <span className="lobby-mail-badge">{unreadMail}</span>}
        </button>
        <button className="lobby-settings-btn" onClick={() => setShowSettings(!showSettings)}>&#9881;&#65039;</button>
      </div>

      {showSettings && (
        <div className="lobby-settings-menu">
          <div className="lobby-settings-bgm">
            <button className="lobby-bgm-toggle" onClick={() => bgm.toggleMute()}>
              <span dangerouslySetInnerHTML={{ __html: bgmState.muted ? '&#128263;' : '&#128266;' }} />
              <span>{bgmState.muted ? 'BGM OFF' : 'BGM ON'}</span>
            </button>
            <input
              type="range" min="0" max="1" step="0.05"
              value={bgmState.volume}
              onChange={(e) => bgm.setVolume(parseFloat(e.target.value))}
              className="lobby-bgm-slider"
            />
          </div>
          <button onClick={() => { navigate('admin'); setShowSettings(false); }}>&#128295; 관리</button>
          <button onClick={onLogout}>&#127968; 타이틀 화면</button>
        </div>
      )}

      {/* 메인 로비 영역 */}
      <div className="lobby-main-area">
        {/* 캐릭터 LD - 좌측 */}
        <div className="lobby-character-area">
          {rep ? (
            <div className="lobby-char-standing" onClick={handleCharTap} style={{ cursor: 'pointer' }}>
              {bubbleText && (
                <DialogueBubble
                  speaker={rep.name}
                  text={bubbleText}
                  duration={4000}
                  variant="lobby"
                  onDone={() => setBubbleText(null)}
                />
              )}
              {rep.image_ld ? (
                <img src={rep.image_ld} alt={rep.name} className="lobby-char-ld" />
              ) : rep.image_url ? (
                <img src={rep.image_url} alt={rep.name} className="lobby-char-fallback" />
              ) : (
                <div className={`lobby-char-placeholder ${rep.rarity === 'CR' ? 'rarity-border-CR' : ''}`} style={rep.rarity !== 'CR' ? { borderColor: rarityColor } : undefined}>
                  {rep.name[0]}
                </div>
              )}
            </div>
          ) : (
            <div className="lobby-no-char">
              <p>캐릭터가 없습니다</p>
              <button className="btn-primary" onClick={() => navigate('gacha')}>뽑기 하러 가기</button>
            </div>
          )}
        </div>

      </div>

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
