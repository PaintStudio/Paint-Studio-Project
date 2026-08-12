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
      const char = db.prepare('SELECT id, rarity FROM characters WHERE id = ?').get(rewards.characterId);
      if (char) {
        const autoLock = (char.rarity === 'SSR' || char.rarity === 'CR') ? 1 : 0;
        const inv = db.prepare('INSERT INTO inventory (user_id, character_id, level, exp, awakening, is_locked) VALUES (?, ?, 1, 0, 0, ?)')
          .run(req.user.id, rewards.characterId, autoLock);
        initCharacterSkills(req.user.id, inv.lastInsertRowid, rewards.characterId);
      }
    }
    if (rewards.items && Array.isArray(rewards.items)) {
      for (const { itemId, count } of rewards.items) {
        if (!itemId || !count || count <= 0) continue;
        const existing = db.prepare('SELECT quantity FROM user_items WHERE user_id = ? AND item_id = ?').get(req.user.id, itemId);
        if (existing) {
          db.prepare('UPDATE user_items SET quantity = quantity + ? WHERE user_id = ? AND item_id = ?').run(count, req.user.id, itemId);
        } else {
          db.prepare('INSERT INTO user_items (user_id, item_id, quantity) VALUES (?, ?, ?)').run(req.user.id, itemId, count);
        }
      }
    }
  }

  db.prepare('UPDATE mail SET is_claimed = 1, is_read = 1 WHERE id = ?').run(req.params.id);
  res.json({ ok: true, rewards });
});

// 일괄 수령
router.post('/claim-all', authMiddleware, (req, res) => {
  const unclaimed = db.prepare(`
    SELECT * FROM mail
    WHERE recipient_id = ? AND is_claimed = 0 AND rewards IS NOT NULL
      AND (expires_at IS NULL OR expires_at > datetime('now'))
  `).all(req.user.id);

  if (unclaimed.length === 0) return res.json({ ok: true, claimed: 0, totalRewards: {} });

  let totalCurrency = 0, totalGold = 0;
  const itemTotals = {};

  for (const mail of unclaimed) {
    const rewards = JSON.parse(mail.rewards);
    if (rewards.currency) totalCurrency += rewards.currency;
    if (rewards.gold) totalGold += rewards.gold;
    if (rewards.characterId) {
      const char = db.prepare('SELECT id, rarity FROM characters WHERE id = ?').get(rewards.characterId);
      if (char) {
        const autoLock = (char.rarity === 'SSR' || char.rarity === 'CR') ? 1 : 0;
        const inv = db.prepare('INSERT INTO inventory (user_id, character_id, level, exp, awakening, is_locked) VALUES (?, ?, 1, 0, 0, ?)')
          .run(req.user.id, rewards.characterId, autoLock);
        initCharacterSkills(req.user.id, inv.lastInsertRowid, rewards.characterId);
      }
    }
    if (rewards.items && Array.isArray(rewards.items)) {
      for (const { itemId, count } of rewards.items) {
        if (!itemId || !count || count <= 0) continue;
        itemTotals[itemId] = (itemTotals[itemId] || 0) + count;
      }
    }
  }

  if (totalCurrency > 0) {
    db.prepare('UPDATE users SET currency = currency + ? WHERE id = ?').run(totalCurrency, req.user.id);
  }
  if (totalGold > 0) {
    db.prepare('UPDATE users SET gold = gold + ? WHERE id = ?').run(totalGold, req.user.id);
  }
  for (const [itemId, count] of Object.entries(itemTotals)) {
    const existing = db.prepare('SELECT quantity FROM user_items WHERE user_id = ? AND item_id = ?').get(req.user.id, itemId);
    if (existing) {
      db.prepare('UPDATE user_items SET quantity = quantity + ? WHERE user_id = ? AND item_id = ?').run(count, req.user.id, itemId);
    } else {
      db.prepare('INSERT INTO user_items (user_id, item_id, quantity) VALUES (?, ?, ?)').run(req.user.id, itemId, count);
    }
  }

  const ids = unclaimed.map(m => m.id);
  db.prepare(`UPDATE mail SET is_claimed = 1, is_read = 1 WHERE id IN (${ids.map(() => '?').join(',')})`).run(...ids);

  res.json({
    ok: true,
    claimed: unclaimed.length,
    totalRewards: {
      ...(totalCurrency > 0 && { currency: totalCurrency }),
      ...(totalGold > 0 && { gold: totalGold }),
      ...(Object.keys(itemTotals).length > 0 && { items: itemTotals })
    }
  });
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
