const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { createUnit, createBattleSetup, validateBattleResult, calcStats } = require('../battle');
const gameConfig = require('../../gameConfig.json');

const router = express.Router();

// 스테이지 목록
router.get('/list', authMiddleware, (req, res) => {
  const stages = db.prepare(`
    SELECT s.*, sc.stars, sc.best_turns
    FROM stages s
    LEFT JOIN stage_clears sc ON s.id = sc.stage_id AND sc.user_id = ?
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

  if (!partyIds || partyIds.length === 0 || partyIds.length > 4) {
    return res.status(400).json({ error: '파티는 1~4명으로 편성하세요' });
  }

  const stage = db.prepare('SELECT * FROM stages WHERE id = ?').get(stageId);
  if (!stage) return res.status(404).json({ error: '스테이지를 찾을 수 없습니다' });

  // 스태미나 체크 및 차감
  refreshStamina(req.user.id);
  const user = db.prepare('SELECT stamina FROM users WHERE id = ?').get(req.user.id);
  if (user.stamina < stage.stamina_cost) {
    return res.status(400).json({ error: '스태미나가 부족합니다', need: stage.stamina_cost, have: user.stamina });
  }
  db.prepare('UPDATE users SET stamina = stamina - ? WHERE id = ?').run(stage.stamina_cost, req.user.id);

  // 파티 유닛 생성 (장착 스킬 포함)
  const partyUnits = [];
  for (const invId of partyIds) {
    const inv = db.prepare(`
      SELECT i.*, c.name, c.rarity, c.element, c.origin, c.title, c.base_hp, c.base_atk, c.base_def, c.base_spd, c.turn_notes, c.image_url
      FROM inventory i JOIN characters c ON i.character_id = c.id
      WHERE i.id = ? AND i.user_id = ?
    `).get(invId, req.user.id);
    if (!inv) return res.status(400).json({ error: `인벤토리 #${invId}를 찾을 수 없습니다` });

    // 장착된 스킬 조회
    const equipped = db.prepare(`
      SELECT s.* FROM equipped_skills es JOIN skills s ON es.skill_id = s.id
      WHERE es.inventory_id = ? ORDER BY es.slot_number
    `).all(invId);

    // 장착 스킬이 없으면 캐릭터 기본 스킬 사용
    let skills = equipped;
    if (skills.length === 0) {
      skills = db.prepare(`
        SELECT s.* FROM character_skills cs JOIN skills s ON cs.skill_id = s.id
        WHERE cs.character_id = ? AND cs.is_default = 1
      `).all(inv.character_id);
    }

    partyUnits.push(createUnit(inv, inv.level, inv.awakening, false, skills));
  }

  // 적 유닛 생성
  const enemies = JSON.parse(stage.enemy_data);
  const enemyUnits = enemies.map((e, idx) => createUnit({ ...e, id: `enemy_${idx}` }, 1, 0, true, e.skills || []));

  const setup = createBattleSetup(partyUnits, enemyUnits);
  setup.stageId = stageId;
  setup.rewards = JSON.parse(stage.rewards);

  const updatedUser = db.prepare('SELECT stamina, gold, currency FROM users WHERE id = ?').get(req.user.id);
  res.json({ setup, user: updatedUser });
});

// 전투 결과 제출
router.post('/battle-end', authMiddleware, (req, res) => {
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

    earnedRewards = { gold: rewards.gold, exp: rewards.exp, stars };

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

    // 경험치 분배 (partyIds를 battleLog에서 가져옴)
    if (battleLog.partyIds && battleLog.partyIds.length > 0) {
      const expPerUnit = Math.floor(rewards.exp / battleLog.partyIds.length);
      for (const invId of battleLog.partyIds) {
        addExp(invId, expPerUnit);
      }
    }

    progressMission(req.user.id, 'battle', 1);
  }

  const updatedUser = db.prepare('SELECT stamina, gold, currency FROM users WHERE id = ?').get(req.user.id);
  res.json({ rewards: earnedRewards, user: updatedUser });
});

