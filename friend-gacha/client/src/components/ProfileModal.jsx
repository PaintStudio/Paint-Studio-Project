import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import './ProfileModal.css';

export default function ProfileModal({ user, onClose, onSave }) {
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [profileIcon, setProfileIcon] = useState('');
  const [icons, setIcons] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // 프로필 로드
    api.profile().then(p => {
      setDisplayName(p.displayName || '');
      setBio(p.bio || '');
      setProfileIcon(p.profileIcon || '');
    }).catch(() => {});

    // 보유 아이콘 로드
    api.profileIcons().then(d => setIcons(d.icons)).catch(() => {});
  }, []);

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      await api.updateProfile({ displayName, bio, profileIcon });
      onSave?.();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={e => e.stopPropagation()}>
        <div className="profile-modal-header">
          <h3>프로필 편집</h3>
          <button className="profile-close" onClick={onClose}>✕</button>
        </div>

        <div className="profile-modal-body">
          {/* 아이콘 선택 */}
          <div className="profile-section">
            <label className="profile-label">아이콘</label>
            <div className="profile-icon-preview">
              {profileIcon ? (
                <img src={profileIcon} alt="" className="icon-preview-img" />
              ) : (
                <div className="icon-preview-empty">{displayName?.[0] || '?'}</div>
              )}
            </div>
            <div className="profile-icon-grid">
              <button
                className={`icon-option ${profileIcon === '' ? 'selected' : ''}`}
                onClick={() => setProfileIcon('')}
              >
                <span className="icon-default-text">기본</span>
              </button>
              {icons.map(ic => (
                <button
                  key={ic.characterId}
                  className={`icon-option ${profileIcon === ic.image_url ? 'selected' : ''}`}
                  onClick={() => setProfileIcon(ic.image_url)}
                  title={ic.name}
                >
                  <img src={ic.image_url} alt={ic.name} />
                </button>
              ))}
            </div>
          </div>

          {/* 닉네임 */}
          <div className="profile-section">
            <label className="profile-label">닉네임</label>
            <input
              className="profile-input"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              maxLength={20}
              placeholder="닉네임 입력"
            />
            <span className="profile-counter">{displayName.length}/20</span>
          </div>

          {/* 한줄 소개 */}
          <div className="profile-section">
            <label className="profile-label">한줄 소개</label>
            <input
              className="profile-input"
              value={bio}
              onChange={e => setBio(e.target.value)}
              maxLength={100}
              placeholder="자기소개를 입력하세요"
            />
            <span className="profile-counter">{bio.length}/100</span>
          </div>

          {error && <p className="profile-error">{error}</p>}
        </div>

        <div className="profile-modal-footer">
          <button className="btn-profile-cancel" onClick={onClose}>취소</button>
          <button className="btn-profile-save" onClick={handleSave} disabled={saving || !displayName.trim()}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
