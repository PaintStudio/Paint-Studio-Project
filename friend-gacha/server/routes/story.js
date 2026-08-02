const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { createUnit, createBattleSetup, validateBattleResult } = require('../battle');
const { buildPartyUnits, collectTagCounts, buildEnemyFromMonster } = require('../battleUtils');
const { addAccountExp, progressMission } = require('./stage');
const hotRequire = require('../hotRequire');

const router = express.Router();
const loadStories = () => hotRequire('stories');

// 튜토리얼 스크립트 로드
router.get('/tutorial', authMiddleware, (req, res) => {
  const nodes = loadStories();
  const tutorial = nodes.find(n => n.category === 'tutorial');
  if (!tutorial) return res.status(404).json({ error: '튜토리얼 노드가 없습니다' });
  res.json({
    nodeId: tutorial.id,
    storyScript: tutorial.story_script || [],
    bgm: tutorial.bgm || null,
  });
});

// 스토리 노드 목록
router.get('/list', authMiddleware, (req, res) => {
  const cat = req.query.category || 'main';
  const allNodes = loadStories()
    .filter(n => n.category === cat)
    .sort((a, b) => a.chapter - b.chapter || a.node_number - b.node_number);

  const clears = db.prepare('SELECT node_id, stars, best_turns FROM story_clears WHERE user_id = ?').all(req.user.id);
  const clearMap = {};
  for (const c of clears) clearMap[c.node_id] = c;

  const chapters = {};
  for (const n of allNodes) {
    if (!chapters[n.chapter]) chapters[n.chapter] = [];
    const clear = clearMap[n.id];
    const prev = chapters[n.chapter].length > 0 ? chapters[n.chapter][chapters[n.chapter].length - 1] : null;
    const prevChapterCleared = n.chapter === 1 || (chapters[n.chapter - 1]?.every(nd => nd.cleared));
    const unlocked = n.node_number === 1
      ? (n.chapter === 1 || prevChapterCleared)
      : (prev && prev.cleared);

    chapters[n.chapter].push({
      id: n.id,
      chapter: n.chapter,
      nodeNumber: n.node_number,
      title: n.title,
      description: n.description || null,
      nodeType: n.node_type,
      staminaCost: n.stamina_cost,
      recommendedLevel: n.recommended_level,
      difficulty: n.difficulty,
      stars: clear?.stars || 0,
      bestTurns: clear?.best_turns,
      cleared: !!clear,
      unlocked,
      hasRewards: !!n.rewards,
      rewards: n.rewards || null,
      fixedParty: n.fixed_party || null,
      requiredGuests: n.required_guests || null,
    });
  }

  res.json({ chapters });
});

// 스토리 노드 상세 (스크립트 포함)
router.get('/node/:id', authMiddleware, (req, res) => {
  const nodes = loadStories();
  const node = nodes.find(n => n.id === Number(req.params.id));
  if (!node) return res.status(404).json({ error: '노드를 찾을 수 없습니다' });

  let script = node.story_script || null;
  if (!script && node.node_type === 'battle' && node.enemy_data) {
    script = [{ type: 'battle', enemies: node.enemy_data, stageName: node.title }];
  }

  const cleared = !!db.prepare('SELECT 1 FROM story_clears WHERE user_id = ? AND node_id = ?').get(req.user.id, node.id);

  res.json({
    id: node.id,
    category: node.category,
    chapter: node.chapter,
    nodeNumber: node.node_number,
    title: node.title,
    nodeType: node.node_type,
    storyScript: script,
    staminaCost: node.stamina_cost,
    recommendedLevel: node.recommended_level,
    rewards: node.rewards || null,
    fixedParty: node.fixed_party || null,
    requiredGuests: node.required_guests || null,
    bgm: node.bgm || null,
    cleared,
  });
});

// 노드 완료 (스토리 읽기 또는 전투 클리어)
router.post('/read', authMiddleware, (req, res) => {
  const { nodeId } = req.body;
  const nodes = loadStories();
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return res.status(404).json({ error: '노드를 찾을 수 없습니다' });

  const existing = db.prepare('SELECT * FROM story_clears WHERE user_id = ? AND node_id = ?').get(req.user.id, nodeId);
  let firstClear = false;
  if (!existing) {
    db.prepare('INSERT INTO story_clears (user_id, node_id, stars) VALUES (?, ?, ?)').run(req.user.id, nodeId, 1);
    firstClear = true;

    const rewards = node.rewards;
    if (rewards) {
      if (rewards.gold) db.prepare('UPDATE users SET gold = gold + ? WHERE id = ?').run(rewards.gold, req.user.id);
      if (rewards.first_clear_diamond) db.prepare('UPDATE users SET currency = currency + ? WHERE id = ?').run(rewards.first_clear_diamond, req.user.id);
    }

    const accExp = rewards?.exp || 10;
    addAccountExp(req.user.id, accExp);
  }

  if (node.node_type === 'battle') {
    progressMission(req.user.id, 'battle', 1);
  }

  const updatedUser = db.prepare('SELECT stamina, gold, currency, account_level, account_exp FROM users WHERE id = ?').get(req.user.id);
  res.json({ ok: true, firstClear, user: updatedUser });
});

