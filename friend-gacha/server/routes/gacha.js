const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const gameConfig = require('../../gameConfig.json');
const router = express.Router();

const gachaCfg = gameConfig.gacha;
const DEFAULT_RATES = gachaCfg.rates;
const PULL_COST = gachaCfg.pullCost;
const MULTI_PULL_COUNT = gachaCfg.multiPullCount;
const MULTI_PULL_COST = PULL_COST * MULTI_PULL_COUNT;
const PITY_THRESHOLD = gachaCfg.pityThreshold;

// --- 배너 관리 ---
const BANNERS_PATH = path.join(__dirname, '..', '..', 'gachaBanners.json');

function loadBanners() {
  try {
    return JSON.parse(fs.readFileSync(BANNERS_PATH, 'utf-8'));
  } catch { return { banners: [] }; }
}

function saveBanners(data) {
  fs.writeFileSync(BANNERS_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function getActiveBanners() {
  const { banners } = loadBanners();
  // 날짜를 YYYY-MM-DD 문자열로 비교 (시간대 이슈 방지)
  const now = new Date();
  const today = now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0');
  return banners.filter(b => {
    if (!b.active) return false;
    if (b.type === 'permanent') return true;
    if (b.startDate && today < b.startDate) return false;
    if (b.endDate && today > b.endDate) return false;
    return true;
  });
}

function getBannerById(bannerId) {
  const active = getActiveBanners();
  return active.find(b => b.id === bannerId);
}

// 배너별 확률 결정
function rollRarity(pityCounter, banner) {
  if (pityCounter >= PITY_THRESHOLD) return 'SSR';

  const baseRates = banner?.rates || DEFAULT_RATES;
  let rates = { ...baseRates };

  if (pityCounter >= gachaCfg.softPityStart) {
    const bonus = (pityCounter - gachaCfg.softPityStart + 1) * gachaCfg.softPityBonusPerPull;
    rates.SSR = Math.min((rates.SSR || DEFAULT_RATES.SSR) + bonus, 1.0);
    const total = rates.SSR;
    const remaining = 1 - total;
    const oldRemaining = (baseRates.N || DEFAULT_RATES.N) + (baseRates.R || DEFAULT_RATES.R) + (baseRates.SR || DEFAULT_RATES.SR);
    rates.N = (baseRates.N || DEFAULT_RATES.N) * (remaining / oldRemaining);
    rates.R = (baseRates.R || DEFAULT_RATES.R) * (remaining / oldRemaining);
    rates.SR = (baseRates.SR || DEFAULT_RATES.SR) * (remaining / oldRemaining);
  }

  const rand = Math.random();
  let cumulative = 0;
  for (const [rarity, rate] of Object.entries(rates)) {
    cumulative += rate;
    if (rand < cumulative) return rarity;
  }
  return 'N';
}

// 배너별 캐릭터 선택
function pickCharacter(rarity, banner) {
  let chars;
  if (banner && banner.characterPool !== 'all' && Array.isArray(banner.characterPool) && banner.characterPool.length > 0) {
    // 한정 풀: 해당 등급 + 풀에 포함된 캐릭터
    const placeholders = banner.characterPool.map(() => '?').join(',');
    chars = db.prepare(`SELECT * FROM characters WHERE rarity = ? AND id IN (${placeholders})`).all(rarity, ...banner.characterPool);
    // 풀에 해당 등급이 없으면 전체에서
    if (chars.length === 0) {
      chars = db.prepare('SELECT * FROM characters WHERE rarity = ?').all(rarity);
    }
  } else {
    chars = db.prepare('SELECT * FROM characters WHERE rarity = ?').all(rarity);
  }

  // 픽업 캐릭터 확률 업
  if (banner && banner.featuredCharIds && banner.featuredCharIds.length > 0 && banner.featuredRateUp > 0) {
    const featured = chars.filter(c => banner.featuredCharIds.includes(c.id));
    if (featured.length > 0 && Math.random() < banner.featuredRateUp) {
      return featured[Math.floor(Math.random() * featured.length)];
    }
  }

  return chars[Math.floor(Math.random() * chars.length)];
}

const { initCharacterSkills } = require('../db');

// 단일 뽑기 실행
function executePull(userId, banner) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  const rarity = rollRarity(user.pity_counter, banner);
  const character = pickCharacter(rarity, banner);

  const inv = db.prepare('INSERT INTO inventory (user_id, character_id) VALUES (?, ?)').run(userId, character.id);
  db.prepare('INSERT INTO pull_log (user_id, character_id, rarity) VALUES (?, ?, ?)').run(userId, character.id, rarity);

  const newPity = rarity === 'SSR' ? 0 : user.pity_counter + 1;
  db.prepare('UPDATE users SET currency = currency - ?, total_pulls = total_pulls + 1, pity_counter = ? WHERE id = ?')
    .run(PULL_COST, newPity, userId);

  initCharacterSkills(userId, inv.lastInsertRowid, character.id);

  return {
    inventoryId: inv.lastInsertRowid,
    character: { ...character },
    rarity,
    isNew: db.prepare('SELECT COUNT(*) as cnt FROM inventory WHERE user_id = ? AND character_id = ?').get(userId, character.id).cnt === 1
  };
}

// --- API ---

// 활성 배너 목록
router.get('/banners', (req, res) => {
  const banners = getActiveBanners().map(b => ({
    id: b.id,
    name: b.name,
    type: b.type,
    description: b.description,
    image: b.image,
    featuredCharIds: b.featuredCharIds || [],
    rates: b.rates || DEFAULT_RATES,
    startDate: b.startDate,
    endDate: b.endDate
  }));
  res.json({ banners });
});

// 단일 뽑기
router.post('/pull', authMiddleware, (req, res) => {
  const { bannerId } = req.body || {};
  const banner = bannerId ? getBannerById(bannerId) : getActiveBanners()[0];
  if (!banner) return res.status(400).json({ error: '유효하지 않은 배너입니다' });

  const user = db.prepare('SELECT currency FROM users WHERE id = ?').get(req.user.id);
  if (user.currency < PULL_COST) return res.status(400).json({ error: '재화가 부족합니다', needed: PULL_COST, have: user.currency });

  const result = executePull(req.user.id, banner);
  const updated = db.prepare('SELECT currency, pity_counter FROM users WHERE id = ?').get(req.user.id);

  try { require('./stage').progressMission(req.user.id, 'gacha', 1); } catch {}

  res.json({ result, currency: updated.currency, pityCounter: updated.pity_counter });
});

// 10연차
router.post('/pull10', authMiddleware, (req, res) => {
  const { bannerId } = req.body || {};
  const banner = bannerId ? getBannerById(bannerId) : getActiveBanners()[0];
  if (!banner) return res.status(400).json({ error: '유효하지 않은 배너입니다' });

  const user = db.prepare('SELECT currency FROM users WHERE id = ?').get(req.user.id);
  if (user.currency < MULTI_PULL_COST) return res.status(400).json({ error: '재화가 부족합니다', needed: MULTI_PULL_COST, have: user.currency });

  const results = [];
  for (let i = 0; i < MULTI_PULL_COUNT; i++) {
    results.push(executePull(req.user.id, banner));
  }

  const updated = db.prepare('SELECT currency, pity_counter FROM users WHERE id = ?').get(req.user.id);

  // 10연차 R 이상 보장
  const hasR = results.some(r => r.rarity !== 'N');
  if (!hasR) {
    const rChar = pickCharacter('R', banner);
    const last = results[results.length - 1];
    db.prepare('UPDATE inventory SET character_id = ? WHERE id = ?').run(rChar.id, last.inventoryId);
    db.prepare('UPDATE pull_log SET character_id = ?, rarity = ? WHERE user_id = ? AND character_id = ? ORDER BY id DESC LIMIT 1')
      .run(rChar.id, 'R', req.user.id, last.character.id);
    results[results.length - 1] = { ...last, character: rChar, rarity: 'R' };
  }

  res.json({ results, currency: updated.currency, pityCounter: updated.pity_counter });
});

// 확률표
router.get('/rates', (req, res) => {
  const { bannerId } = req.query;
  const banner = bannerId ? getBannerById(bannerId) : null;
  const rates = banner?.rates || DEFAULT_RATES;
  const characters = db.prepare('SELECT id, name, rarity, title FROM characters ORDER BY CASE rarity WHEN "SSR" THEN 1 WHEN "SR" THEN 2 WHEN "R" THEN 3 ELSE 4 END').all();
  res.json({ rates, pityThreshold: PITY_THRESHOLD, characters, pullCost: PULL_COST, featuredCharIds: banner?.featuredCharIds || [] });
});

// ============ 스킬 가챠 ============

const skillGachaCfg = gameConfig.skillGacha;
const SKILL_PULL_COST = skillGachaCfg.pullCost;
const SKILL_MULTI_COUNT = skillGachaCfg.multiPullCount;
const SKILL_RATES = skillGachaCfg.rates;

function rollSkillRarity() {
  const rand = Math.random();
  let cumulative = 0;
  for (const [rarity, rate] of Object.entries(SKILL_RATES)) {
    cumulative += rate;
    if (rand < cumulative) return rarity;
  }
  return 'faint';
}

function pickSkill(rarity) {
  const skills = db.prepare('SELECT * FROM skills WHERE rarity = ?').all(rarity);
  if (skills.length === 0) {
    const all = db.prepare('SELECT * FROM skills').all();
    return all[Math.floor(Math.random() * all.length)];
  }
  return skills[Math.floor(Math.random() * skills.length)];
}

function executeSkillPull(userId) {
  const rarity = rollSkillRarity();
  const skill = pickSkill(rarity);

  const inv = db.prepare('INSERT INTO skill_inventory (user_id, skill_id, obtained_from) VALUES (?, ?, ?)')
    .run(userId, skill.id, 'gacha');

  db.prepare('UPDATE users SET currency = currency - ? WHERE id = ?').run(SKILL_PULL_COST, userId);

  return {
    skillInventoryId: inv.lastInsertRowid,
    skill: { id: skill.id, name: skill.name, type: skill.type, rarity: skill.rarity, description: skill.description,
             cost: skill.cost, power: skill.power, element: skill.element },
    rarity: skill.rarity,
  };
}

// 스킬 단일 뽑기
router.post('/skill-pull', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT currency FROM users WHERE id = ?').get(req.user.id);
  if (user.currency < SKILL_PULL_COST) return res.status(400).json({ error: '재화가 부족합니다', needed: SKILL_PULL_COST, have: user.currency });

  const result = executeSkillPull(req.user.id);
  const updated = db.prepare('SELECT currency FROM users WHERE id = ?').get(req.user.id);

  res.json({ result, currency: updated.currency });
});

