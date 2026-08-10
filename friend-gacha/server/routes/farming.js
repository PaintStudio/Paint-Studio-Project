const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { createUnit, createBattleSetup, validateBattleResult } = require('../battle');
const { buildPartyUnits, collectTagCounts, buildEnemyFromMonster, giveItem, processDrops } = require('../battleUtils');
const { deductStamina, addAccountExp, progressMission, progressKillMissions } = require('./stage');
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
  if (cond.type === 'farming_prev_clear') {
    const pattern = `${cond.baseName}%`;
    const prevStage = db.prepare('SELECT id FROM stages WHERE dungeon_group = ? AND difficulty = ? AND type = ? AND name LIKE ?')
      .get(cond.dungeonGroup, cond.prevDifficulty, 'farming', pattern);
    if (!prevStage) return true;
    const clear = db.prepare('SELECT stars FROM stage_clears WHERE user_id = ? AND stage_id = ?').get(userId, prevStage.id);
    return clear && clear.stars > 0;
  }
  if (cond.type === 'story_clear') {
    const clear = db.prepare('SELECT 1 FROM story_clears WHERE user_id = ? AND node_id = ?').get(userId, cond.nodeId);
    return !!clear;
  }
  if (cond.type === 'user_level') {
    const user = db.prepare('SELECT account_level FROM users WHERE id = ?').get(userId);
    return (user?.account_level || 1) >= cond.level;
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
    SELECT s.*, sc.stars as clear_stars FROM stages s
    LEFT JOIN stage_clears sc ON s.id = sc.stage_id AND sc.user_id = ?
    WHERE s.type IN ('farming', 'event', 'normal')
    ORDER BY s.dungeon_group, s.recommended_level, s.name
  `).all(req.user.id);

  const grouped = {};
  for (const s of stages) {
    const stage = serializeStage(s);
    stage.open = isOpenToday(s);
    stage.unlocked = checkUnlockCondition(req.user.id, s.unlock_condition);
    stage.cleared = !!(s.clear_stars && s.clear_stars > 0);

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

  const stamina = deductStamina(req.user.id, stage.stamina_cost);
  if (stamina.error) return res.status(400).json(stamina);

  const { units: partyUnits, error: partyError } = buildPartyUnits(req.user.id, partyIds);
  if (partyError) return res.status(400).json({ error: partyError });

  const tagCounts = collectTagCounts(partyUnits);

  const enemyData = JSON.parse(stage.enemy_data || '[]');
  const enemyUnits = enemyData.map((e, idx) => buildEnemyFromMonster(e, idx, 'farming')).filter(Boolean);

  const setup = createBattleSetup(partyUnits, enemyUnits, tagCounts);
  setup.stageId = stage.id;
  setup.stageName = stage.name;
  setup.bgClass = 'farming';
  if (stage.bg_image) setup.bgImage = `/uploads/bg/${stage.bg_image}`;
  if (stage.bgm) setup.bgm = stage.bgm;

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
    const existingClear = db.prepare('SELECT id FROM stage_clears WHERE user_id = ? AND stage_id = ?').get(req.user.id, stage.id);
    const isFirstClear = !existingClear;
    if (isFirstClear) {
      db.prepare('INSERT INTO stage_clears (user_id, stage_id, stars, best_turns) VALUES (?, ?, ?, ?)')
        .run(req.user.id, stage.id, 1, battleLog.totalTurns || 1);
    }

    const rewards = JSON.parse(stage.rewards || '{}');
    earnedRewards = { gold: rewards.gold || 0 };
    if (rewards.gold) {
      db.prepare('UPDATE users SET gold = gold + ? WHERE id = ?').run(rewards.gold, req.user.id);
    }

    if (isFirstClear && rewards.firstClear) {
      const fc = rewards.firstClear;
      earnedRewards.firstClear = {};
      if (fc.prism) {
        db.prepare('UPDATE users SET currency = currency + ? WHERE id = ?').run(fc.prism, req.user.id);
        earnedRewards.firstClear.prism = fc.prism;
      }
      if (fc.items && Array.isArray(fc.items)) {
        earnedRewards.firstClear.items = [];
        for (const it of fc.items) {
          if (!itemDefs[it.itemId]) continue;
          const qty = it.quantity || 1;
          giveItem(req.user.id, it.itemId, qty);
          const def = itemDefs[it.itemId];
          earnedRewards.firstClear.items.push({ itemId: it.itemId, name: def.name, quantity: qty });
        }
      }
    }

    const enemyData = JSON.parse(stage.enemy_data || '[]');
    progressMission(req.user.id, 'battle', 1);
    progressKillMissions(req.user.id, enemyData);
    earnedRewards.items = processDrops(req.user.id, enemyData);

    const accExp = rewards.exp || 15;
    addAccountExp(req.user.id, accExp);
    earnedRewards.accountExp = accExp;
  }

  const updatedUser = db.prepare('SELECT stamina, gold, currency, account_level, account_exp FROM users WHERE id = ?').get(req.user.id);
  res.json({ rewards: earnedRewards, user: updatedUser });
});

module.exports = router;
