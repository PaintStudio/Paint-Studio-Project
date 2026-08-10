const express = require('express');
const db = require('../db');
const { userLog } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { createUnit, createBattleSetup, validateBattleResult } = require('../battle');
const { buildPartyUnits, collectTagCounts } = require('../battleUtils');
const { raidBosses, bossRotation, weeklyRankRewards, DAILY_ATTEMPTS, RESET_DAY } = require('../../data/raid_bosses');

const router = express.Router();

function getNextResetDate() {
  const now = new Date();
  const day = now.getDay();
  let daysUntil = (RESET_DAY - day + 7) % 7;
  if (daysUntil === 0) {
    if (now.getHours() >= 6) daysUntil = 7;
  }
  const next = new Date(now);
  next.setDate(next.getDate() + daysUntil);
  next.setHours(6, 0, 0, 0);
  return next;
}

function createRaid(dbRef, bossKey) {
  const d = dbRef || db;
  if (!bossKey) {
    const lastRaid = d.prepare('SELECT boss_key FROM raids ORDER BY id DESC LIMIT 1').get();
    const lastIdx = lastRaid?.boss_key ? bossRotation.indexOf(lastRaid.boss_key) : -1;
    bossKey = bossRotation[(lastIdx + 1) % bossRotation.length];
  }
  const boss = raidBosses[bossKey];
  if (!boss) bossKey = bossRotation[0];
  const b = raidBosses[bossKey];

  const now = new Date();
  const endsAt = getNextResetDate();
  if (endsAt <= now) endsAt.setDate(endsAt.getDate() + 7);

  d.prepare(`INSERT INTO raids
    (name, element, origin, max_hp, current_hp, base_atk, base_def, base_spd, turn_notes,
     attack_pattern, rewards, starts_at, ends_at, is_active, boss_key, battle_hp, per_battle_gold, settled)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 0)`)
    .run(b.name, b.element, b.origin || 'neutral', b.maxHp, b.maxHp,
      b.atk, b.def, b.spd, b.turnNotes,
      JSON.stringify(b.phases.map(p => ({ hp_threshold: p.hpThreshold, skills: p.skills }))),
      JSON.stringify({ gold: 5000, prism: 100 }),
      now.toISOString(), endsAt.toISOString(),
      bossKey, b.battleHp || 800, b.perBattleGold || 400);
}

function settleRaid(raid) {
  if (raid.settled) return;

  const rankings = db.prepare(`
    SELECT user_id, SUM(damage_dealt) as total_damage
    FROM raid_entries WHERE raid_id = ?
    GROUP BY user_id ORDER BY total_damage DESC
  `).all(raid.id);

  for (let i = 0; i < rankings.length; i++) {
    const rank = i + 1;
    const tier = weeklyRankRewards.find(t => rank <= t.maxRank);
    if (!tier) continue;

    const rewards = { gold: tier.gold, currency: tier.prism };
    const body = `${rank}등 (총 피해: ${rankings[i].total_damage.toLocaleString()})`;

    db.prepare(`INSERT INTO mail (sender_id, recipient_id, title, body, rewards, expires_at)
      VALUES (NULL, ?, ?, ?, ?, ?)`)
      .run(rankings[i].user_id,
        `[레이드] ${raid.name} 주간 정산`,
        body,
        JSON.stringify(rewards),
        new Date(Date.now() + 14 * 86400000).toISOString());
  }

  db.prepare('UPDATE raids SET settled = 1, is_active = 0 WHERE id = ?').run(raid.id);
}

function checkAndRotate() {
  const raid = db.prepare('SELECT * FROM raids WHERE is_active = 1 ORDER BY id DESC LIMIT 1').get();
  if (!raid) { createRaid(); return null; }

  const now = new Date();
  if (new Date(raid.ends_at) <= now) {
    settleRaid(raid);
    createRaid();
    return db.prepare('SELECT * FROM raids WHERE is_active = 1 ORDER BY id DESC LIMIT 1').get();
  }
  return raid;
}

