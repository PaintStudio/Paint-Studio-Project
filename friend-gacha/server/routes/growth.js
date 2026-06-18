const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { calcStats } = require('../battle');

const gameConfig = require('../../gameConfig.json');
const router = express.Router();

const MAX_LEVELS = gameConfig.growth.maxLevels;

// 스킬 타입 → 슬롯 타입 매핑
const DEFENSE_SKILL_TYPES = ['defense'];
function getSlotTypeForSkill(skillType) {
  return DEFENSE_SKILL_TYPES.includes(skillType) ? 'defense' : 'attack';
}

// 각성에 따른 추가 슬롯 계산
function calcEffectiveSlots(base, awakening, slotType) {
  if (slotType === 'attack') return base + (awakening >= 3 ? 1 : 0);
  return base + (awakening >= 5 ? 1 : 0);
}

// 캐릭터 상세 정보
router.get('/detail/:inventoryId', authMiddleware, (req, res) => {
  const inv = db.prepare(`
    SELECT i.*, c.name, c.rarity, c.element, c.origin, c.title, c.description, c.quote,
           c.base_hp, c.base_atk, c.base_def, c.base_spd, c.turn_notes,
           c.image_url, c.image_bust, c.image_sd, c.image_ld,
           c.attack_slots, c.defense_slots
    FROM inventory i JOIN characters c ON i.character_id = c.id
    WHERE i.id = ? AND i.user_id = ?
  `).get(req.params.inventoryId, req.user.id);

  if (!inv) return res.status(404).json({ error: '캐릭터를 찾을 수 없습니다' });

  const maxLevel = (MAX_LEVELS[inv.rarity] || 40) + inv.awakening * 10;
  const stats = calcStats(inv, inv.level, inv.awakening);
  const nextLevelExp = inv.level * 100;

  const baseAtkSlots = inv.attack_slots ?? 3;
  const baseDefSlots = inv.defense_slots ?? 2;
  const effectiveAtkSlots = calcEffectiveSlots(baseAtkSlots, inv.awakening, 'attack');
  const effectiveDefSlots = calcEffectiveSlots(baseDefSlots, inv.awakening, 'defense');

  // 장착된 스킬 (slot_type, skill_inventory_id 포함)
  const equipped = db.prepare(`
    SELECT es.slot_number, es.slot_type, es.is_fixed, es.skill_inventory_id, s.*
    FROM equipped_skills es JOIN skills s ON es.skill_id = s.id
    WHERE es.inventory_id = ? ORDER BY es.slot_type, es.slot_number
  `).all(inv.id);

  // 캐릭터 고유 스킬 풀 (각성 부여 스킬만)
  const skillPool = db.prepare(`
    SELECT s.*, cs.awakening_required, cs.is_fixed FROM character_skills cs JOIN skills s ON cs.skill_id = s.id
    WHERE cs.character_id = ? AND cs.awakening_required >= 0
  `).all(inv.character_id);

  // 유저 스킬 인벤토리 (미장착 상태인 것만)
  const equippedInvIds = equipped.filter(e => e.skill_inventory_id).map(e => e.skill_inventory_id);
  const allUserSkillInv = db.prepare(`
    SELECT si.id as skill_inventory_id, si.obtained_from, s.*
    FROM skill_inventory si JOIN skills s ON si.skill_id = s.id
    WHERE si.user_id = ?
  `).all(req.user.id);
  // 다른 캐릭터에 장착된 것도 제외
  const allEquippedSiIds = db.prepare(`
    SELECT skill_inventory_id FROM equipped_skills WHERE skill_inventory_id IS NOT NULL
  `).all().map(r => r.skill_inventory_id);
  const freeSkillInv = allUserSkillInv.filter(si => !allEquippedSiIds.includes(si.skill_inventory_id));

  // 레거시 캐릭터: 초기화된 적 없으면 기본 스킬 세팅
  if (equipped.length === 0 && !inv.skills_initialized) {
    const { initCharacterSkills } = require('../db');
    initCharacterSkills(req.user.id, inv.id, inv.character_id);
    equipped.push(...db.prepare(`
      SELECT es.slot_number, es.slot_type, es.is_fixed, es.skill_inventory_id, s.*
      FROM equipped_skills es JOIN skills s ON es.skill_id = s.id
      WHERE es.inventory_id = ? ORDER BY es.slot_type, es.slot_number
    `).all(inv.id));
  }

  const attackEquipped = equipped.filter(s => s.slot_type === 'attack');
  const defenseEquipped = equipped.filter(s => s.slot_type === 'defense');

  const mapSkill = (s) => ({
    id: s.id, slot: s.slot_number, slotType: s.slot_type,
    name: s.name, description: s.description,
    type: s.type, cost: s.cost, power: s.power, element: s.element,
    target: s.target, defense_mult: s.defense_mult,
    isFixed: !!s.is_fixed,
    skillInventoryId: s.skill_inventory_id || null,
    extra: typeof s.extra === 'string' ? JSON.parse(s.extra || '{}') : (s.extra || {}),
  });

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
    attackSlots: { total: effectiveAtkSlots, skills: attackEquipped.map(mapSkill) },
    defenseSlots: { total: effectiveDefSlots, skills: defenseEquipped.map(mapSkill) },
    // 하위호환용
    equippedSkills: [...attackEquipped, ...defenseEquipped].map(mapSkill),
    skillPool: skillPool.map(s => ({
      id: s.id, name: s.name, description: s.description,
      type: s.type, cost: s.cost, power: s.power, element: s.element,
      target: s.target, defense_mult: s.defense_mult,
      awakeningRequired: s.awakening_required ?? 0,
      isFixed: !!s.is_fixed,
      slotType: getSlotTypeForSkill(s.type),
      source: 'character',
      extra: typeof s.extra === 'string' ? JSON.parse(s.extra || '{}') : (s.extra || {}),
    })),
    skillInventory: freeSkillInv.map(s => ({
      id: s.id, skillInventoryId: s.skill_inventory_id,
      name: s.name, description: s.description,
      type: s.type, cost: s.cost, power: s.power, element: s.element,
      target: s.target, defense_mult: s.defense_mult,
      slotType: getSlotTypeForSkill(s.type),
      source: 'inventory', obtainedFrom: s.obtained_from,
      extra: typeof s.extra === 'string' ? JSON.parse(s.extra || '{}') : (s.extra || {}),
    })),
  });
});

