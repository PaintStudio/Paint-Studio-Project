const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { createUnit, createBattleSetup, validateBattleResult } = require('../battle');

const router = express.Router();

// 현재 레이드 정보
router.get('/current', authMiddleware, (req, res) => {
  const raid = db.prepare('SELECT * FROM raids WHERE is_active = 1 ORDER BY id DESC LIMIT 1').get();
  if (!raid) return res.json({ raid: null });

  const todayEntries = db.prepare(`
    SELECT COUNT(*) as cnt FROM raid_entries
    WHERE raid_id = ? AND user_id = ? AND DATE(entered_at) = DATE('now')
  `).get(raid.id, req.user.id);

  const rankings = db.prepare(`
    SELECT u.display_name, SUM(re.damage_dealt) as total_damage
    FROM raid_entries re JOIN users u ON re.user_id = u.id
    WHERE re.raid_id = ?
    GROUP BY re.user_id ORDER BY total_damage DESC LIMIT 10
  `).all(raid.id);

  const myDamage = db.prepare(`
    SELECT SUM(damage_dealt) as total FROM raid_entries WHERE raid_id = ? AND user_id = ?
  `).get(raid.id, req.user.id);

  const hpPercent = Math.round(raid.current_hp / raid.max_hp * 100);
  const attackPattern = JSON.parse(raid.attack_pattern);

  // 현재 HP에 맞는 패턴
  const hpRatio = raid.current_hp / raid.max_hp;
  let currentSkills = attackPattern[0].skills;
  for (const phase of attackPattern) {
    if (hpRatio <= phase.hp_threshold) currentSkills = phase.skills;
  }

  res.json({
    raid: {
      id: raid.id, name: raid.name, element: raid.element,
      maxHp: raid.max_hp, currentHp: raid.current_hp, hpPercent,
      atk: raid.base_atk, def: raid.base_def, spd: raid.base_spd,
      turnNotes: raid.turn_notes || 6,
      skills: currentSkills,
      endsAt: raid.ends_at,
    },
    todayAttempts: todayEntries.cnt,
    maxAttempts: 3,
    myTotalDamage: myDamage?.total || 0,
    rankings,
  });
});

// 레이드 전투 시작
router.post('/battle-start', authMiddleware, (req, res) => {
  const { partyIds } = req.body;

  if (!partyIds || partyIds.length === 0 || partyIds.length > 4) {
    return res.status(400).json({ error: '파티는 1~4명으로 편성하세요' });
  }

  const raid = db.prepare('SELECT * FROM raids WHERE is_active = 1 ORDER BY id DESC LIMIT 1').get();
  if (!raid) return res.status(404).json({ error: '활성 레이드가 없습니다' });
  if (raid.current_hp <= 0) return res.status(400).json({ error: '이미 처치된 보스입니다' });

  const todayEntries = db.prepare(`
    SELECT COUNT(*) as cnt FROM raid_entries
    WHERE raid_id = ? AND user_id = ? AND DATE(entered_at) = DATE('now')
  `).get(raid.id, req.user.id);
  if (todayEntries.cnt >= 3) return res.status(400).json({ error: '오늘 시도 횟수를 모두 사용했습니다' });

  // 파티 유닛 생성
  const partyUnits = [];
  for (const invId of partyIds) {
    const inv = db.prepare(`
      SELECT i.*, c.name, c.rarity, c.element, c.title, c.base_hp, c.base_atk, c.base_def, c.base_spd, c.turn_notes, c.image_url, c.image_sd
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

  // 태그 조건 해석 (tag ID 기반)
  const tagCounts = {};
  for (const u of partyUnits) {
    const tags = db.prepare('SELECT t.id, t.label FROM character_tags ct JOIN tags t ON ct.tag_id = t.id WHERE ct.character_id = ?').all(u.characterId);
    u.tags = tags.map(t => ({ id: t.id, label: t.label }));
    for (const t of tags) tagCounts[t.id] = (tagCounts[t.id] || 0) + 1;
  }

  // 레이드 보스 유닛
  const attackPattern = JSON.parse(raid.attack_pattern);
  const hpRatio = raid.current_hp / raid.max_hp;
  let currentSkills = attackPattern[0].skills;
  for (const phase of attackPattern) {
    if (hpRatio <= phase.hp_threshold) currentSkills = phase.skills;
  }

  const bossData = {
    id: 'raid_boss', name: raid.name, element: raid.element,
    hp: Math.min(raid.current_hp, 200), // 전투용 HP (실제 레이드 HP와 별도)
    atk: raid.base_atk, def: raid.base_def, spd: raid.base_spd,
    turn_notes: raid.turn_notes || 6,
    isBoss: true, skills: currentSkills,
    talent: raid.talent ? JSON.parse(raid.talent) : null,
  };

  const enemyUnits = [createUnit(bossData, 1, 0, true, currentSkills, bossData.talent)];
  const setup = createBattleSetup(partyUnits, enemyUnits, tagCounts);
  setup.raidId = raid.id;
  setup.actualBossHp = raid.current_hp;

  res.json({ setup });
});

// 레이드 전투 결과 제출
router.post('/battle-end', authMiddleware, (req, res) => {
  const { raidId, battleLog } = req.body;

  if (!validateBattleResult(battleLog, 4, 1)) {
    return res.status(400).json({ error: '잘못된 전투 결과입니다' });
  }

  const raid = db.prepare('SELECT * FROM raids WHERE id = ? AND is_active = 1').get(raidId);
  if (!raid) return res.status(404).json({ error: '레이드를 찾을 수 없습니다' });

  const damage = Math.max(0, Math.round(battleLog.totalDamage));

  // 데미지 기록
  db.prepare('INSERT INTO raid_entries (raid_id, user_id, damage_dealt, turns_used) VALUES (?, ?, ?, ?)')
    .run(raidId, req.user.id, damage, battleLog.turnCycles || 0);

  // 보스 HP 차감
  const newHp = Math.max(0, raid.current_hp - damage);
  db.prepare('UPDATE raids SET current_hp = ? WHERE id = ?').run(newHp, raidId);

  let bossKilled = false;
  if (newHp <= 0 && raid.current_hp > 0) {
    bossKilled = true;
    const rewards = JSON.parse(raid.rewards);
    // 참여자 전원 보상
    const participants = db.prepare('SELECT DISTINCT user_id FROM raid_entries WHERE raid_id = ?').all(raidId);
    for (const p of participants) {
      db.prepare('UPDATE users SET gold = gold + ?, currency = currency + ? WHERE id = ?')
        .run(rewards.gold, rewards.diamond, p.user_id);
    }
  }

  res.json({ damage, bossHp: newHp, bossMaxHp: raid.max_hp, bossKilled });
});

// 레거시 호환
router.post('/battle', authMiddleware, (req, res) => {
  res.status(400).json({ error: '새로운 전투 시스템을 사용해주세요 (battle-start → battle-end)' });
});

module.exports = router;
