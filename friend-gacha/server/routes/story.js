const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { createUnit, createBattleSetup, validateBattleResult } = require('../battle');
const gameConfig = require('../../gameConfig.json');
const itemDefs = require('../../data/items');
const { addAccountExp, refreshStamina, progressMission } = require('./stage');

const router = express.Router();

// 스토리 노드 목록
router.get('/list', authMiddleware, (req, res) => {
  const { category } = req.query;
  const cat = category || 'main';

  const nodes = db.prepare(`
    SELECT sn.*, sc.stars, sc.best_turns
    FROM story_nodes sn
    LEFT JOIN story_clears sc ON sn.id = sc.node_id AND sc.user_id = ?
    WHERE sn.category = ?
    ORDER BY sn.chapter, sn.node_number
  `).all(req.user.id, cat);

  const chapters = {};
  for (const n of nodes) {
    if (!chapters[n.chapter]) chapters[n.chapter] = [];

    const prev = chapters[n.chapter].length > 0 ? chapters[n.chapter][chapters[n.chapter].length - 1] : null;
    const prevChapterCleared = n.chapter === 1 || (chapters[n.chapter - 1]?.every(nd => nd.stars > 0 || nd.cleared));
    const unlocked = n.node_number === 1
      ? (n.chapter === 1 || prevChapterCleared)
      : (prev && (prev.stars > 0 || prev.cleared));

    chapters[n.chapter].push({
      id: n.id,
      chapter: n.chapter,
      nodeNumber: n.node_number,
      title: n.title,
      nodeType: n.node_type,
      staminaCost: n.stamina_cost,
      recommendedLevel: n.recommended_level,
      difficulty: n.difficulty,
      stars: n.stars || 0,
      bestTurns: n.best_turns,
      cleared: !!(n.stars !== null && n.stars !== undefined && n.stars >= 0 && db.prepare('SELECT 1 FROM story_clears WHERE user_id = ? AND node_id = ?').get(req.user.id, n.id)),
      unlocked,
      hasRewards: !!n.rewards,
      rewards: n.rewards ? JSON.parse(n.rewards) : null,
    });
  }

  res.json({ chapters });
});

// 스토리 노드 상세 (스크립트 포함)
router.get('/node/:id', authMiddleware, (req, res) => {
  const node = db.prepare('SELECT * FROM story_nodes WHERE id = ?').get(req.params.id);
  if (!node) return res.status(404).json({ error: '노드를 찾을 수 없습니다' });

  res.json({
    id: node.id,
    category: node.category,
    chapter: node.chapter,
    nodeNumber: node.node_number,
    title: node.title,
    nodeType: node.node_type,
    storyScript: node.story_script ? JSON.parse(node.story_script) : null,
    staminaCost: node.stamina_cost,
    recommendedLevel: node.recommended_level,
    rewards: node.rewards ? JSON.parse(node.rewards) : null,
  });
});

// 스토리 전용 노드 읽기 완료
router.post('/read', authMiddleware, (req, res) => {
  const { nodeId } = req.body;
  const node = db.prepare('SELECT * FROM story_nodes WHERE id = ?').get(nodeId);
  if (!node) return res.status(404).json({ error: '노드를 찾을 수 없습니다' });
  if (node.node_type !== 'story') return res.status(400).json({ error: '스토리 전용 노드만 읽기 완료 가능' });

  const existing = db.prepare('SELECT * FROM story_clears WHERE user_id = ? AND node_id = ?').get(req.user.id, nodeId);
  let firstClear = false;
  if (!existing) {
    db.prepare('INSERT INTO story_clears (user_id, node_id, stars) VALUES (?, ?, ?)').run(req.user.id, nodeId, 1);
    firstClear = true;

    if (node.rewards) {
      const rewards = JSON.parse(node.rewards);
      if (rewards.gold) db.prepare('UPDATE users SET gold = gold + ? WHERE id = ?').run(rewards.gold, req.user.id);
      if (rewards.first_clear_diamond) db.prepare('UPDATE users SET currency = currency + ? WHERE id = ?').run(rewards.first_clear_diamond, req.user.id);
    }

    const accExp = node.rewards ? (JSON.parse(node.rewards).exp || 10) : 10;
    addAccountExp(req.user.id, accExp);
  }

  const updatedUser = db.prepare('SELECT stamina, gold, currency, account_level, account_exp FROM users WHERE id = ?').get(req.user.id);
  res.json({ ok: true, firstClear, user: updatedUser });
});

