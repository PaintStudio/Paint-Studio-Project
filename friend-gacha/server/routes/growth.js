const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { calcStats } = require('../battle');

const gameConfig = require('../../gameConfig.json');
const router = express.Router();

const MAX_LEVELS = gameConfig.growth.maxLevels;

// 캐릭터 상세 정보
router.get('/detail/:inventoryId', authMiddleware, (req, res) => {
  const inv = db.prepare(`
    SELECT i.*, c.name, c.rarity, c.element, c.origin, c.title, c.description, c.quote,
           c.base_hp, c.base_atk, c.base_def, c.base_spd, c.turn_notes,
           c.image_url, c.image_bust, c.image_sd, c.image_ld
    FROM inventory i JOIN characters c ON i.character_id = c.id
    WHERE i.id = ? AND i.user_id = ?
  `).get(req.params.inventoryId, req.user.id);

  if (!inv) return res.status(404).json({ error: '캐릭터를 찾을 수 없습니다' });

  const maxLevel = (MAX_LEVELS[inv.rarity] || 40) + inv.awakening * 10;
  const stats = calcStats(inv, inv.level, inv.awakening);
  const nextLevelExp = inv.level * 100;

  // 장착된 스킬
  const equipped = db.prepare(`
    SELECT es.slot_number, s.* FROM equipped_skills es JOIN skills s ON es.skill_id = s.id
    WHERE es.inventory_id = ? ORDER BY es.slot_number
  `).all(inv.id);

  // 장착 가능한 스킬 풀
  const skillPool = db.prepare(`
    SELECT s.*, cs.is_default FROM character_skills cs JOIN skills s ON cs.skill_id = s.id
    WHERE cs.character_id = ?
  `).all(inv.character_id);

  // 장착 스킬 없으면 기본 스킬 표시
  let activeSkills = equipped;
  if (activeSkills.length === 0) {
    activeSkills = skillPool.filter(s => s.is_default).map((s, i) => ({ ...s, slot_number: i }));
  }

  res.json({
    inventoryId: inv.id,
    characterId: inv.character_id,
    name: inv.name, rarity: inv.rarity, element: inv.element, origin: inv.origin,
    title: inv.title, description: inv.description, quote: inv.quote,
    imageUrl: inv.image_url || '', imageBust: inv.image_bust || '', imageSd: inv.image_sd || '', imageLd: inv.image_ld || '',
    level: inv.level, maxLevel, exp: inv.exp, nextLevelExp,
    awakening: inv.awakening, maxAwakening: 5,
    turnNotes: inv.turn_notes,
    stats,
    equippedSkills: activeSkills.map(s => ({
      id: s.id, slot: s.slot_number, name: s.name, description: s.description,
      type: s.type, cost: s.cost, power: s.power, element: s.element,
      target: s.target, defense_mult: s.defense_mult,
      extra: typeof s.extra === 'string' ? JSON.parse(s.extra || '{}') : (s.extra || {}),
    })),
    skillPool: skillPool.map(s => ({
      id: s.id, name: s.name, description: s.description,
      type: s.type, cost: s.cost, power: s.power, element: s.element,
      target: s.target, defense_mult: s.defense_mult, isDefault: !!s.is_default,
      extra: typeof s.extra === 'string' ? JSON.parse(s.extra || '{}') : (s.extra || {}),
    })),
  });
});

// 스킬 장착
router.post('/equip-skill', authMiddleware, (req, res) => {
  const { inventoryId, skillId, slotNumber } = req.body;

  // 인벤토리 확인
  const inv = db.prepare(`
    SELECT i.*, c.id as char_id FROM inventory i JOIN characters c ON i.character_id = c.id
    WHERE i.id = ? AND i.user_id = ?
  `).get(inventoryId, req.user.id);
  if (!inv) return res.status(404).json({ error: '캐릭터를 찾을 수 없습니다' });

  // 스킬이 이 캐릭터가 배울 수 있는지 확인
  const canLearn = db.prepare('SELECT * FROM character_skills WHERE character_id = ? AND skill_id = ?')
    .get(inv.char_id, skillId);
  if (!canLearn) return res.status(400).json({ error: '이 캐릭터가 배울 수 없는 스킬입니다' });

  // 슬롯에 장착 (기존 슬롯 덮어쓰기)
  db.prepare('DELETE FROM equipped_skills WHERE inventory_id = ? AND slot_number = ?')
    .run(inventoryId, slotNumber);
  db.prepare('INSERT INTO equipped_skills (inventory_id, skill_id, slot_number) VALUES (?, ?, ?)')
    .run(inventoryId, skillId, slotNumber);

  res.json({ success: true });
});

