const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 출석 체크 + 데일리 미션 생성
router.post('/checkin', authMiddleware, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  let streak = user.login_streak;
  let rewards = { gold: 500, diamond: 0, stamina: 30 };
  let alreadyCheckedIn = false;

  if (user.last_login_date === today) {
    alreadyCheckedIn = true;
  } else {
    // 연속 출석 계산
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    streak = user.last_login_date === yesterdayStr ? user.login_streak + 1 : 1;

    // 연속 출석 보너스
    if (streak >= 7) rewards.diamond = 50;
    else if (streak >= 3) rewards.diamond = 20;
    else rewards.diamond = 10;

    // 보상 지급
    db.prepare('UPDATE users SET gold = gold + ?, currency = currency + ?, stamina = MIN(120, stamina + ?), last_login_date = ?, login_streak = ? WHERE id = ?')
      .run(rewards.gold, rewards.diamond, rewards.stamina, today, streak, req.user.id);

    // 데일리 미션 생성 (오늘 꺼 없으면)
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

  res.json({ alreadyCheckedIn, streak, rewards: alreadyCheckedIn ? null : rewards });
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