function getPhaseSkills(attackPattern, hpRatio) {
  const phases = typeof attackPattern === 'string' ? JSON.parse(attackPattern) : attackPattern;
  let skills = phases[0].skills;
  for (const phase of phases) {
    if (hpRatio <= phase.hp_threshold) skills = phase.skills;
  }
  return skills;
}

router.get('/current', authMiddleware, (req, res) => {
  const raid = checkAndRotate();
  if (!raid) return res.json({ raid: null });

  const todayEntries = db.prepare(`
    SELECT COUNT(*) as cnt FROM raid_entries
    WHERE raid_id = ? AND user_id = ? AND DATE(entered_at) = DATE('now')
  `).get(raid.id, req.user.id);

  const rankings = db.prepare(`
    SELECT u.display_name, u.id as user_id, SUM(re.damage_dealt) as total_damage
    FROM raid_entries re JOIN users u ON re.user_id = u.id
    WHERE re.raid_id = ?
    GROUP BY re.user_id ORDER BY total_damage DESC LIMIT 20
  `).all(raid.id);

  const myDamage = db.prepare(`
    SELECT SUM(damage_dealt) as total FROM raid_entries WHERE raid_id = ? AND user_id = ?
  `).get(raid.id, req.user.id);

  const hpPercent = Math.max(0, Math.round(raid.current_hp / raid.max_hp * 100));
  const hpRatio = raid.current_hp / raid.max_hp;
  const currentSkills = getPhaseSkills(raid.attack_pattern, hpRatio);

  const myRank = rankings.findIndex(r => r.user_id === req.user.id) + 1;

  res.json({
    raid: {
      id: raid.id, name: raid.name, element: raid.element,
      maxHp: raid.max_hp, currentHp: Math.max(0, raid.current_hp), hpPercent,
      atk: raid.base_atk, def: raid.base_def, spd: raid.base_spd,
      turnNotes: raid.turn_notes || 6,
      skills: currentSkills,
      endsAt: raid.ends_at,
      bossKey: raid.boss_key,
      battleHp: raid.battle_hp || 800,
      perBattleGold: raid.per_battle_gold || 400,
    },
    todayAttempts: todayEntries.cnt,
    maxAttempts: DAILY_ATTEMPTS,
    myTotalDamage: myDamage?.total || 0,
    myRank: myRank || 0,
    rankings: rankings.map((r, i) => ({
      rank: i + 1,
      display_name: r.display_name,
      total_damage: r.total_damage,
      isMe: r.user_id === req.user.id,
    })),
  });
});

router.post('/battle-start', authMiddleware, (req, res) => {
  try {
  const { partyIds } = req.body;
  if (!partyIds || partyIds.length === 0 || partyIds.length > 3) {
    return res.status(400).json({ error: '파티는 1~3명으로 편성하세요' });
  }

  const raid = db.prepare('SELECT * FROM raids WHERE is_active = 1 ORDER BY id DESC LIMIT 1').get();
  if (!raid) return res.status(404).json({ error: '활성 레이드가 없습니다' });
  if (raid.current_hp <= 0) return res.status(400).json({ error: '이미 처치된 보스입니다. 부활을 기다려주세요.' });

  const todayEntries = db.prepare(`
    SELECT COUNT(*) as cnt FROM raid_entries
    WHERE raid_id = ? AND user_id = ? AND DATE(entered_at) = DATE('now')
  `).get(raid.id, req.user.id);
  if (todayEntries.cnt >= DAILY_ATTEMPTS) {
    return res.status(400).json({ error: `오늘 시도 횟수를 모두 사용했습니다 (${DAILY_ATTEMPTS}회)` });
  }

  const { units: partyUnits, error: partyError } = buildPartyUnits(req.user.id, partyIds);
  if (partyError) return res.status(400).json({ error: partyError });

  const tagCounts = collectTagCounts(partyUnits);

  const hpRatio = raid.current_hp / raid.max_hp;
  const currentSkills = getPhaseSkills(raid.attack_pattern, hpRatio);
  const battleHp = raid.battle_hp || 800;

  const bossData = {
    id: 'raid_boss', name: raid.name, element: raid.element,
    origin: raid.origin || 'neutral',
    hp: Math.min(raid.current_hp, battleHp),
    atk: raid.base_atk, def: raid.base_def, spd: raid.base_spd,
    turn_notes: raid.turn_notes || 6,
    isBoss: true, ai_type: raid.ai_type || 'basic',
    skills: currentSkills,
  };

  const enemyUnits = [createUnit(bossData, 1, 0, true, currentSkills, null)];
  const setup = createBattleSetup(partyUnits, enemyUnits, tagCounts);
  setup.raidId = raid.id;
  setup.actualBossHp = raid.current_hp;
  setup.bgClass = 'raid';
  setup.maxCycles = raid.max_cycles || 30;
  if (raid.bgm) setup.bgm = raid.bgm;

  userLog(req.user.id, 'raid_enter', { raidId: raid.id, raidName: raid.name });

  res.json({ setup });
  } catch (err) {
    console.error('[레이드] battle-start 오류:', err.message);
    res.status(500).json({ error: '레이드 시작 중 오류가 발생했습니다' });
  }
});

