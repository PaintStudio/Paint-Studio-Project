const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const gameConfig = require('../../gameConfig.json');
const router = express.Router();

// gameConfig에서 가챠 설정 로드
const gachaCfg = gameConfig.gacha;
const RATES = gachaCfg.rates;
const PULL_COST = gachaCfg.pullCost;
const MULTI_PULL_COUNT = gachaCfg.multiPullCount;
const MULTI_PULL_COST = PULL_COST * MULTI_PULL_COUNT;
const PITY_THRESHOLD = gachaCfg.pityThreshold;

// 확률 기반 등급 결정
function rollRarity(pityCounter) {
  if (pityCounter >= PITY_THRESHOLD) return 'SSR';

  let rates = { ...RATES };
  if (pityCounter >= gachaCfg.softPityStart) {
    const bonus = (pityCounter - gachaCfg.softPityStart + 1) * gachaCfg.softPityBonusPerPull;
    rates.SSR = Math.min(rates.SSR + bonus, 1.0);
    // 나머지 확률 재분배
    const total = rates.SSR;
    const remaining = 1 - total;
    const oldRemaining = RATES.N + RATES.R + RATES.SR;
    rates.N = RATES.N * (remaining / oldRemaining);
    rates.R = RATES.R * (remaining / oldRemaining);
    rates.SR = RATES.SR * (remaining / oldRemaining);
  }

  const rand = Math.random();
  let cumulative = 0;

  for (const [rarity, rate] of Object.entries(rates)) {
    cumulative += rate;
    if (rand < cumulative) return rarity;
  }
  return 'N';
}

// 해당 등급에서 랜덤 캐릭터 선택
function pickCharacter(rarity) {
  const chars = db.prepare('SELECT * FROM characters WHERE rarity = ?').all(rarity);
  return chars[Math.floor(Math.random() * chars.length)];
}

// 단일 뽑기 실행
function executePull(userId) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  const rarity = rollRarity(user.pity_counter);
  const character = pickCharacter(rarity);

  // 인벤토리에 추가
  const inv = db.prepare('INSERT INTO inventory (user_id, character_id) VALUES (?, ?)').run(userId, character.id);

  // 로그 기록
  db.prepare('INSERT INTO pull_log (user_id, character_id, rarity) VALUES (?, ?, ?)').run(userId, character.id, rarity);

  // 유저 정보 업데이트 (천장 카운터: SSR 뽑으면 리셋)
  const newPity = rarity === 'SSR' ? 0 : user.pity_counter + 1;
  db.prepare('UPDATE users SET currency = currency - ?, total_pulls = total_pulls + 1, pity_counter = ? WHERE id = ?')
    .run(PULL_COST, newPity, userId);

  return {
    inventoryId: inv.lastInsertRowid,
    character: { ...character },
    rarity,
    isNew: db.prepare('SELECT COUNT(*) as cnt FROM inventory WHERE user_id = ? AND character_id = ?').get(userId, character.id).cnt === 1
  };
}

// 단일 뽑기
router.post('/pull', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT currency FROM users WHERE id = ?').get(req.user.id);
  if (user.currency < PULL_COST) return res.status(400).json({ error: '재화가 부족합니다', needed: PULL_COST, have: user.currency });

  const result = executePull(req.user.id);
  const updated = db.prepare('SELECT currency, pity_counter FROM users WHERE id = ?').get(req.user.id);

  // 데일리 미션 진행
  try { require('./stage').progressMission(req.user.id, 'gacha', 1); } catch {}

  res.json({ result, currency: updated.currency, pityCounter: updated.pity_counter });
});

// 10연차
router.post('/pull10', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT currency FROM users WHERE id = ?').get(req.user.id);
  if (user.currency < MULTI_PULL_COST) return res.status(400).json({ error: '재화가 부족합니다', needed: MULTI_PULL_COST, have: user.currency });

  const results = [];
  for (let i = 0; i < MULTI_PULL_COUNT; i++) {
    results.push(executePull(req.user.id));
  }

  const updated = db.prepare('SELECT currency, pity_counter FROM users WHERE id = ?').get(req.user.id);

  // 10연차 중 최소 1개 R 이상 보장
  const hasR = results.some(r => r.rarity !== 'N');
  if (!hasR) {
    // 마지막 결과를 R로 교체
    const rChar = pickCharacter('R');
    const last = results[results.length - 1];
    // DB 업데이트
    db.prepare('UPDATE inventory SET character_id = ? WHERE id = ?').run(rChar.id, last.inventoryId);
    db.prepare('UPDATE pull_log SET character_id = ?, rarity = ? WHERE user_id = ? AND character_id = ? ORDER BY id DESC LIMIT 1')
      .run(rChar.id, 'R', req.user.id, last.character.id);
    results[results.length - 1] = { ...last, character: rChar, rarity: 'R' };
  }

  res.json({ results, currency: updated.currency, pityCounter: updated.pity_counter });
});

// 가챠풀 정보 (확률표)
router.get('/rates', (req, res) => {
  const characters = db.prepare('SELECT id, name, rarity, title FROM characters ORDER BY CASE rarity WHEN "SSR" THEN 1 WHEN "SR" THEN 2 WHEN "R" THEN 3 ELSE 4 END').all();
  res.json({ rates: RATES, pityThreshold: PITY_THRESHOLD, characters, pullCost: PULL_COST });
});

module.exports = router;
