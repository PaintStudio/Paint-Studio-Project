const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 내 프로필 조회
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare(`
    SELECT id, username, display_name, bio, profile_icon, currency, gold, total_pulls, login_streak, account_level, account_exp
    FROM users WHERE id = ?
  `).get(req.user.id);
  if (!user) return res.status(404).json({ error: '유저 없음' });

  res.json({
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    bio: user.bio || '',
    profileIcon: user.profile_icon || '',
    currency: user.currency,
    gold: user.gold,
    totalPulls: user.total_pulls,
    loginStreak: user.login_streak,
    accountLevel: user.account_level || 1,
    accountExp: user.account_exp || 0,
  });
});

// 프로필 수정
router.put('/me', authMiddleware, (req, res) => {
  const { displayName, bio, profileIcon } = req.body;

  // 닉네임 검증
  if (displayName !== undefined) {
    const name = (displayName || '').trim();
    if (name.length < 1 || name.length > 20) {
      return res.status(400).json({ error: '닉네임은 1~20자' });
    }
  }

  // 소개 검증
  if (bio !== undefined && bio.length > 100) {
    return res.status(400).json({ error: '한줄 소개는 100자 이내' });
  }

  // 아이콘 검증: 보유 캐릭터 포트레이트인지 확인
  if (profileIcon !== undefined && profileIcon !== '') {
    const owned = db.prepare(`
      SELECT DISTINCT c.image_url FROM inventory i
      JOIN characters c ON i.character_id = c.id
      WHERE i.user_id = ?
    `).all(req.user.id);
    const validIcons = owned.map(r => r.image_url).filter(Boolean);
    if (!validIcons.includes(profileIcon)) {
      return res.status(400).json({ error: '보유하지 않은 캐릭터 아이콘' });
    }
  }

  // 업데이트
  const updates = [];
  const params = [];
  if (displayName !== undefined) { updates.push('display_name = ?'); params.push(displayName.trim()); }
  if (bio !== undefined) { updates.push('bio = ?'); params.push(bio); }
  if (profileIcon !== undefined) { updates.push('profile_icon = ?'); params.push(profileIcon); }

  if (updates.length === 0) return res.status(400).json({ error: '변경할 항목 없음' });

  params.push(req.user.id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  res.json({ ok: true });
});

// 보유 아이콘 목록 (= 뽑은 캐릭터 포트레이트)
router.get('/icons', authMiddleware, (req, res) => {
  const icons = db.prepare(`
    SELECT DISTINCT c.id as characterId, c.name, c.rarity, c.image_url
    FROM inventory i
    JOIN characters c ON i.character_id = c.id
    WHERE i.user_id = ? AND c.image_url != ''
    ORDER BY c.rarity DESC, c.name
  `).all(req.user.id);

  res.json({ icons });
});

module.exports = router;
