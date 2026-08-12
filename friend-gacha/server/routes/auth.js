const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../db');
const { initCharacterSkills } = require('../db');
const { generateToken, authMiddleware } = require('../middleware/auth');

const router = express.Router();

function newSessionId() {
  return crypto.randomBytes(16).toString('hex');
}

// 회원가입
router.post('/register', (req, res) => {
  const { username, password, displayName } = req.body;
  if (!username || !password) return res.status(400).json({ error: '아이디와 비밀번호를 입력하세요' });

  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) return res.status(409).json({ error: '이미 존재하는 아이디입니다' });

  const hash = bcrypt.hashSync(password, 10);
  const name = displayName || username;
  const sessionId = newSessionId();
  const result = db.prepare('INSERT INTO users (username, password_hash, display_name, session_id) VALUES (?, ?, ?, ?)').run(username, hash, name, sessionId);
  const userId = result.lastInsertRowid;

  // 기본 지급 캐릭터: 프림 (charId 22)
  const STARTER_CHAR_ID = 22;
  const starterChar = db.prepare('SELECT rarity FROM characters WHERE id = ?').get(STARTER_CHAR_ID);
  const starterLock = (starterChar?.rarity === 'SSR' || starterChar?.rarity === 'CR') ? 1 : 0;
  const inv = db.prepare('INSERT INTO inventory (user_id, character_id, level, exp, awakening, is_locked) VALUES (?, ?, 1, 0, 0, ?)').run(userId, STARTER_CHAR_ID, starterLock);
  try { initCharacterSkills(userId, inv.lastInsertRowid, STARTER_CHAR_ID); } catch (e) {
    console.error('[회원가입] 스킬 초기화 실패:', e.message);
  }
  db.prepare('UPDATE users SET representative_character_id = ? WHERE id = ?').run(STARTER_CHAR_ID, userId);

  const user = db.prepare('SELECT id, username, display_name, currency, tutorial_done, tutorial_step FROM users WHERE id = ?').get(userId);
  const token = generateToken(user, sessionId);

  res.json({ token, user: { id: user.id, username: user.username, displayName: user.display_name, currency: user.currency, tutorialDone: !!user.tutorial_done, tutorialStep: user.tutorial_step || 0 } });
});

// 로그인
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: '아이디 또는 비밀번호가 틀렸습니다' });
  }

  const sessionId = newSessionId();
  db.prepare('UPDATE users SET session_id = ? WHERE id = ?').run(sessionId, user.id);

  const token = generateToken(user, sessionId);
  res.json({
    token,
    user: { id: user.id, username: user.username, displayName: user.display_name, currency: user.currency, totalPulls: user.total_pulls, tutorialDone: !!user.tutorial_done, tutorialStep: user.tutorial_step || 0 }
  });
});

// 내 정보
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, username, display_name, bio, profile_icon, currency, gold, stamina, total_pulls, pity_counter, login_streak, tutorial_done, tutorial_step, account_level, account_exp FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: '유저를 찾을 수 없습니다' });
  res.json({
    id: user.id, username: user.username, displayName: user.display_name,
    bio: user.bio || '', profileIcon: user.profile_icon || '',
    currency: user.currency, gold: user.gold, stamina: user.stamina,
    totalPulls: user.total_pulls, pityCounter: user.pity_counter, loginStreak: user.login_streak,
    tutorialDone: !!user.tutorial_done, tutorialStep: user.tutorial_step || 0,
    accountLevel: user.account_level || 1, accountExp: user.account_exp || 0,
  });
});

// 튜토리얼 완료
router.post('/tutorial-done', authMiddleware, (req, res) => {
  db.prepare('UPDATE users SET tutorial_done = 1 WHERE id = ?').run(req.user.id);
  res.json({ ok: true });
});

