const express = require('express');
const db = require('../db');
const { userLog } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { createUnit, createBattleSetup, validateBattleResult, calcStats } = require('../battle');
const { buildPartyUnits, collectTagCounts, giveItem, processDrops } = require('../battleUtils');
const gameConfig = require('../../gameConfig.json');
const itemDefs = require('../../data/items');

const router = express.Router();

// 스테이지 목록
router.get('/list', authMiddleware, (req, res) => {
  const stages = db.prepare(`
    SELECT s.*, sc.stars, sc.best_turns
    FROM stages s
    LEFT JOIN stage_clears sc ON s.id = sc.stage_id AND sc.user_id = ?
    WHERE COALESCE(s.type, 'story') = 'story'
    ORDER BY s.chapter, s.stage_number
  `).all(req.user.id);

  const chapters = {};
  for (const s of stages) {
    if (!chapters[s.chapter]) chapters[s.chapter] = [];
    const prev = chapters[s.chapter].length > 0 ? chapters[s.chapter][chapters[s.chapter].length - 1] : null;
    const prevChapterCleared = s.chapter === 1 || (chapters[s.chapter - 1]?.every(st => st.stars > 0));
    const unlocked = s.stage_number === 1
      ? (s.chapter === 1 || prevChapterCleared)
      : (prev && prev.stars > 0);

    chapters[s.chapter].push({
      id: s.id, chapter: s.chapter, stageNumber: s.stage_number, name: s.name,
      difficulty: s.difficulty, staminaCost: s.stamina_cost, recommendedLevel: s.recommended_level,
      stars: s.stars || 0, bestTurns: s.best_turns, unlocked,
      rewards: JSON.parse(s.rewards),
    });
  }

  res.json({ chapters });
});

// 전투 시작 - 셋업 정보 반환 (클라이언트에서 인터랙티브 전투)
router.post('/battle-start', authMiddleware, (req, res) => {
  const { stageId, partyIds } = req.body;

  if (!partyIds || partyIds.length === 0 || partyIds.length > 3) {
    return res.status(400).json({ error: '파티는 1~3명으로 편성하세요' });
  }

  const stage = db.prepare('SELECT * FROM stages WHERE id = ?').get(stageId);
  if (!stage) return res.status(404).json({ error: '스테이지를 찾을 수 없습니다' });

  const stamina = deductStamina(req.user.id, stage.stamina_cost);
  if (stamina.error) return res.status(400).json(stamina);

  const { units: partyUnits, error: partyError } = buildPartyUnits(req.user.id, partyIds);
  if (partyError) return res.status(400).json({ error: partyError });

  const tagCounts = collectTagCounts(partyUnits);

  // 적 유닛 생성
  const enemies = JSON.parse(stage.enemy_data);
  const enemyUnits = enemies.map((e, idx) => {
    const unit = createUnit({ ...e, id: `enemy_${idx}` }, 1, 0, true, e.skills || [], e.talent || null, 0);
    if (e.monsterId) {
      const eTags = db.prepare('SELECT t.id, t.label FROM monster_tags mt JOIN tags t ON mt.tag_id = t.id WHERE mt.monster_id = ?').all(e.monsterId);
      unit.tags = eTags.map(t => ({ id: t.id, label: t.label }));
    }
    return unit;
  });

  const setup = createBattleSetup(partyUnits, enemyUnits, tagCounts);
  setup.stageId = stageId;
  setup.chapter = stage.chapter;
  setup.stageName = stage.name;
  setup.rewards = JSON.parse(stage.rewards);
  if (stage.max_cycles) setup.maxCycles = stage.max_cycles;
  if (stage.bg_image) setup.bgImage = `/uploads/bg/${stage.bg_image}`;
  if (stage.bgm) setup.bgm = stage.bgm;
  if (stage.story_script) {
    try { setup.storyScript = JSON.parse(stage.story_script); } catch {}
  }

  userLog(req.user.id, 'stage_enter', { stageId, stageName: stage.name, chapter: stage.chapter, staminaCost: stage.stamina_cost });

  const updatedUser = db.prepare('SELECT stamina, gold, currency FROM users WHERE id = ?').get(req.user.id);
  res.json({ setup, user: updatedUser });
});