// 스킬 장착
router.post('/equip-skill', authMiddleware, (req, res) => {
  const { inventoryId, skillId, slotNumber, slotType, skillInventoryId } = req.body;

  const inv = db.prepare(`
    SELECT i.*, c.id as char_id, c.attack_slots, c.defense_slots
    FROM inventory i JOIN characters c ON i.character_id = c.id
    WHERE i.id = ? AND i.user_id = ?
  `).get(inventoryId, req.user.id);
  if (!inv) return res.status(404).json({ error: '캐릭터를 찾을 수 없습니다' });

  let skill;
  let resolvedSiId = null;

  if (skillInventoryId) {
    // 스킬 인벤토리에서 장착 (아무 캐릭터에나 가능)
    const siItem = db.prepare(`
      SELECT si.id as si_id, si.skill_id, s.* FROM skill_inventory si JOIN skills s ON si.skill_id = s.id
      WHERE si.id = ? AND si.user_id = ?
    `).get(skillInventoryId, req.user.id);
    if (!siItem) return res.status(404).json({ error: '스킬 인벤토리 아이템을 찾을 수 없습니다' });

    // 이미 다른 곳에 장착되어 있는지 확인
    const alreadyEquipped = db.prepare('SELECT inventory_id FROM equipped_skills WHERE skill_inventory_id = ?').get(skillInventoryId);
    if (alreadyEquipped) return res.status(400).json({ error: '이미 다른 캐릭터에 장착된 스킬입니다' });

    // 장착 조건 체크
    const { checkEquipCondition } = require('../db');
    const charInfo = db.prepare('SELECT element, origin, rarity FROM characters WHERE id = ?').get(inv.char_id);
    if (!checkEquipCondition(siItem.equip_condition, charInfo)) {
      return res.status(400).json({ error: '이 캐릭터는 장착 조건을 충족하지 않습니다' });
    }

    skill = siItem;
    resolvedSiId = skillInventoryId;
  } else {
    // 캐릭터 고유 스킬 풀에서 장착 → skill_inventory 생성
    skill = db.prepare('SELECT s.* FROM character_skills cs JOIN skills s ON cs.skill_id = s.id WHERE cs.character_id = ? AND cs.skill_id = ?')
      .get(inv.char_id, skillId);
    if (!skill) return res.status(400).json({ error: '이 캐릭터가 배울 수 없는 스킬입니다' });
    const si = db.prepare('INSERT INTO skill_inventory (user_id, skill_id, obtained_from) VALUES (?, ?, ?)')
      .run(req.user.id, skillId, 'character');
    resolvedSiId = si.lastInsertRowid;
  }

  // 슬롯 타입 결정
  const resolvedSlotType = slotType || getSlotTypeForSkill(skill.type);
  const expectedSlotType = getSlotTypeForSkill(skill.type);
  if (resolvedSlotType !== expectedSlotType) {
    return res.status(400).json({ error: `이 스킬은 ${expectedSlotType === 'attack' ? '공격' : '방어'} 슬롯에만 장착할 수 있습니다` });
  }

  // 같은 스킬 중복 장착 방지
  const dupeCheck = db.prepare('SELECT 1 FROM equipped_skills WHERE inventory_id = ? AND skill_id = ?')
    .get(inventoryId, skill.id);
  if (dupeCheck) return res.status(400).json({ error: '이미 장착된 스킬입니다' });

  // 슬롯 수 제한 체크
  const baseSlots = resolvedSlotType === 'attack' ? (inv.attack_slots ?? 3) : (inv.defense_slots ?? 2);
  const maxSlots = calcEffectiveSlots(baseSlots, inv.awakening, resolvedSlotType);
  if (slotNumber >= maxSlots) {
    return res.status(400).json({ error: '슬롯이 가득 찼습니다' });
  }

  // 해당 슬롯에 고정 스킬이 있는지 확인
  const existing = db.prepare('SELECT is_fixed, skill_id, skill_inventory_id FROM equipped_skills WHERE inventory_id = ? AND slot_type = ? AND slot_number = ?')
    .get(inventoryId, resolvedSlotType, slotNumber);
  if (existing && existing.is_fixed) {
    return res.status(400).json({ error: '고정 스킬은 교체할 수 없습니다' });
  }

  // 기존 슬롯의 스킬이 skill_inventory_id 없으면 인벤토리로 이동 (레거시 호환)
  if (existing && !existing.skill_inventory_id) {
    db.prepare('INSERT INTO skill_inventory (user_id, skill_id, obtained_from) VALUES (?, ?, ?)')
      .run(req.user.id, existing.skill_id, 'character');
  }

  // 슬롯에 장착 (기존 슬롯 덮어쓰기)
  db.prepare('DELETE FROM equipped_skills WHERE inventory_id = ? AND slot_type = ? AND slot_number = ?')
    .run(inventoryId, resolvedSlotType, slotNumber);
  db.prepare('INSERT INTO equipped_skills (inventory_id, skill_id, slot_number, slot_type, skill_inventory_id) VALUES (?, ?, ?, ?, ?)')
    .run(inventoryId, skill.id, slotNumber, resolvedSlotType, resolvedSiId);

  res.json({ success: true });
});

