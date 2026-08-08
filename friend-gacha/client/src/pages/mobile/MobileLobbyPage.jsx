import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../utils/api';
import { bgm } from '../../utils/bgm';
import gameConfig from '@gameConfig';
import ProfileModal from '../../components/ProfileModal';
import MissionModal from '../../components/MissionModal';
import CurrencyIcon from '../../components/CurrencyIcon';
import DialogueBubble from '../../components/DialogueBubble';
import { loadDialogues, getLobbyLine } from '../../utils/dialogues';
import LoadingOverlay from '../../components/LoadingOverlay';
import { RARITY_COLORS } from '../../utils/gameConstants';
import './MobileLobbyPage.css';

function getAccountLevelInfo(profile) {
  const level = profile?.accountLevel || 1;
  const exp = profile?.accountExp || 0;
  if (level >= 80) return { level, exp: 0, need: 0, progress: 1 };
  const need = Math.floor(40 * Math.pow(level, 1.15));
  return { level, exp, need, progress: need > 0 ? exp / need : 0 };
}

export default function MobileLobbyPage({ user, navigate, addToast, onLogout, onRefresh, onShowAttendance }) {
  const [lobbyData, setLobbyData] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showMissions, setShowMissions] = useState(false);
  const [profile, setProfile] = useState(null);
  const [unreadMail, setUnreadMail] = useState(0);
  const [bgmState, setBgmState] = useState(bgm.getState);

  useEffect(() => bgm.subscribe(setBgmState), []);
  const [bubbleText, setBubbleText] = useState(null);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.lobby();
        setLobbyData(data);
        const rep = data?.representative;
        const url = rep?.image_ld || rep?.image_url;
        if (url) await new Promise(r => { const img = new Image(); img.onload = img.onerror = r; img.src = url; });
      } catch { addToast('로비 로드 실패', 'error'); }
      setReady(true);
    })();
    loadProfile(); loadUnread(); loadDialogues();
  }, []);

  const handleCharTap = useCallback(() => {
    if (!lobbyData?.representative) return;
    const rep = lobbyData.representative;
    const line = getLobbyLine(rep.character_id, rep.awakening || 0, rep.promotion || 0, lobbyData.ownedCharIds || []);
    if (line) setBubbleText(line);
  }, [lobbyData]);

  const loadUnread = async () => {
    try { const d = await api.mailUnreadCount(); setUnreadMail(d.count); } catch {}
  };
  const loadProfile = async () => {
    try { setProfile(await api.profile()); } catch {}
  };

  if (!ready) return <LoadingOverlay />;

  const { representative: rep } = lobbyData;
  const rarityColor = rep ? (RARITY_COLORS[rep.rarity] || '#888') : '#888';
  const accountLevel = getAccountLevelInfo(profile);

  return (
    <div className="m-lobby">
      <div className="m-lobby-bg" />

      {/* 상단 바 */}
      <div className="m-lobby-top">
        <button className="m-lobby-profile" onClick={() => setShowProfile(true)}>
          <span className="m-lobby-profile-icon">
            {profile?.profileIcon
              ? <img src={profile.profileIcon} alt="" />
              : <span className="m-lobby-profile-initial">{(profile?.displayName || user.displayName || '?')[0]}</span>
            }
          </span>
          <span className="m-lobby-profile-info">
            <span className="m-lobby-profile-name">{profile?.displayName || user.displayName}</span>
            <span className="m-lobby-profile-level">Lv.{accountLevel.level}</span>
          </span>
        </button>

        <div className="m-lobby-currencies">
          <div className="m-lobby-res">
            <span className="m-lobby-res-icon"><CurrencyIcon type="stamina" size={20} /></span>
            <span className="m-lobby-res-val">{user.stamina || 0}</span>
          </div>
          <div className="m-lobby-res">
            <span className="m-lobby-res-icon"><CurrencyIcon type="bit" size={20} /></span>
            <span className="m-lobby-res-val">{(user.gold || 0).toLocaleString()}</span>
          </div>
          <div className="m-lobby-res">
            <span className="m-lobby-res-icon"><CurrencyIcon type="prism" size={20} /></span>
            <span className="m-lobby-res-val">{(user.currency || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* 우측 액션 버튼 */}
      <div className="m-lobby-actions">
        <button className="m-lobby-action-btn" onClick={onShowAttendance}>
          &#128197;
        </button>
        <button className="m-lobby-action-btn" onClick={() => setShowMissions(true)}>
          &#128203;
        </button>
        <button className="m-lobby-action-btn" onClick={() => navigate('social', 'mail')}>
          &#128236;
          {unreadMail > 0 && <span className="m-lobby-action-badge">{unreadMail}</span>}
        </button>
        <button className="m-lobby-action-btn" onClick={() => setShowSettings(!showSettings)}>
          &#9881;&#65039;
        </button>
      </div>

      {showSettings && (
        <div className="m-lobby-settings-menu">
          <div className="m-lobby-settings-bgm">
            <button className="m-lobby-bgm-toggle" onClick={() => bgm.toggleMute()}>
              <span dangerouslySetInnerHTML={{ __html: bgmState.muted ? '&#128263;' : '&#128266;' }} />
              <span>{bgmState.muted ? 'BGM OFF' : 'BGM ON'}</span>
            </button>
            <input
              type="range" min="0" max="1" step="0.05"
              value={bgmState.volume}
              onChange={(e) => bgm.setVolume(parseFloat(e.target.value))}
              className="m-lobby-bgm-slider"
            />
          </div>
          <button onClick={() => { navigate('admin'); setShowSettings(false); }}>&#128295; 관리</button>
          <button onClick={onLogout}>&#127968; 타이틀 화면</button>
        </div>
      )}

      {/* 캐릭터 영역 */}
      <div className="m-lobby-char-area">
        {rep ? (
          <div className="m-lobby-char-touch" onClick={handleCharTap}>
            {rep.image_ld ? (
              <img src={rep.image_ld} alt={rep.name} className="m-lobby-char-ld" />
            ) : rep.image_url ? (
              <img src={rep.image_url} alt={rep.name} className="m-lobby-char-fallback" />
            ) : (
              <div className={`m-lobby-char-placeholder ${rep.rarity === 'CR' ? 'rarity-border-CR' : ''}`}
                style={rep.rarity !== 'CR' ? { borderColor: rarityColor } : undefined}>
                {rep.name[0]}
              </div>
            )}
          </div>
        ) : (
          <div className="m-lobby-no-char">
            <p>&#128511; &#52896;&#47533;&#53552;&#44032; &#50630;&#49845;&#45768;&#45796;</p>
            <button className="btn-primary" onClick={() => navigate('gacha')}>&#49468;&#44592; &#54616;&#47084; &#44032;&#44592;</button>
          </div>
        )}
      </div>

      {bubbleText && rep && (
        <DialogueBubble
          speaker={rep.name}
          text={bubbleText}
          duration={4000}
          variant="mobile-lobby"
          onDone={() => setBubbleText(null)}
        />
      )}

      {showMissions && (
        <MissionModal onClose={() => setShowMissions(false)} onRefresh={onRefresh} />
      )}

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
