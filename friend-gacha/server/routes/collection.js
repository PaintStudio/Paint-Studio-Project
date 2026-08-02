const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { calcStats } = require('../battle');
const itemDefs = require('../../data/items');
const hotRequire = require('../hotRequire');

const gameConfig = require('../../gameConfig.json');
const PROMO_CFG = gameConfig.growth.promotion || {};

const loadTalents = () => hotRequire('talents');
const loadPromotions = () => hotRequire('promotions');
const loadLore = () => hotRequire('lore');
function calcMaxLevel(rarity, promotion) {
  const base = gameConfig.growth.maxLevels[rarity] || 40;
  return base + (promotion || 0) * (PROMO_CFG.levelBonusPerTier || 10);
}

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

// 도감 (전체 캐릭터 + 만렙 기준 정보)
router.get('/codex', authMiddleware, (req, res) => {
  const allChars = db.prepare(`
    SELECT id, name, rarity, element, origin, title, description, quote,
           base_hp, base_atk, base_def, base_spd, turn_notes,
           image_url, image_bust, image_sd, image_ld,
           attack_slots, defense_slots
    FROM characters WHERE is_released = 1
    ORDER BY CASE rarity WHEN 'CR' THEN 0 WHEN 'SSR' THEN 1 WHEN 'SR' THEN 2 WHEN 'R' THEN 3 ELSE 4 END, name
  `).all();

  const ownedSet = new Set(
    db.prepare('SELECT DISTINCT character_id FROM inventory WHERE user_id = ?')
      .all(req.user.id).map(r => r.character_id)
  );

  const promoMap = {};
  db.prepare('SELECT character_id, MAX(promotion) as max_promo FROM inventory WHERE user_id = ? GROUP BY character_id')
    .all(req.user.id).forEach(r => { promoMap[r.character_id] = r.max_promo || 0; });

  const talentData = loadTalents();
  const promoData = loadPromotions();
  const loreData = loadLore();

  const characters = allChars.map(c => {
    const maxPromotion = (promoData[c.id]?.tiers || []).length;
    const tiers = promoData[c.id]?.tiers || [];
    const statPresets = [];
    const baseNotes = c.turn_notes;
    statPresets.push({ label: 'Lv.1', stats: calcStats(c, 1, 0, 0), turnNotes: baseNotes });
    for (let p = 0; p <= maxPromotion; p++) {
      const ml = calcMaxLevel(c.rarity, p);
      const label = p === 0 ? `Lv.${ml}` : `승급${p} Lv.${ml}`;
      let bonusNotes = 0;
      for (let i = 0; i < p; i++) bonusNotes += (tiers[i]?.bonusNotes || 0);
      const turnNotes = baseNotes + Math.floor(ml / 10) + bonusNotes;
      statPresets.push({ label, stats: calcStats(c, ml, 0, p), turnNotes });
    }
    const maxLevel = calcMaxLevel(c.rarity, 0);
    const stats = statPresets[1]?.stats || calcStats(c, maxLevel, 0, 0);

    const skills = db.prepare(`
      SELECT s.id, s.name, s.description, s.type, s.cost, s.power, s.element, s.target,
             s.defense_mult, s.cooldown, cs.is_default, cs.is_fixed, cs.awakening_required
      FROM character_skills cs JOIN skills s ON cs.skill_id = s.id
      WHERE cs.character_id = ?
      ORDER BY cs.is_default DESC, cs.awakening_required
    `).all(c.id);

    const talents = (talentData[c.id]?.talents || []).map((t, i) => ({
      index: i, name: t.name, desc: t.desc, flavor: t.flavor || '',
    }));

    const userPromo = promoMap[c.id] || 0;
    const loreEntries = (loreData[c.id]?.entries || []).map(e => ({
      title: e.title,
      content: e.content,
      unlock: e.unlock,
      unlocked: ownedSet.has(c.id) && userPromo >= e.unlock,
    }));

    return {
      id: c.id,
      name: c.name, rarity: c.rarity, element: c.element, origin: c.origin,
      title: c.title, description: c.description, quote: c.quote,
      imageUrl: c.image_url || '', imageBust: c.image_bust || '', imageSd: c.image_sd || '',
      turnNotes: c.turn_notes, maxLevel, maxPromotion, stats, statPresets,
      skills: skills.map(s => ({
        id: s.id, name: s.name, description: s.description,
        type: s.type, cost: s.cost, power: s.power, element: s.element,
        target: s.target, defense_mult: s.defense_mult, cooldown: s.cooldown || 0,
        isDefault: !!s.is_default, isFixed: !!s.is_fixed,
        awakeningRequired: s.awakening_required ?? 0,
      })),
      talents,
      lore: loreEntries,
      owned: ownedSet.has(c.id),
    };
  });

  const collected = characters.filter(c => c.owned).length;
  res.json({
    characters,
    completion: { total: characters.length, collected, rate: Math.round((collected / characters.length) * 100) },
  });
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
      flavor: def?.flavor || '',
      image: def?.image || '',
      icon: def?.icon || '',
      color: def?.color || null,
      effect: def?.effect || null,
    };
  });
  res.json({ items });
});

// 아이템 판매 (비활성화)
router.post('/items/sell', authMiddleware, (req, res) => {
  return res.status(400).json({ error: '판매 기능은 비활성화되었습니다' });
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
