const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { createUnit, createBattleSetup, validateBattleResult } = require('../battle');
const { refreshStamina, addAccountExp } = require('./stage');
const itemDefs = require('../../data/items');

const router = express.Router();

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

function isOpenToday(stage) {
  if (stage.always_open) return true;
  if (!stage.open_days) return true;
  const days = JSON.parse(stage.open_days);
  if (!Array.isArray(days) || days.length === 0) return true;
  const today = new Date().getDay();
  return days.includes(today);
}

function checkUnlockCondition(userId, condition) {
  if (!condition) return true;
  let cond;
  try { cond = typeof condition === 'string' ? JSON.parse(condition) : condition; } catch { return true; }
  if (cond.type === 'stage_clear') {
    const clear = db.prepare('SELECT stars FROM stage_clears WHERE user_id = ? AND stage_id = ?').get(userId, cond.stageId);
    return clear && clear.stars > 0;
  }
  if (cond.type === 'user_level') {
    const user = db.prepare('SELECT level FROM users WHERE id = ?').get(userId);
    return (user?.level || 1) >= cond.level;
  }
  return true;
}

function serializeStage(s) {
  return {
    id: s.id,
    name: s.name,
    type: s.type || 'farming',
    difficulty: s.difficulty,
    staminaCost: s.stamina_cost,
    recommendedLevel: s.recommended_level,
    rewards: JSON.parse(s.rewards || '{}'),
    enemyData: JSON.parse(s.enemy_data || '[]'),
    openDays: s.open_days ? JSON.parse(s.open_days) : null,
    alwaysOpen: !!s.always_open,
    unlockCondition: s.unlock_condition ? JSON.parse(s.unlock_condition) : null,
    dungeonGroup: s.dungeon_group,
    description: s.description,
    icon: s.icon,
  };
}

router.get('/list', authMiddleware, (req, res) => {
  const stages = db.prepare(`
    SELECT * FROM stages WHERE type IN ('farming', 'event')
    ORDER BY dungeon_group, difficulty, recommended_level
  `).all();

  const grouped = {};
  for (const s of stages) {
    const stage = serializeStage(s);
    stage.open = isOpenToday(s);
    stage.unlocked = checkUnlockCondition(req.user.id, s.unlock_condition);

    const group = s.dungeon_group || s.name;
    if (!grouped[group]) {
      grouped[group] = {
        group,
        label: group,
        type: s.type,
        description: s.description,
        icon: s.icon,
        stages: [],
      };
    }
    grouped[group].stages.push(stage);
  }

  res.json({ dungeons: Object.values(grouped) });
});