// 전투 결과 제출
router.post('/battle-end', authMiddleware, (req, res) => {
  try {
  const { stageId, battleLog } = req.body;

  if (!validateBattleResult(battleLog, 4, 4)) {
    return res.status(400).json({ error: '잘못된 전투 결과입니다' });
  }

  const stage = db.prepare('SELECT * FROM stages WHERE id = ?').get(stageId);
  if (!stage) return res.status(404).json({ error: '스테이지를 찾을 수 없습니다' });

  const rewards = JSON.parse(stage.rewards);
  let earnedRewards = null;

  if (battleLog.result === 'victory') {
    // 별 계산: 아군 전원 생존 + 턴 사이클 15 이하 = 3★
    const stars = battleLog.allSurvived && battleLog.turnCycles <= 15 ? 3
      : battleLog.allSurvived ? 2 : 1;

    earnedRewards = { gold: rewards.gold, stars };

    const existing = db.prepare('SELECT * FROM stage_clears WHERE user_id = ? AND stage_id = ?').get(req.user.id, stageId);
    if (!existing) {
      earnedRewards.diamond = rewards.first_clear_diamond;
      db.prepare('UPDATE users SET currency = currency + ? WHERE id = ?').run(rewards.first_clear_diamond, req.user.id);
      db.prepare('INSERT INTO stage_clears (user_id, stage_id, stars, best_turns) VALUES (?, ?, ?, ?)')
        .run(req.user.id, stageId, stars, battleLog.turnCycles);
    } else if (stars > existing.stars) {
      db.prepare('UPDATE stage_clears SET stars = ?, best_turns = MIN(best_turns, ?) WHERE user_id = ? AND stage_id = ?')
        .run(stars, battleLog.turnCycles, req.user.id, stageId);
    }

    db.prepare('UPDATE users SET gold = gold + ? WHERE id = ?').run(rewards.gold, req.user.id);

    progressMission(req.user.id, 'battle', 1);

    const accExp = rewards.exp || 20;
    addAccountExp(req.user.id, accExp);
    earnedRewards.accountExp = accExp;

    const enemies = JSON.parse(stage.enemy_data);
    earnedRewards.items = processDrops(req.user.id, enemies);
  }

  userLog(req.user.id, battleLog.result === 'victory' ? 'stage_clear' : 'stage_fail', { stageId, stageName: stage.name, result: battleLog.result, turns: battleLog.turnCycles, stars: earnedRewards?.stars });

  const updatedUser = db.prepare('SELECT stamina, gold, currency, account_level, account_exp FROM users WHERE id = ?').get(req.user.id);
  res.json({ rewards: earnedRewards, user: updatedUser });
  } catch (err) {
    console.error('[스테이지] battle-end 오류:', err.message);
    res.status(500).json({ error: '전투 결과 처리 중 오류가 발생했습니다' });
  }
});

function deductStamina(userId, cost) {
  refreshStamina(userId);
  const user = db.prepare('SELECT stamina FROM users WHERE id = ?').get(userId);
  if (user.stamina < cost) return { error: '스태미나가 부족합니다', need: cost, have: user.stamina };
  db.prepare('UPDATE users SET stamina = stamina - ? WHERE id = ?').run(cost, userId);
  return { ok: true };
}

function refreshStamina(userId) {
  const user = db.prepare('SELECT stamina, stamina_updated_at FROM users WHERE id = ?').get(userId);
  const now = Date.now();
  const lastUpdate = new Date(user.stamina_updated_at + 'Z').getTime();
  const elapsed = Math.floor((now - lastUpdate) / 1000 / 60);
  const recovered = Math.floor(elapsed / 5);
  if (recovered > 0 && user.stamina < gameConfig.stamina.max) {
    const newStamina = Math.min(gameConfig.stamina.max, user.stamina + recovered);
    db.prepare('UPDATE users SET stamina = ?, stamina_updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStamina, userId);
  }
}

function calcLevelUp(currentLevel, currentExp, addedExp, maxLevel) {
  let exp = currentExp + addedExp;
  let level = currentLevel;
  while (level < maxLevel) {
    const needed = level * level * 10 + level * 50;
    if (exp >= needed) { exp -= needed; level++; } else break;
  }
  if (level >= maxLevel) exp = 0;
  return { level, exp };
}

function addExp(inventoryId, amount) {
  const inv = db.prepare('SELECT i.*, c.rarity FROM inventory i JOIN characters c ON i.character_id = c.id WHERE i.id = ?').get(inventoryId);
  if (!inv) return;
  const maxLevel = (gameConfig.growth.maxLevels[inv.rarity] || 40);
  if (inv.level >= maxLevel) return;
  const { level, exp } = calcLevelUp(inv.level, inv.exp, amount, maxLevel);
  db.prepare('UPDATE inventory SET exp = ?, level = ? WHERE id = ?').run(exp, level, inventoryId);
}

function progressMission(userId, type, count) {
  const today = new Date().toISOString().split('T')[0];
  const mission = db.prepare('SELECT * FROM daily_missions WHERE user_id = ? AND mission_type = ? AND date = ? AND is_completed = 0')
    .get(userId, type, today);
  if (mission) {
    const newCount = Math.min(mission.current_count + count, mission.target_count);
    const completed = newCount >= mission.target_count ? 1 : 0;
    db.prepare('UPDATE daily_missions SET current_count = ?, is_completed = ? WHERE id = ?').run(newCount, completed, mission.id);
  }
}

const ACCOUNT_MAX_LEVEL = 80;

function getAccountExpNeeded(level) {
  return Math.floor(40 * Math.pow(level, 1.15));
}

function addAccountExp(userId, amount) {
  const user = db.prepare('SELECT account_level, account_exp FROM users WHERE id = ?').get(userId);
  let level = user.account_level || 1;
  if (level >= ACCOUNT_MAX_LEVEL) return { level, exp: 0, needed: 0 };
  let exp = (user.account_exp || 0) + amount;
  while (level < ACCOUNT_MAX_LEVEL) {
    const needed = getAccountExpNeeded(level);
    if (exp >= needed) { exp -= needed; level++; } else break;
  }
  if (level >= ACCOUNT_MAX_LEVEL) exp = 0;
  db.prepare('UPDATE users SET account_level = ?, account_exp = ? WHERE id = ?').run(level, exp, userId);
  return { level, exp, needed: level >= ACCOUNT_MAX_LEVEL ? 0 : getAccountExpNeeded(level) };
}

module.exports = router;
module.exports.refreshStamina = refreshStamina;
module.exports.deductStamina = deductStamina;
module.exports.progressMission = progressMission;
module.exports.addExp = addExp;
module.exports.addAccountExp = addAccountExp;
module.exports.calcLevelUp = calcLevelUp;