// 스킬 해제
router.post('/unequip-skill', authMiddleware, (req, res) => {
  const { inventoryId, slotNumber, slotType } = req.body;
  const resolvedSlotType = slotType || 'attack';

  // 소유권 확인
  const inv = db.prepare('SELECT user_id FROM inventory WHERE id = ?').get(inventoryId);
  if (!inv || inv.user_id !== req.user.id) return res.status(404).json({ error: '캐릭터를 찾을 수 없습니다' });

  const existing = db.prepare('SELECT is_fixed, skill_id, skill_inventory_id FROM equipped_skills WHERE inventory_id = ? AND slot_type = ? AND slot_number = ?')
    .get(inventoryId, resolvedSlotType, slotNumber);
  if (!existing) return res.json({ success: true });
  if (existing.is_fixed) return res.status(400).json({ error: '고정 스킬은 해제할 수 없습니다' });

  // skill_inventory_id가 없으면 인벤토리에 추가 (레거시 호환)
  if (!existing.skill_inventory_id) {
    db.prepare('INSERT INTO skill_inventory (user_id, skill_id, obtained_from) VALUES (?, ?, ?)')
      .run(req.user.id, existing.skill_id, 'character');
  }

  db.prepare('DELETE FROM equipped_skills WHERE inventory_id = ? AND slot_type = ? AND slot_number = ?')
    .run(inventoryId, resolvedSlotType, slotNumber);
  res.json({ success: true });
});