router.post('/battle-start', authMiddleware, (req, res) => {
  const { stageId, partyIds } = req.body;

  if (!partyIds || partyIds.length === 0 || partyIds.length > 3) {
    return res.status(400).json({ error: '파티는 1~3명으로 편성하세요' });
  }

  const stage = db.prepare('SELECT * FROM stages WHERE id = ?').get(stageId);
  if (!stage) return res.status(404).json({ error: '스테이지를 찾을 수 없습니다' });
  if (!isOpenToday(stage)) return res.status(400).json({ error: '오늘은 개방되지 않은 던전입니다' });
  if (!checkUnlockCondition(req.user.id, stage.unlock_condition)) {
    return res.status(400).json({ error: '해금 조건을 충족하지 못했습니다' });
  }

  refreshStamina(req.user.id);
  const user = db.prepare('SELECT stamina FROM users WHERE id = ?').get(req.user.id);
  if (user.stamina < stage.stamina_cost) {
    return res.status(400).json({ error: '스태미나가 부족합니다', need: stage.stamina_cost, have: user.stamina });
  }
  db.prepare('UPDATE users SET stamina = stamina - ? WHERE id = ?').run(stage.stamina_cost, req.user.id);

  const partyUnits = [];
  for (const invId of partyIds) {
    const inv = db.prepare(`
      SELECT i.*, c.name, c.rarity, c.element, c.origin, c.title, c.base_hp, c.base_atk, c.base_def, c.base_spd, c.turn_notes, c.image_url, c.image_sd
      FROM inventory i JOIN characters c ON i.character_id = c.id
      WHERE i.id = ? AND i.user_id = ?
    `).get(invId, req.user.id);
    if (!inv) return res.status(400).json({ error: `인벤토리 #${invId}를 찾을 수 없습니다` });

    const equipped = db.prepare(`
      SELECT s.* FROM equipped_skills es JOIN skills s ON es.skill_id = s.id
      WHERE es.inventory_id = ? ORDER BY es.slot_number
    `).all(invId);
    let skills = equipped;
    if (skills.length === 0) {
      skills = db.prepare(`
        SELECT s.* FROM character_skills cs JOIN skills s ON cs.skill_id = s.id
        WHERE cs.character_id = ? AND cs.is_default = 1
      `).all(inv.character_id);
    }

    const talentData = require('../../data/talents');
    const charTalents = talentData[inv.character_id];
    const equippedTalentIdx = inv.equipped_talent ?? 0;
    const activeTalent = charTalents?.talents?.[equippedTalentIdx] || null;

    const unit = createUnit(inv, inv.level, inv.awakening, false, skills, activeTalent, inv.promotion || 0);
    unit.characterId = inv.character_id;
    partyUnits.push(unit);
  }

  const tagCounts = {};
  for (const u of partyUnits) {
    const tags = db.prepare('SELECT t.id, t.label FROM character_tags ct JOIN tags t ON ct.tag_id = t.id WHERE ct.character_id = ?').all(u.characterId);
    u.tags = tags.map(t => ({ id: t.id, label: t.label }));
    for (const t of tags) tagCounts[t.id] = (tagCounts[t.id] || 0) + 1;
  }

  const enemyData = JSON.parse(stage.enemy_data || '[]');
  const enemyUnits = enemyData.map((e, idx) => {
    const monRow = db.prepare('SELECT * FROM monsters WHERE id = ?').get(e.monsterId || e.id);
    if (!monRow) return null;
    const scale = e.level_scale || 1.0;
    const data = {
      id: `farming_${idx}`,
      name: e.name_override || e.name || monRow.name,
      element: monRow.element,
      origin: monRow.origin,
      hp: Math.round(monRow.hp * scale),
      atk: Math.round(monRow.atk * scale),
      def: Math.round(monRow.def * scale),
      spd: Math.round(monRow.spd * scale),
      turn_notes: monRow.turn_notes,
      isBoss: !!monRow.is_boss,
      image_sd: monRow.image_sd || null,
      skills: JSON.parse(monRow.skills || '[]'),
    };
    const unit = createUnit(data, 1, 0, true, data.skills, null, 0);
    unit._monsterId = monRow.id;
    return unit;
  }).filter(Boolean);

  const setup = createBattleSetup(partyUnits, enemyUnits, tagCounts);
  setup.stageId = stage.id;

  const updatedUser = db.prepare('SELECT stamina, gold, currency FROM users WHERE id = ?').get(req.user.id);
  res.json({ setup, user: updatedUser });
});

router.post('/battle-end', authMiddleware, (req, res) => {
  const { stageId, battleLog } = req.body;

  if (!validateBattleResult(battleLog, 4, 4)) {
    return res.status(400).json({ error: '잘못된 전투 결과입니다' });
  }

  const stage = db.prepare('SELECT * FROM stages WHERE id = ?').get(stageId);
  if (!stage) return res.status(400).json({ error: '존재하지 않는 스테이지입니다' });

  let earnedRewards = null;

  if (battleLog.result === 'victory') {
    const rewards = JSON.parse(stage.rewards || '{}');
    earnedRewards = { gold: rewards.gold || 0 };
    if (rewards.gold) {
      db.prepare('UPDATE users SET gold = gold + ? WHERE id = ?').run(rewards.gold, req.user.id);
    }

    const enemyData = JSON.parse(stage.enemy_data || '[]');
    const droppedItems = [];
    for (const enemy of enemyData) {
      const monRow = db.prepare('SELECT drops FROM monsters WHERE id = ?').get(enemy.monsterId || enemy.id);
      if (!monRow) continue;
      const drops = JSON.parse(monRow.drops || '[]');
      for (const drop of drops) {
        if (Math.random() < (drop.rate || 0)) {
          const qty = drop.quantity || 1;
          if (!itemDefs[drop.itemId]) continue;
          db.prepare(`INSERT INTO user_items (user_id, item_id, quantity) VALUES (?, ?, ?)
            ON CONFLICT(user_id, item_id) DO UPDATE SET quantity = quantity + ?`)
            .run(req.user.id, drop.itemId, qty, qty);
          const existing = droppedItems.find(d => d.itemId === drop.itemId);
          if (existing) {
            existing.quantity += qty;
          } else {
            const def = itemDefs[drop.itemId];
            droppedItems.push({ itemId: drop.itemId, name: def.name, quantity: qty, rarity: def.rarity || 'N' });
          }
        }
      }
    }
    earnedRewards.items = droppedItems;

    const accExp = rewards.exp || 15;
    addAccountExp(req.user.id, accExp);
    earnedRewards.accountExp = accExp;
  }

  const updatedUser = db.prepare('SELECT stamina, gold, currency, account_level, account_exp FROM users WHERE id = ?').get(req.user.id);
  res.json({ rewards: earnedRewards, user: updatedUser });
});

module.exports = router;