// 튜토리얼 스텝 진행
router.post('/tutorial-advance', authMiddleware, (req, res) => {
  const { step } = req.body;
  if (step !== undefined) {
    db.prepare('UPDATE users SET tutorial_step = ? WHERE id = ?').run(step, req.user.id);
  } else {
    db.prepare('UPDATE users SET tutorial_step = tutorial_step + 1 WHERE id = ?').run(req.user.id);
  }
  const user = db.prepare('SELECT tutorial_step FROM users WHERE id = ?').get(req.user.id);
  res.json({ ok: true, tutorialStep: user.tutorial_step });
});

// 튜토리얼 전투 셋업
router.post('/tutorial-battle', authMiddleware, (req, res) => {
  const { createUnit, createBattleSetup } = require('../battle');
  const talentData = require('../../data/talents');
  const { party, enemies, chapter, stageName } = req.body;

  if (!party?.length || !enemies?.length) {
    return res.status(400).json({ error: '파티와 적 데이터가 필요합니다' });
  }

  const partyUnits = party.map(p => {
    const char = db.prepare('SELECT * FROM characters WHERE id = ?').get(p.charId);
    if (!char) return null;

    const level = p.level || 1;
    const awakening = p.awakening || 0;
    const promotion = p.promotion || 0;

    let skills;
    if (p.skills?.length > 0) {
      skills = p.skills.map(sid => db.prepare('SELECT * FROM skills WHERE id = ?').get(sid)).filter(Boolean);
    } else {
      skills = db.prepare(
        'SELECT s.* FROM character_skills cs JOIN skills s ON cs.skill_id = s.id WHERE cs.character_id = ? AND cs.is_default = 1'
      ).all(char.id);
    }

    const charTalents = talentData[char.id];
    const talent = charTalents?.talents?.[p.talentIdx ?? 0] || null;

    return createUnit(
      { ...char, character_id: char.id },
      level, awakening, false, skills, talent, promotion
    );
  }).filter(Boolean);

  const enemyUnits = enemies.map((e, idx) => {
    if (e.monsterId) {
      const monRow = db.prepare('SELECT * FROM monsters WHERE id = ?').get(e.monsterId);
      if (!monRow) return null;
      const monSkills = JSON.parse(monRow.skills || '[]');
      const scaled = {
        ...monRow,
        isBoss: !!monRow.is_boss,
        id: `enemy_${idx}`,
        hp: Math.round(monRow.hp * (e.scale || 1)),
        atk: Math.round(monRow.atk * (e.scale || 1)),
        def: Math.round(monRow.def * (e.scale || 1)),
        spd: Math.round(monRow.spd * (e.scale || 1)),
        turn_notes: monRow.turn_notes,
        skills: monSkills,
      };
      return createUnit(scaled, 1, 0, true, monSkills, null, 0);
    }
    if (e.charId) {
      const char = db.prepare('SELECT * FROM characters WHERE id = ?').get(e.charId);
      if (!char) return null;
      const eSkills = e.skills?.length > 0
        ? e.skills.map(sid => db.prepare('SELECT * FROM skills WHERE id = ?').get(sid)).filter(Boolean)
        : db.prepare(
            'SELECT s.* FROM character_skills cs JOIN skills s ON cs.skill_id = s.id WHERE cs.character_id = ? AND cs.is_default = 1'
          ).all(char.id);
      const unit = createUnit(
        { ...char, id: `enemy_${idx}`, hp: e.hp, atk: e.atk, def: e.def, spd: e.spd, isBoss: e.isBoss },
        1, 0, true, eSkills, e.talent || null, 0
      );
      return unit;
    }
    return createUnit({ ...e, id: `enemy_${idx}` }, 1, 0, true, e.skills || [], e.talent || null, 0);
  }).filter(Boolean);

  const setup = createBattleSetup(partyUnits, enemyUnits);
  setup.chapter = chapter;
  setup.stageName = stageName || '튜토리얼 전투';

  res.json({ setup });
});

module.exports = router;