// 스토리 전투 시작
router.post('/battle-start', authMiddleware, (req, res) => {
  const { nodeId, partyIds } = req.body;

  if (!partyIds || partyIds.length === 0 || partyIds.length > 3) {
    return res.status(400).json({ error: '파티는 1~3명으로 편성하세요' });
  }

  const node = db.prepare('SELECT * FROM story_nodes WHERE id = ?').get(nodeId);
  if (!node) return res.status(404).json({ error: '노드를 찾을 수 없습니다' });
  if (node.node_type !== 'battle') return res.status(400).json({ error: '전투 노드가 아닙니다' });

  if (node.stamina_cost > 0) {
    refreshStamina(req.user.id);
    const user = db.prepare('SELECT stamina FROM users WHERE id = ?').get(req.user.id);
    if (user.stamina < node.stamina_cost) {
      return res.status(400).json({ error: '스태미나가 부족합니다', need: node.stamina_cost, have: user.stamina });
    }
    db.prepare('UPDATE users SET stamina = stamina - ? WHERE id = ?').run(node.stamina_cost, req.user.id);
  }

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

  const enemies = JSON.parse(node.enemy_data || '[]');
  const enemyUnits = enemies.map((e, idx) => {
    const unit = createUnit({ ...e, id: `enemy_${idx}` }, 1, 0, true, e.skills || [], e.talent || null, 0);
    if (e.monsterId) {
      const eTags = db.prepare('SELECT t.id, t.label FROM monster_tags mt JOIN tags t ON mt.tag_id = t.id WHERE mt.monster_id = ?').all(e.monsterId);
      unit.tags = eTags.map(t => ({ id: t.id, label: t.label }));
    }
    return unit;
  });

  const setup = createBattleSetup(partyUnits, enemyUnits, tagCounts);
  setup.nodeId = nodeId;
  setup.chapter = node.chapter;
  setup.stageName = `${node.chapter}-${node.node_number} ${node.title}`;
  setup.rewards = node.rewards ? JSON.parse(node.rewards) : { gold: 0 };

  if (node.story_script) {
    try { setup.storyScript = JSON.parse(node.story_script); } catch {}
  }

  const updatedUser = db.prepare('SELECT stamina, gold, currency FROM users WHERE id = ?').get(req.user.id);
  res.json({ setup, user: updatedUser });
});

// 스토리 전투 종료
router.post('/battle-end', authMiddleware, (req, res) => {
  const { nodeId, battleLog } = req.body;

  if (!validateBattleResult(battleLog, 4, 4)) {
    return res.status(400).json({ error: '잘못된 전투 결과입니다' });
  }

  const node = db.prepare('SELECT * FROM story_nodes WHERE id = ?').get(nodeId);
  if (!node) return res.status(404).json({ error: '노드를 찾을 수 없습니다' });

  const rewards = node.rewards ? JSON.parse(node.rewards) : { gold: 0 };
  let earnedRewards = null;

  if (battleLog.result === 'victory') {
    const stars = battleLog.allSurvived && battleLog.turnCycles <= 15 ? 3
      : battleLog.allSurvived ? 2 : 1;

    earnedRewards = { gold: rewards.gold || 0, stars };

    const existing = db.prepare('SELECT * FROM story_clears WHERE user_id = ? AND node_id = ?').get(req.user.id, nodeId);
    if (!existing) {
      earnedRewards.diamond = rewards.first_clear_diamond || 0;
      if (rewards.first_clear_diamond) {
        db.prepare('UPDATE users SET currency = currency + ? WHERE id = ?').run(rewards.first_clear_diamond, req.user.id);
      }
      db.prepare('INSERT INTO story_clears (user_id, node_id, stars, best_turns) VALUES (?, ?, ?, ?)')
        .run(req.user.id, nodeId, stars, battleLog.turnCycles);
    } else if (stars > existing.stars) {
      db.prepare('UPDATE story_clears SET stars = ?, best_turns = MIN(best_turns, ?) WHERE user_id = ? AND node_id = ?')
        .run(stars, battleLog.turnCycles, req.user.id, nodeId);
    }

    if (rewards.gold) {
      db.prepare('UPDATE users SET gold = gold + ? WHERE id = ?').run(rewards.gold, req.user.id);
    }

    progressMission(req.user.id, 'battle', 1);

    const accExp = rewards.exp || 20;
    addAccountExp(req.user.id, accExp);
    earnedRewards.accountExp = accExp;

    const enemies = JSON.parse(node.enemy_data || '[]');
    const droppedItems = [];
    for (const enemy of enemies) {
      if (!enemy.drops) continue;
      for (const drop of enemy.drops) {
        if (Math.random() < drop.rate) {
          const qty = drop.quantity || 1;
          db.prepare(`INSERT INTO user_items (user_id, item_id, quantity) VALUES (?, ?, ?)
            ON CONFLICT(user_id, item_id) DO UPDATE SET quantity = quantity + ?`)
            .run(req.user.id, drop.itemId, qty, qty);
          const def = itemDefs[drop.itemId];
          droppedItems.push({ itemId: drop.itemId, name: def?.name || drop.itemId, quantity: qty, rarity: def?.rarity || 'N' });
        }
      }
    }
    earnedRewards.items = droppedItems;
  }

  const updatedUser = db.prepare('SELECT stamina, gold, currency, account_level, account_exp FROM users WHERE id = ?').get(req.user.id);
  res.json({ rewards: earnedRewards, user: updatedUser });
});

module.exports = router;
