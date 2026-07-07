const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const itemDefs = require('../../data/items');

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

// 아이템 인벤토리 조회
router.get('/items', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT item_id, quantity FROM user_items WHERE user_id = ? AND quantity > 0').all(req.user.id);
  const items = rows.map(row => {
    const def = itemDefs[row.item_id];
    return {
      itemId: row.item_id,
      quantity: row.quantity,
      name: def?.name || row.item_id,
      description: def?.description || '',
      category: def?.category || 'material',
      rarity: def?.rarity || 'N',
      sellPrice: def?.sellPrice || 0,
      image: def?.image || '',
      icon: def?.icon || '',
      color: def?.color || null,
      effect: def?.effect || null,
    };
  });
  res.json({ items });
});

// 아이템 판매
router.post('/items/sell', authMiddleware, (req, res) => {
  const { itemId, quantity } = req.body;
  if (!itemId || !quantity || quantity < 1) return res.status(400).json({ error: '잘못된 요청입니다' });

  const row = db.prepare('SELECT quantity FROM user_items WHERE user_id = ? AND item_id = ?').get(req.user.id, itemId);
  if (!row || row.quantity < quantity) return res.status(400).json({ error: '아이템이 부족합니다' });

  const def = itemDefs[itemId];
  if (!def) return res.status(400).json({ error: '존재하지 않는 아이템입니다' });

  const totalGold = def.sellPrice * quantity;
  db.prepare('UPDATE user_items SET quantity = quantity - ? WHERE user_id = ? AND item_id = ?').run(quantity, req.user.id, itemId);
  db.prepare('UPDATE users SET gold = gold + ? WHERE id = ?').run(totalGold, req.user.id);

  const user = db.prepare('SELECT gold FROM users WHERE id = ?').get(req.user.id);
  res.json({ sold: quantity, goldEarned: totalGold, gold: user.gold });
});

// 소모품 사용
router.post('/items/use', authMiddleware, (req, res) => {
  const { itemId, targetInventoryId } = req.body;
  if (!itemId) return res.status(400).json({ error: '잘못된 요청입니다' });

  const row = db.prepare('SELECT quantity FROM user_items WHERE user_id = ? AND item_id = ?').get(req.user.id, itemId);
  if (!row || row.quantity < 1) return res.status(400).json({ error: '아이템이 부족합니다' });

  const def = itemDefs[itemId];
  if (!def || def.category !== 'consumable' || !def.effect) return res.status(400).json({ error: '사용할 수 없는 아이템입니다' });

  const effect = def.effect;
  let result = {};

  if (effect.type === 'stamina') {
    const gameConf = require('../../gameConfig.json');
    const user = db.prepare('SELECT stamina FROM users WHERE id = ?').get(req.user.id);
    if (user.stamina >= gameConf.stamina.max) {
      return res.status(400).json({ error: '스태미나가 이미 최대치 이상입니다' });
    }
    db.prepare('UPDATE users SET stamina = stamina + ? WHERE id = ?').run(effect.value, req.user.id);
    const updated = db.prepare('SELECT stamina FROM users WHERE id = ?').get(req.user.id);
    result = { stamina: updated.stamina };
  } else if (effect.type === 'exp' && targetInventoryId) {
    const { addExp } = require('./stage');
    addExp(targetInventoryId, effect.value);
    const inv = db.prepare('SELECT level, exp FROM inventory WHERE id = ? AND user_id = ?').get(targetInventoryId, req.user.id);
    result = { level: inv?.level, exp: inv?.exp };
  } else {
    return res.status(400).json({ error: '사용 조건이 맞지 않습니다' });
  }

  db.prepare('UPDATE user_items SET quantity = quantity - 1 WHERE user_id = ? AND item_id = ?').run(req.user.id, itemId);
  res.json({ used: itemId, ...result });
});

module.exports = router;