// === 기존 호환용: 자동전투 (레거시) ===
router.post('/battle', authMiddleware, (req, res) => {
  // battle-start로 리다이렉트
  req.body.commands = null;
  // 기존 방식도 지원
  const { stageId, partyIds } = req.body;

  if (!partyIds || partyIds.length === 0 || partyIds.length > 4) {
    return res.status(400).json({ error: '파티는 1~4명으로 편성하세요' });
  }

  const stage = db.prepare('SELECT * FROM stages WHERE id = ?').get(stageId);
  if (!stage) return res.status(404).json({ error: '스테이지를 찾을 수 없습니다' });

  refreshStamina(req.user.id);
  const user = db.prepare('SELECT stamina FROM users WHERE id = ?').get(req.user.id);
  if (user.stamina < stage.stamina_cost) {
    return res.status(400).json({ error: '스태미나가 부족합니다' });
  }
  db.prepare('UPDATE users SET stamina = stamina - ? WHERE id = ?').run(stage.stamina_cost, req.user.id);

  // 간단한 자동전투 결과 생성 (레거시 호환)
  const rewards = JSON.parse(stage.rewards);
  const victory = Math.random() > 0.3; // 70% 승률 (임시)

  if (victory) {
    db.prepare('UPDATE users SET gold = gold + ? WHERE id = ?').run(rewards.gold, req.user.id);
    const existing = db.prepare('SELECT * FROM stage_clears WHERE user_id = ? AND stage_id = ?').get(req.user.id, stageId);
    if (!existing) {
      db.prepare('UPDATE users SET currency = currency + ? WHERE id = ?').run(rewards.first_clear_diamond, req.user.id);
      db.prepare('INSERT INTO stage_clears (user_id, stage_id, stars, best_turns) VALUES (?, ?, ?, ?)')
        .run(req.user.id, stageId, 1, 10);
    }
    for (const invId of partyIds) addExp(invId, Math.floor(rewards.exp / partyIds.length));
    progressMission(req.user.id, 'battle', 1);
  }

  const updatedUser = db.prepare('SELECT stamina, gold, currency FROM users WHERE id = ?').get(req.user.id);
  res.json({
    battle: { result: victory ? 'victory' : 'defeat', turns: 10, stars: victory ? 1 : 0, log: [], totalDamage: 0, partyState: [], enemyState: [] },
    rewards: victory ? { gold: rewards.gold, exp: rewards.exp } : null,
    user: updatedUser,
  });
});

// 유틸
function refreshStamina(userId) {
  const user = db.prepare('SELECT stamina, stamina_updated_at FROM users WHERE id = ?').get(userId);
  const now = Date.now();
  const lastUpdate = new Date(user.stamina_updated_at + 'Z').getTime();
  const elapsed = Math.floor((now - lastUpdate) / 1000 / 60);
  const recovered = Math.floor(elapsed / 5);
  if (recovered > 0 && user.stamina < gameConfig.stamina.max) {
    const newStamina = Math.min(120, user.stamina + recovered);
    db.prepare('UPDATE users SET stamina = ?, stamina_updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStamina, userId);
  }
}

function addExp(inventoryId, amount) {
  const inv = db.prepare('SELECT i.*, c.rarity FROM inventory i JOIN characters c ON i.character_id = c.id WHERE i.id = ?').get(inventoryId);
  if (!inv) return;
  const maxLevels = gameConfig.growth.maxLevels;
  const maxLevel = (maxLevels[inv.rarity] || 40) + inv.awakening * gameConfig.growth.awakeningLevelBonus;
  let exp = inv.exp + amount;
  let level = inv.level;
  while (level < maxLevel) {
    const needed = level * 100;
    if (exp >= needed) { exp -= needed; level++; } else break;
  }
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

module.exports = router;
module.exports.refreshStamina = refreshStamina;
module.exports.progressMission = progressMission;
module.exports.addExp = addExp;