// 스킬 일괄 장착 (편의용)
router.post('/equip-skills-bulk', authMiddleware, (req, res) => {
  const { inventoryId, skillIds } = req.body;

  const inv = db.prepare(`
    SELECT i.*, c.id as char_id FROM inventory i JOIN characters c ON i.character_id = c.id
    WHERE i.id = ? AND i.user_id = ?
  `).get(inventoryId, req.user.id);
  if (!inv) return res.status(404).json({ error: '캐릭터를 찾을 수 없습니다' });

  const doEquip = db.transaction(() => {
    // 고정 스킬은 유지
    db.prepare('DELETE FROM equipped_skills WHERE inventory_id = ? AND is_fixed = 0').run(inventoryId);
    let atkSlot = 0, defSlot = 0;
    // 기존 고정 스킬의 슬롯 번호 이후부터 시작
    const fixedAtk = db.prepare("SELECT MAX(slot_number) as mx FROM equipped_skills WHERE inventory_id = ? AND slot_type = 'attack' AND is_fixed = 1").get(inventoryId);
    const fixedDef = db.prepare("SELECT MAX(slot_number) as mx FROM equipped_skills WHERE inventory_id = ? AND slot_type = 'defense' AND is_fixed = 1").get(inventoryId);
    if (fixedAtk && fixedAtk.mx !== null) atkSlot = fixedAtk.mx + 1;
    if (fixedDef && fixedDef.mx !== null) defSlot = fixedDef.mx + 1;

    for (const skillId of skillIds) {
      const skill = db.prepare('SELECT s.type FROM character_skills cs JOIN skills s ON cs.skill_id = s.id WHERE cs.character_id = ? AND cs.skill_id = ?')
        .get(inv.char_id, skillId);
      if (skill) {
        const st = getSlotTypeForSkill(skill.type);
        const slotNum = st === 'attack' ? atkSlot++ : defSlot++;
        db.prepare('INSERT INTO equipped_skills (inventory_id, skill_id, slot_number, slot_type) VALUES (?, ?, ?, ?)')
          .run(inventoryId, skillId, slotNum, st);
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

  const newAwakening = target.awakening + 1;
  const { grantAwakeningSkills } = require('../db');
  const grantedSkills = grantAwakeningSkills(req.user.id, inventoryId, target.character_id, newAwakening);

  res.json({
    awakening: newAwakening,
    maxLevel: (MAX_LEVELS[target.rarity] || 40) + newAwakening * 10,
    goldSpent: goldCost,
    grantedSkills,
  });
});

// 스킬 인벤토리 목록
router.get('/skill-inventory', authMiddleware, (req, res) => {
  const items = db.prepare(`
    SELECT si.id as skill_inventory_id, si.obtained_from, si.obtained_at, s.*
    FROM skill_inventory si JOIN skills s ON si.skill_id = s.id
    WHERE si.user_id = ?
    ORDER BY si.obtained_at DESC
  `).all(req.user.id);

  // 장착 중인 것 표시
  const equippedMap = {};
  const equippedRows = db.prepare(`
    SELECT es.skill_inventory_id, es.inventory_id, c.name as char_name
    FROM equipped_skills es
    JOIN inventory i ON es.inventory_id = i.id
    JOIN characters c ON i.character_id = c.id
    WHERE es.skill_inventory_id IS NOT NULL AND i.user_id = ?
  `).all(req.user.id);
  for (const r of equippedRows) equippedMap[r.skill_inventory_id] = r.char_name;

  res.json({
    skills: items.map(s => ({
      skillInventoryId: s.skill_inventory_id,
      id: s.id, name: s.name, description: s.description,
      type: s.type, cost: s.cost, power: s.power, element: s.element,
      target: s.target, defense_mult: s.defense_mult,
      rarity: s.rarity, obtainedFrom: s.obtained_from,
      slotType: getSlotTypeForSkill(s.type),
      equippedOn: equippedMap[s.skill_inventory_id] || null,
      extra: typeof s.extra === 'string' ? JSON.parse(s.extra || '{}') : (s.extra || {}),
    })),
  });
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