// 스킬 해제
router.post('/unequip-skill', authMiddleware, (req, res) => {
  const { inventoryId, slotNumber } = req.body;
  db.prepare('DELETE FROM equipped_skills WHERE inventory_id = ? AND slot_number = ?')
    .run(inventoryId, slotNumber);
  res.json({ success: true });
});

// 스킬 일괄 장착 (편의용)
router.post('/equip-skills-bulk', authMiddleware, (req, res) => {
  const { inventoryId, skillIds } = req.body; // skillIds: [skillId, skillId, ...]

  const inv = db.prepare(`
    SELECT i.*, c.id as char_id FROM inventory i JOIN characters c ON i.character_id = c.id
    WHERE i.id = ? AND i.user_id = ?
  `).get(inventoryId, req.user.id);
  if (!inv) return res.status(404).json({ error: '캐릭터를 찾을 수 없습니다' });

  const doEquip = db.transaction(() => {
    db.prepare('DELETE FROM equipped_skills WHERE inventory_id = ?').run(inventoryId);
    for (let i = 0; i < skillIds.length; i++) {
      const canLearn = db.prepare('SELECT * FROM character_skills WHERE character_id = ? AND skill_id = ?')
        .get(inv.char_id, skillIds[i]);
      if (canLearn) {
        db.prepare('INSERT INTO equipped_skills (inventory_id, skill_id, slot_number) VALUES (?, ?, ?)')
          .run(inventoryId, skillIds[i], i);
      }
    }
  });
  doEquip();

  res.json({ success: true });
});

// 레벨업
router.post('/levelup', authMiddleware, (req, res) => {
  const { inventoryId, amount } = req.body;
  const goldAmount = Math.min(amount || 1000, 10000);
  const expGain = goldAmount;

  const user = db.prepare('SELECT gold FROM users WHERE id = ?').get(req.user.id);
  if (user.gold < goldAmount) return res.status(400).json({ error: '골드가 부족합니다' });

  const inv = db.prepare(`
    SELECT i.*, c.rarity FROM inventory i JOIN characters c ON i.character_id = c.id
    WHERE i.id = ? AND i.user_id = ?
  `).get(inventoryId, req.user.id);
  if (!inv) return res.status(404).json({ error: '캐릭터를 찾을 수 없습니다' });

  const maxLevel = (MAX_LEVELS[inv.rarity] || 40) + inv.awakening * 10;
  if (inv.level >= maxLevel) return res.status(400).json({ error: '이미 최대 레벨입니다' });

  db.prepare('UPDATE users SET gold = gold - ? WHERE id = ?').run(goldAmount, req.user.id);

  let exp = inv.exp + expGain;
  let level = inv.level;
  while (level < maxLevel) {
    const needed = level * 100;
    if (exp >= needed) { exp -= needed; level++; } else break;
  }

  db.prepare('UPDATE inventory SET exp = ?, level = ? WHERE id = ?').run(exp, level, inventoryId);
  const updatedUser = db.prepare('SELECT gold FROM users WHERE id = ?').get(req.user.id);
  res.json({ level, exp, nextLevelExp: level * 100, levelsGained: level - inv.level, gold: updatedUser.gold });
});

// 각성
router.post('/awaken', authMiddleware, (req, res) => {
  const { inventoryId, materialId } = req.body;

  const target = db.prepare(`
    SELECT i.*, c.rarity, c.name FROM inventory i JOIN characters c ON i.character_id = c.id
    WHERE i.id = ? AND i.user_id = ?
  `).get(inventoryId, req.user.id);
  if (!target) return res.status(404).json({ error: '대상 캐릭터를 찾을 수 없습니다' });
  if (target.awakening >= 5) return res.status(400).json({ error: '이미 최대 각성입니다' });

  const material = db.prepare(`
    SELECT i.*, c.name FROM inventory i JOIN characters c ON i.character_id = c.id
    WHERE i.id = ? AND i.user_id = ?
  `).get(materialId, req.user.id);
  if (!material) return res.status(404).json({ error: '재료 캐릭터를 찾을 수 없습니다' });
  if (material.character_id !== target.character_id) return res.status(400).json({ error: '같은 캐릭터만 각성 재료로 사용할 수 있습니다' });
  if (materialId === inventoryId) return res.status(400).json({ error: '자기 자신은 재료로 사용할 수 없습니다' });

  const costs = [1000, 2000, 5000, 10000, 20000];
  const goldCost = costs[target.awakening] || 20000;
  const user = db.prepare('SELECT gold FROM users WHERE id = ?').get(req.user.id);
  if (user.gold < goldCost) return res.status(400).json({ error: `골드가 부족합니다 (필요: ${goldCost})` });

  const doAwaken = db.transaction(() => {
    db.prepare('UPDATE inventory SET awakening = awakening + 1 WHERE id = ?').run(inventoryId);
    db.prepare('DELETE FROM equipped_skills WHERE inventory_id = ?').run(materialId);
    db.prepare('DELETE FROM inventory WHERE id = ?').run(materialId);
    db.prepare('UPDATE users SET gold = gold - ? WHERE id = ?').run(goldCost, req.user.id);
  });
  doAwaken();

  res.json({ awakening: target.awakening + 1, maxLevel: (MAX_LEVELS[target.rarity] || 40) + (target.awakening + 1) * 10, goldSpent: goldCost });
});