router.post('/battle-end', authMiddleware, (req, res) => {
  try {
  const { raidId, battleLog } = req.body;

  if (!validateBattleResult(battleLog, 3, 1)) {
    return res.status(400).json({ error: '잘못된 전투 결과입니다' });
  }

  const raid = db.prepare('SELECT * FROM raids WHERE id = ? AND is_active = 1').get(raidId);
  if (!raid) return res.status(404).json({ error: '레이드를 찾을 수 없습니다' });

  const damage = Math.max(0, Math.round(battleLog.totalDamage || 0));

  db.prepare('INSERT INTO raid_entries (raid_id, user_id, damage_dealt, turns_used) VALUES (?, ?, ?, ?)')
    .run(raidId, req.user.id, damage, battleLog.turnCycles || 0);

  const newHp = Math.max(0, raid.current_hp - damage);
  db.prepare('UPDATE raids SET current_hp = ? WHERE id = ?').run(newHp, raidId);

  const perBattleGold = raid.per_battle_gold || 400;
  db.prepare('UPDATE users SET gold = gold + ? WHERE id = ?').run(perBattleGold, req.user.id);

  let bossKilled = false;
  if (newHp <= 0 && raid.current_hp > 0) {
    bossKilled = true;
    const killRewards = JSON.parse(raid.rewards || '{}');
    const participants = db.prepare('SELECT DISTINCT user_id FROM raid_entries WHERE raid_id = ?').all(raidId);
    for (const p of participants) {
      db.prepare(`INSERT INTO mail (sender_id, recipient_id, title, body, rewards, expires_at)
        VALUES (NULL, ?, ?, ?, ?, ?)`)
        .run(p.user_id,
          `[레이드] ${raid.name} 처치 보상`,
          '레이드 보스가 처치되었습니다!',
          JSON.stringify({ gold: killRewards.gold || 5000, currency: killRewards.prism || 100 }),
          new Date(Date.now() + 14 * 86400000).toISOString());
    }
  }

  const myTotal = db.prepare('SELECT SUM(damage_dealt) as total FROM raid_entries WHERE raid_id = ? AND user_id = ?')
    .get(raidId, req.user.id);

  const updatedUser = db.prepare('SELECT stamina, gold, currency FROM users WHERE id = ?').get(req.user.id);

  res.json({
    damage,
    bossHp: newHp,
    bossMaxHp: raid.max_hp,
    bossKilled,
    rewards: { gold: perBattleGold },
    myTotalDamage: myTotal?.total || 0,
    user: updatedUser,
  });

  try { require('./stage').progressMission(req.user.id, 'raid', 1); } catch {}
  userLog(req.user.id, 'raid_end', { raidId, raidName: raid.name, damage, bossKilled });
  } catch (err) {
    console.error('[레이드] battle-end 오류:', err.message);
    res.status(500).json({ error: '레이드 결과 처리 중 오류가 발생했습니다' });
  }
});

router.post('/battle', authMiddleware, (req, res) => {
  res.status(400).json({ error: '새로운 전투 시스템을 사용해주세요 (battle-start / battle-end)' });
});

module.exports = router;
module.exports.createRaid = createRaid;
