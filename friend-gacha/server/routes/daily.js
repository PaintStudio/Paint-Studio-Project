const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const hotRequire = require('../hotRequire');

const router = express.Router();

// 28칸 출석 스탬프 보상 정의
const STAMP_REWARDS = [
	//1주차
  { currency: 50, items: [{itemId: 'frag_life_low', count: 3}] },
  { currency: 50, gold: 1000},
  { currency: 100, items: [{itemId: 'windcodesmall', count: 3}] },
  { currency: 100, gold: 1000 },
  { currency: 150, items: [{itemId: 'lifestonelow', count: 3}] },
  { currency: 150, gold: 3000 },
  { currency: 400, items: [{itemId: 'stamina_drink_l', count: 2}] },
	//2주차
  { currency: 50, items: [{itemId: 'frag_life_mid', count: 3}] },
  { currency: 50, gold: 1000},
  { currency: 100, items: [{itemId: 'windcodemedium', count: 3}] },
  { currency: 100, gold: 1000 },
  { currency: 150, items: [{itemId: 'lifestonemedium', count: 3}] },
  { currency: 150, gold: 3000 },
  { currency: 400, items: [{itemId: 'stamina_drink_l', count: 2}] },
	//3주차
  { currency: 50, items: [{itemId: 'frag_life_high', count: 3}] },
  { currency: 50, gold: 1000},
  { currency: 100, items: [{itemId: 'windcodebig', count: 3}] },
  { currency: 100, gold: 1000 },
  { currency: 150, items: [{itemId: 'lifestonebig', count: 3}] },
  { currency: 150, gold: 3000 },
  { currency: 400, items: [{itemId: 'stamina_drink_l', count: 2}] },
	//4주차
  { currency: 50, items: [{itemId: 'frag_life_top', count: 3}] },
  { currency: 50, gold: 1000},
  { currency: 100, items: [{itemId: 'windcodemax', count: 3}] },
  { currency: 100, gold: 1000 },
  { currency: 150, items: [{itemId: 'lifestonemax', count: 3}] },
  { currency: 150, gold: 3000 },
  { currency: 400, items: [{itemId: 'stamina_drink_l', count: 2}] },
];

function getMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// 출석 체크 + 데일리 미션 생성
router.post('/checkin', authMiddleware, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  let streak = user.login_streak;
  let alreadyCheckedIn = false;

  if (user.last_login_date === today) {
    alreadyCheckedIn = true;
  } else {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    streak = user.last_login_date === yesterdayStr ? user.login_streak + 1 : 1;

    db.prepare('UPDATE users SET last_login_date = ?, login_streak = ? WHERE id = ?')
      .run(today, streak, req.user.id);

    // 데일리 미션 생성
    const existingMissions = db.prepare('SELECT COUNT(*) as cnt FROM daily_missions WHERE user_id = ? AND date = ?').get(req.user.id, today);
    if (existingMissions.cnt === 0) {
      const missions = [
        { type: 'battle', target: 5, reward_type: 'gold', reward_amount: 1000, desc: '전투 5회 클리어' },
        { type: 'gacha', target: 1, reward_type: 'diamond', reward_amount: 30, desc: '가챠 1회' },
        { type: 'raid', target: 1, reward_type: 'gold', reward_amount: 2000, desc: '레이드 1회 도전' },
      ];
      const insertMission = db.prepare('INSERT INTO daily_missions (user_id, mission_type, target_count, reward_type, reward_amount, date) VALUES (?, ?, ?, ?, ?, ?)');
      for (const m of missions) {
        insertMission.run(req.user.id, m.type, m.target, m.reward_type, m.reward_amount, today);
      }
    }
  }

  res.json({ alreadyCheckedIn, streak });
});

// 출석 스탬프 조회
router.get('/attendance', authMiddleware, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const monthKey = getMonthKey();

  const stamps = db.prepare('SELECT stamp_date, stamp_index FROM attendance_stamps WHERE user_id = ? AND month_key = ? ORDER BY stamp_index')
    .all(req.user.id, monthKey);

  const todayStamped = stamps.some(s => s.stamp_date === today);

  const itemDefs = hotRequire('items');
  const rewards = STAMP_REWARDS.map(r => {
    if (!r.items) return r;
    return { ...r, items: r.items.map(it => ({ ...it, name: itemDefs[it.itemId]?.name || it.itemId })) };
  });

  res.json({
    monthKey,
    stamps: stamps.map(s => ({ date: s.stamp_date, index: s.stamp_index })),
    todayStamped,
    rewards,
  });
});