// 파티 편성용 목록
router.get('/party-list', authMiddleware, (req, res) => {
  const items = db.prepare(`
    SELECT i.id as inventory_id, i.level, i.awakening, i.is_favorite,
           c.id as character_id, c.name, c.rarity, c.element, c.origin, c.title,
           c.base_hp, c.base_atk, c.base_def, c.base_spd, c.turn_notes,
           c.image_url, c.image_bust, c.image_sd, c.image_ld
    FROM inventory i JOIN characters c ON i.character_id = c.id
    WHERE i.user_id = ?
    ORDER BY
      CASE c.rarity WHEN 'CR' THEN 0 WHEN 'SSR' THEN 1 WHEN 'SR' THEN 2 WHEN 'R' THEN 3 ELSE 4 END,
      i.level DESC
  `).all(req.user.id);

  const result = items.map(item => ({
    ...item,
    stats: calcStats(item, item.level, item.awakening),
  }));

  res.json({ characters: result });
});

// 대표 캐릭터 설정
router.post('/set-representative', authMiddleware, (req, res) => {
  const { inventoryId } = req.body;
  if (inventoryId) {
    const inv = db.prepare('SELECT id FROM inventory WHERE id = ? AND user_id = ?').get(inventoryId, req.user.id);
    if (!inv) return res.status(404).json({ error: '보유하지 않은 캐릭터입니다' });
  }
  db.prepare('UPDATE users SET representative_inventory_id = ? WHERE id = ?').run(inventoryId || null, req.user.id);
  res.json({ ok: true });
});

// 로비 데이터
router.get('/lobby', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  let representative = null;
  if (user.representative_inventory_id) {
    representative = db.prepare(`
      SELECT i.id as inventory_id, i.level, i.awakening,
             c.name, c.rarity, c.element, c.origin, c.title, c.quote,
             c.image_url, c.image_bust, c.image_sd, c.image_ld
      FROM inventory i JOIN characters c ON i.character_id = c.id
      WHERE i.id = ? AND i.user_id = ?
    `).get(user.representative_inventory_id, req.user.id);
  }

  // 대표 없으면 가장 높은 레어도 캐릭터 자동
  if (!representative) {
    representative = db.prepare(`
      SELECT i.id as inventory_id, i.level, i.awakening,
             c.name, c.rarity, c.element, c.origin, c.title, c.quote,
             c.image_url, c.image_bust, c.image_sd, c.image_ld
      FROM inventory i JOIN characters c ON i.character_id = c.id
      WHERE i.user_id = ?
      ORDER BY CASE c.rarity WHEN 'CR' THEN 0 WHEN 'SSR' THEN 1 WHEN 'SR' THEN 2 WHEN 'R' THEN 3 ELSE 4 END, i.level DESC
      LIMIT 1
    `).get(req.user.id);
  }

  // 미완료 미션 수
  const today = new Date().toISOString().split('T')[0];
  const pendingMissions = db.prepare('SELECT COUNT(*) as cnt FROM daily_missions WHERE user_id = ? AND date = ? AND is_completed = 0').get(req.user.id, today);

  // 교환 요청 수
  const pendingTrades = db.prepare('SELECT COUNT(*) as cnt FROM trades WHERE to_user_id = ? AND status = "pending"').get(req.user.id);

  res.json({
    user: {
      displayName: user.display_name,
      currency: user.currency,
      gold: user.gold,
      stamina: user.stamina,
    },
    representative,
    notifications: {
      pendingMissions: pendingMissions.cnt,
      pendingTrades: pendingTrades.cnt,
    },
  });
});

module.exports = router;