// 스킬 10연차
router.post('/skill-pull10', authMiddleware, (req, res) => {
  const totalCost = SKILL_PULL_COST * SKILL_MULTI_COUNT;
  const user = db.prepare('SELECT currency FROM users WHERE id = ?').get(req.user.id);
  if (user.currency < totalCost) return res.status(400).json({ error: '재화가 부족합니다', needed: totalCost, have: user.currency });

  const results = [];
  for (let i = 0; i < SKILL_MULTI_COUNT; i++) {
    results.push(executeSkillPull(req.user.id));
  }

  // 10연차 pale 이상 보장
  const hasPale = results.some(r => r.rarity !== 'faint');
  if (!hasPale) {
    const last = results[results.length - 1];
    const paleSkill = pickSkill('pale');
    db.prepare('UPDATE skill_inventory SET skill_id = ? WHERE id = ?').run(paleSkill.id, last.skillInventoryId);
    results[results.length - 1] = {
      ...last,
      skill: { id: paleSkill.id, name: paleSkill.name, type: paleSkill.type, rarity: paleSkill.rarity,
               description: paleSkill.description, cost: paleSkill.cost, power: paleSkill.power, element: paleSkill.element },
      rarity: paleSkill.rarity,
    };
  }

  const updated = db.prepare('SELECT currency FROM users WHERE id = ?').get(req.user.id);
  res.json({ results, currency: updated.currency });
});

// 스킬 가챠 확률표
router.get('/skill-rates', (req, res) => {
  res.json({ rates: SKILL_RATES, pullCost: SKILL_PULL_COST, multiPullCount: SKILL_MULTI_COUNT });
});

module.exports = router;
module.exports.loadBanners = loadBanners;
module.exports.saveBanners = saveBanners;
