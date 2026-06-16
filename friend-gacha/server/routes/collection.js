const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 내 컬렉션
router.get('/my', authMiddleware, (req, res) => {
  const items = db.prepare(`
    SELECT i.id as inventory_id, i.obtained_at, i.is_new, i.is_favorite, i.level, i.awakening,
           c.id as character_id, c.name, c.rarity, c.element, c.origin, c.title, c.description, c.quote,
           c.base_hp, c.base_atk, c.base_def, c.base_spd, c.turn_notes, c.image_url
    FROM inventory i
    JOIN characters c ON i.character_id = c.id
    WHERE i.user_id = ?
    ORDER BY CASE c.rarity WHEN 'CR' THEN 0 WHEN 'SSR' THEN 1 WHEN 'SR' THEN 2 WHEN 'R' THEN 3 ELSE 4 END, i.obtained_at DESC
  `).all(req.user.id);

  const totalChars = db.prepare('SELECT COUNT(*) as cnt FROM characters').get().cnt;
  const uniqueChars = db.prepare('SELECT COUNT(DISTINCT character_id) as cnt FROM inventory WHERE user_id = ?').get(req.user.id).cnt;

  res.json({ items, completion: { total: totalChars, collected: uniqueChars, rate: Math.round((uniqueChars / totalChars) * 100) } });
});

// 다른 유저 컬렉션 보기
router.get('/user/:userId', authMiddleware, (req, res) => {
  const target = db.prepare('SELECT id, display_name, total_pulls FROM users WHERE id = ?').get(req.params.userId);
  if (!target) return res.status(404).json({ error: '유저를 찾을 수 없습니다' });

  const items = db.prepare(`
    SELECT i.id as inventory_id, c.name, c.rarity, c.element, c.title, c.image_url
    FROM inventory i JOIN characters c ON i.character_id = c.id
    WHERE i.user_id = ?
    ORDER BY CASE c.rarity WHEN 'CR' THEN 0 WHEN 'SSR' THEN 1 WHEN 'SR' THEN 2 WHEN 'R' THEN 3 ELSE 4 END
  `).all(req.params.userId);

  const totalChars = db.prepare('SELECT COUNT(*) as cnt FROM characters').get().cnt;
  const uniqueChars = db.prepare('SELECT COUNT(DISTINCT character_id) as cnt FROM inventory WHERE user_id = ?').get(req.params.userId).cnt;

  res.json({ user: target, items, completion: { total: totalChars, collected: uniqueChars, rate: Math.round((uniqueChars / totalChars) * 100) } });
});

// NEW 마크 해제
router.patch('/mark-seen/:inventoryId', authMiddleware, (req, res) => {
  db.prepare('UPDATE inventory SET is_new = 0 WHERE id = ? AND user_id = ?').run(req.params.inventoryId, req.user.id);
  res.json({ ok: true });
});

// 즐겨찾기 토글
router.patch('/favorite/:inventoryId', authMiddleware, (req, res) => {
  const item = db.prepare('SELECT is_favorite FROM inventory WHERE id = ? AND user_id = ?').get(req.params.inventoryId, req.user.id);
  if (!item) return res.status(404).json({ error: '아이템을 찾을 수 없습니다' });

  db.prepare('UPDATE inventory SET is_favorite = ? WHERE id = ?').run(item.is_favorite ? 0 : 1, req.params.inventoryId);
  res.json({ ok: true, isFavorite: !item.is_favorite });
});

// 전체 유저 랭킹
router.get('/rankings', authMiddleware, (req, res) => {
  const rankings = db.prepare(`
    SELECT u.id, u.display_name, u.total_pulls,
           COUNT(DISTINCT i.character_id) as unique_count,
           COUNT(CASE WHEN c.rarity = 'SSR' THEN 1 END) as ssr_count
    FROM users u
    LEFT JOIN inventory i ON u.id = i.user_id
    LEFT JOIN characters c ON i.character_id = c.id
    GROUP BY u.id
    ORDER BY unique_count DESC, ssr_count DESC
  `).all();

  res.json({ rankings });
});

module.exports = router;