// 대여/게스트 캐릭터 유닛 생성 헬퍼
function createRentalUnit(spec, idx) {
  const char = db.prepare('SELECT * FROM characters WHERE id = ?').get(spec.charId);
  if (!char) return null;
  const skills = db.prepare(`
    SELECT s.* FROM character_skills cs JOIN skills s ON cs.skill_id = s.id
    WHERE cs.character_id = ? AND cs.is_default = 1
  `).all(spec.charId);
  const talentData = require('../../data/talents');
  const charTalents = talentData[spec.charId];
  const activeTalent = charTalents?.talents?.[0] || null;
  const charData = {
    ...char, base_hp: char.base_hp, base_atk: char.base_atk,
    base_def: char.base_def, base_spd: char.base_spd,
  };
  const unit = createUnit(charData, spec.level || 1, spec.awakening || 0, false, skills, activeTalent, spec.promotion || 0);
  unit.characterId = spec.charId;
  unit.isGuest = true;
  return unit;
}

// 스토리 인라인 전투 셋업 (스크립트 내 battle 항목에서 호출)
router.post('/battle-start', authMiddleware, (req, res) => {
  const { nodeId, partyIds, enemies, party } = req.body;

  if (!enemies || enemies.length === 0) {
    return res.status(400).json({ error: '적 데이터가 필요합니다' });
  }

  const nodes = loadStories();
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return res.status(404).json({ error: '노드를 찾을 수 없습니다' });

  const fixedParty = node.fixed_party || null;
  const requiredGuests = node.required_guests || null;

  const partyUnits = [];

  if (party && party.length > 0) {
    for (let i = 0; i < party.length; i++) {
      const unit = createRentalUnit(party[i], i);
      if (!unit) return res.status(400).json({ error: `파티 캐릭터 #${party[i].charId}를 찾을 수 없습니다` });
      partyUnits.push(unit);
    }
  } else if (fixedParty && fixedParty.length > 0) {
    for (let i = 0; i < fixedParty.length; i++) {
      const unit = createRentalUnit(fixedParty[i], i);
      if (!unit) return res.status(400).json({ error: `고정 파티 캐릭터 #${fixedParty[i].charId}를 찾을 수 없습니다` });
      partyUnits.push(unit);
    }
  } else {
    if (requiredGuests && requiredGuests.length > 0) {
      for (let i = 0; i < requiredGuests.length; i++) {
        const unit = createRentalUnit(requiredGuests[i], i);
        if (!unit) return res.status(400).json({ error: `게스트 캐릭터 #${requiredGuests[i].charId}를 찾을 수 없습니다` });
        partyUnits.push(unit);
      }
    }

    const maxUserSlots = 3 - partyUnits.length;
    if (!partyIds || partyIds.length === 0 || partyIds.length > maxUserSlots) {
      return res.status(400).json({ error: `파티는 1~${maxUserSlots}명으로 편성하세요` });
    }

    const { units: userUnits, error: partyError } = buildPartyUnits(req.user.id, partyIds);
    if (partyError) return res.status(400).json({ error: partyError });
    partyUnits.push(...userUnits);
  }

  const tagCounts = collectTagCounts(partyUnits);

  const enemyUnits = enemies.map((e, idx) => buildEnemyFromMonster(e, idx, 'enemy')).filter(Boolean);

  const setup = createBattleSetup(partyUnits, enemyUnits, tagCounts);
  setup.nodeId = nodeId;
  setup.chapter = node.chapter;
  setup.stageName = `${node.chapter}-${node.node_number} ${node.title}`;
  if (node.max_cycles) setup.maxCycles = node.max_cycles;
  if (node.bg_image) setup.bgImage = `/uploads/bg/${node.bg_image}`;

  res.json({ setup });
});

// 스토리 인라인 전투 결과 검증
router.post('/battle-end', authMiddleware, (req, res) => {
  const { battleLog } = req.body;

  if (!validateBattleResult(battleLog, 4, 4)) {
    return res.status(400).json({ error: '잘못된 전투 결과입니다' });
  }

  res.json({ ok: true, victory: battleLog.result === 'victory' });
});

module.exports = router;
