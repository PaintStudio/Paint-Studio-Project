const express = require('express');
const db = require('../db');
const { initCharacterSkills } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 내 우편 목록 (만료되지 않은 것)
router.get('/list', authMiddleware, (req, res) => {
  const mails = db.prepare(`
    SELECT m.*, u.display_name as sender_name
    FROM mail m
    LEFT JOIN users u ON m.sender_id = u.id
    WHERE m.recipient_id = ?
      AND (m.expires_at IS NULL OR m.expires_at > datetime('now'))
    ORDER BY m.created_at DESC
    LIMIT 100
  `).all(req.user.id);

  // rewards JSON 파싱
  const parsed = mails.map(m => ({
    ...m,
    rewards: m.rewards ? JSON.parse(m.rewards) : null,
    senderName: m.sender_name || '시스템'
  }));

  res.json({ mails: parsed });
});

// 읽음 처리
router.patch('/read/:id', authMiddleware, (req, res) => {
  const mail = db.prepare('SELECT * FROM mail WHERE id = ? AND recipient_id = ?').get(req.params.id, req.user.id);
  if (!mail) return res.status(404).json({ error: '우편을 찾을 수 없습니다' });

  db.prepare('UPDATE mail SET is_read = 1 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// 보상 수령
router.post('/claim/:id', authMiddleware, (req, res) => {
  const mail = db.prepare('SELECT * FROM mail WHERE id = ? AND recipient_id = ?').get(req.params.id, req.user.id);
  if (!mail) return res.status(404).json({ error: '우편을 찾을 수 없습니다' });
  if (mail.is_claimed) return res.status(400).json({ error: '이미 수령한 우편입니다' });

  const rewards = mail.rewards ? JSON.parse(mail.rewards) : null;
  if (rewards) {
    if (rewards.currency) {
      db.prepare('UPDATE users SET currency = currency + ? WHERE id = ?').run(rewards.currency, req.user.id);
    }
    if (rewards.gold) {
      db.prepare('UPDATE users SET gold = gold + ? WHERE id = ?').run(rewards.gold, req.user.id);
    }
    if (rewards.characterId) {
      const char = db.prepare('SELECT id FROM characters WHERE id = ?').get(rewards.characterId);
      if (char) {
        const inv = db.prepare('INSERT INTO inventory (user_id, character_id, level, exp, awakening) VALUES (?, ?, 1, 0, 0)')
          .run(req.user.id, rewards.characterId);
        initCharacterSkills(req.user.id, inv.lastInsertRowid, rewards.characterId);
      }
    }
  }

  db.prepare('UPDATE mail SET is_claimed = 1, is_read = 1 WHERE id = ?').run(req.params.id);
  res.json({ ok: true, rewards });
});

// 우편 삭제
router.delete('/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM mail WHERE id = ? AND recipient_id = ?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

// 읽은 우편 전체 삭제
router.delete('/cleanup/read', authMiddleware, (req, res) => {
  const result = db.prepare('DELETE FROM mail WHERE recipient_id = ? AND is_read = 1 AND (rewards IS NULL OR is_claimed = 1)').run(req.user.id);
  res.json({ ok: true, deleted: result.changes });
});

// 안 읽은 우편 수 (뱃지용)
router.get('/unread-count', authMiddleware, (req, res) => {
  const row = db.prepare(`
    SELECT COUNT(*) as cnt FROM mail
    WHERE recipient_id = ? AND is_read = 0
      AND (expires_at IS NULL OR expires_at > datetime('now'))
  `).get(req.user.id);
  res.json({ count: row.cnt });
});

module.exports = router;