// 출석 스탬프 찍기
router.post('/attendance/stamp', authMiddleware, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const monthKey = getMonthKey();

  const existing = db.prepare('SELECT id FROM attendance_stamps WHERE user_id = ? AND stamp_date = ?')
    .get(req.user.id, today);
  if (existing) return res.json({ alreadyStamped: true });

  const count = db.prepare('SELECT COUNT(*) as cnt FROM attendance_stamps WHERE user_id = ? AND month_key = ?')
    .get(req.user.id, monthKey).cnt;

  if (count >= 28) return res.json({ alreadyStamped: true, maxReached: true });

  const stampIndex = count;
  db.prepare('INSERT INTO attendance_stamps (user_id, stamp_date, month_key, stamp_index) VALUES (?, ?, ?, ?)')
    .run(req.user.id, today, monthKey, stampIndex);

  const reward = STAMP_REWARDS[stampIndex] || { gold: 500 };

  const rewardParts = [];
  if (reward.currency) rewardParts.push(`다이아 ${reward.currency}개`);
  if (reward.gold) rewardParts.push(`골드 ${reward.gold.toLocaleString()}`);
  if (reward.items) {
    const itemDefs = hotRequire('items');
    reward.items.forEach(i => {
      const def = itemDefs[i.itemId];
      rewardParts.push(`${def ? def.name : i.itemId} x${i.count}`);
    });
  }
  const rewardText = rewardParts.join(', ');

  db.prepare(`INSERT INTO mail (sender_id, recipient_id, title, body, rewards, expires_at) VALUES (NULL, ?, ?, ?, ?, ?)`)
    .run(req.user.id, `출석 ${stampIndex + 1}일차 보상`, rewardText, JSON.stringify(reward), null);

  res.json({
    alreadyStamped: false,
    stampIndex,
    reward,
    rewardText,
  });
});

// 데일리 미션 목록
router.get('/missions', authMiddleware, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const missions = db.prepare('SELECT * FROM daily_missions WHERE user_id = ? AND date = ?').all(req.user.id, today);

  const missionLabels = { battle: '전투 클리어', gacha: '가챠 뽑기', raid: '레이드 도전' };

  res.json({
    missions: missions.map(m => ({
      id: m.id,
      type: m.mission_type,
      label: `${missionLabels[m.mission_type] || m.mission_type} ${m.target_count}회`,
      current: m.current_count,
      target: m.target_count,
      completed: !!m.is_completed,
      claimed: !!m.is_claimed,
      rewardType: m.reward_type,
      rewardAmount: m.reward_amount,
    }))
  });
});

// 미션 보상 수령
router.post('/missions/:id/claim', authMiddleware, (req, res) => {
  const mission = db.prepare('SELECT * FROM daily_missions WHERE id = ? AND user_id = ? AND is_completed = 1 AND is_claimed = 0')
    .get(req.params.id, req.user.id);
  if (!mission) return res.status(400).json({ error: '수령할 수 없는 미션입니다' });

  const col = mission.reward_type === 'diamond' ? 'currency' : 'gold';
  db.prepare(`UPDATE users SET ${col} = ${col} + ? WHERE id = ?`).run(mission.reward_amount, req.user.id);
  db.prepare('UPDATE daily_missions SET is_claimed = 1 WHERE id = ?').run(mission.id);

  const user = db.prepare('SELECT currency, gold FROM users WHERE id = ?').get(req.user.id);
  res.json({ ok: true, user });
});

// 유저 정보 (스태미나 갱신 포함)
router.get('/status', authMiddleware, (req, res) => {
  const { refreshStamina } = require('./stage');
  refreshStamina(req.user.id);

  const user = db.prepare('SELECT id, username, display_name, bio, profile_icon, currency, gold, stamina, stamina_updated_at, total_pulls, pity_counter, login_streak, tutorial_done, tutorial_step, account_level, account_exp FROM users WHERE id = ?')
    .get(req.user.id);

  res.json({
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    bio: user.bio || '',
    profileIcon: user.profile_icon || '',
    currency: user.currency,
    gold: user.gold,
    stamina: user.stamina,
    staminaUpdatedAt: user.stamina_updated_at,
    totalPulls: user.total_pulls,
    pityCounter: user.pity_counter,
    loginStreak: user.login_streak,
    tutorialDone: !!user.tutorial_done,
    tutorialStep: user.tutorial_step || 0,
    accountLevel: user.account_level || 1,
    accountExp: user.account_exp || 0,
  });
});

module.exports = router;
