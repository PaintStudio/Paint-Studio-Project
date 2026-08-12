const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const { userLog } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const gameConfig = require('../../gameConfig.json');
const router = express.Router();

let gachaCfg = gameConfig.gacha;

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
  if (pityCounter >= gachaCfg.pityThreshold) return 'SSR';

  const baseRates = banner?.rates || gachaCfg.rates;
  let rates = { ...baseRates };

  if (pityCounter >= gachaCfg.softPityStart) {
    const bonus = (pityCounter - gachaCfg.softPityStart + 1) * gachaCfg.softPityBonusPerPull;
    rates.SSR = Math.min((rates.SSR || gachaCfg.rates.SSR) + bonus, 1.0);
    const total = rates.SSR;
    const remaining = 1 - total;
    const oldRemaining = (baseRates.N || gachaCfg.rates.N) + (baseRates.R || gachaCfg.rates.R) + (baseRates.SR || gachaCfg.rates.SR);
    rates.N = (baseRates.N || gachaCfg.rates.N) * (remaining / oldRemaining);
    rates.R = (baseRates.R || gachaCfg.rates.R) * (remaining / oldRemaining);
    rates.SR = (baseRates.SR || gachaCfg.rates.SR) * (remaining / oldRemaining);
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
    chars = db.prepare(`SELECT * FROM characters WHERE rarity = ? AND is_released = 1 AND id IN (${placeholders})`).all(rarity, ...banner.characterPool);
    // 풀에 해당 등급이 없으면 전체에서
    if (chars.length === 0) {
      chars = db.prepare('SELECT * FROM characters WHERE rarity = ? AND is_released = 1').all(rarity);
    }
  } else {
    chars = db.prepare('SELECT * FROM characters WHERE rarity = ? AND is_released = 1').all(rarity);
  }

  // 픽업 캐릭터 확률 업
  if (banner && banner.featuredCharIds && banner.featuredCharIds.length > 0 && banner.featuredRateUp > 0) {
    const featured = chars.filter(c => banner.featuredCharIds.includes(c.id));
    if (featured.length > 0) {
      if (Math.random() < banner.featuredRateUp) {
        return featured[Math.floor(Math.random() * featured.length)];
      }
      chars = chars.filter(c => !banner.featuredCharIds.includes(c.id));
    }
  }

  if (chars.length === 0) {
    const fallback = db.prepare('SELECT * FROM characters WHERE is_released = 1 ORDER BY RANDOM() LIMIT 1').get();
    return fallback;
  }
  return chars[Math.floor(Math.random() * chars.length)];
}

const { initCharacterSkills } = require('../db');

// 단일 뽑기 실행
function executePull(userId, banner, free = false) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  const costDeduct = free ? 0 : gachaCfg.pullCost;
  if (costDeduct > 0 && user.currency < costDeduct) {
    throw new Error('재화가 부족합니다');
  }

  const rarity = rollRarity(user.pity_counter, banner);
  const character = pickCharacter(rarity, banner);
  const newPity = rarity === 'SSR' ? 0 : user.pity_counter + 1;

  const doPull = db.transaction(() => {
    db.prepare('UPDATE users SET currency = currency - ?, total_pulls = total_pulls + 1, pity_counter = ? WHERE id = ?')
      .run(costDeduct, newPity, userId);
    const autoLock = (rarity === 'SSR' || rarity === 'CR') ? 1 : 0;
    const inv = db.prepare('INSERT INTO inventory (user_id, character_id, is_locked) VALUES (?, ?, ?)').run(userId, character.id, autoLock);
    db.prepare('INSERT INTO pull_log (user_id, character_id, rarity) VALUES (?, ?, ?)').run(userId, character.id, rarity);
    return inv;
  });

  const inv = doPull();

  try { initCharacterSkills(userId, inv.lastInsertRowid, character.id); } catch (e) {
    console.error('[가챠] 스킬 초기화 실패:', e.message);
  }

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
    rates: b.rates || gachaCfg.rates,
    startDate: b.startDate,
    endDate: b.endDate,
    showTitle: b.showTitle !== undefined ? b.showTitle : true,
    showRates: b.showRates !== undefined ? b.showRates : true,
  }));
  res.json({ banners });
});

// 단일 뽑기
router.post('/pull', authMiddleware, (req, res) => {
  try {
    const { bannerId } = req.body || {};
    const banner = bannerId ? getBannerById(bannerId) : getActiveBanners()[0];
    if (!banner) return res.status(400).json({ error: '유효하지 않은 배너입니다' });

    const user = db.prepare('SELECT currency, tutorial_step, total_pulls FROM users WHERE id = ?').get(req.user.id);
    const isTutorialFree = (user.tutorial_step || 0) < 3 && user.total_pulls === 0;
    if (!isTutorialFree && user.currency < gachaCfg.pullCost) return res.status(400).json({ error: '재화가 부족합니다', needed: gachaCfg.pullCost, have: user.currency });

    const result = executePull(req.user.id, banner, isTutorialFree);
    const updated = db.prepare('SELECT currency, pity_counter FROM users WHERE id = ?').get(req.user.id);

    userLog(req.user.id, 'pull', { banner: banner.name, rarity: result.rarity, characterId: result.character.id, characterName: result.character.name });

    try { require('./stage').progressMission(req.user.id, 'gacha', 1); } catch {}

    res.json({ result, currency: updated.currency, pityCounter: updated.pity_counter });
  } catch (err) {
    console.error('[가챠] 뽑기 오류:', err.message);
    res.status(500).json({ error: '뽑기 중 오류가 발생했습니다' });
  }
});

// 10연차
router.post('/pull10', authMiddleware, (req, res) => {
  try {
    const { bannerId } = req.body || {};
    const banner = bannerId ? getBannerById(bannerId) : getActiveBanners()[0];
    if (!banner) return res.status(400).json({ error: '유효하지 않은 배너입니다' });

    const multiCost = gachaCfg.pullCost * gachaCfg.multiPullCount;
    const user = db.prepare('SELECT currency FROM users WHERE id = ?').get(req.user.id);
    if (user.currency < multiCost) return res.status(400).json({ error: '재화가 부족합니다', needed: multiCost, have: user.currency });

    const results = [];
    for (let i = 0; i < gachaCfg.multiPullCount; i++) {
      results.push(executePull(req.user.id, banner));
    }

    const updated = db.prepare('SELECT currency, pity_counter FROM users WHERE id = ?').get(req.user.id);

    // 10연차 SR 이상 보장
    const hasSR = results.some(r => r.rarity !== 'N' && r.rarity !== 'R');
    if (!hasSR) {
      const srChar = pickCharacter('SR', banner);
      if (srChar) {
        const last = results[results.length - 1];
        db.prepare('UPDATE inventory SET character_id = ? WHERE id = ?').run(srChar.id, last.inventoryId);
        db.prepare('UPDATE pull_log SET character_id = ?, rarity = ? WHERE id = (SELECT id FROM pull_log WHERE user_id = ? AND character_id = ? ORDER BY id DESC LIMIT 1)')
          .run(srChar.id, 'SR', req.user.id, last.character.id);
        const oldSiIds = db.prepare('SELECT skill_inventory_id FROM equipped_skills WHERE inventory_id = ? AND skill_inventory_id IS NOT NULL').all(last.inventoryId).map(r => r.skill_inventory_id);
        db.prepare('DELETE FROM equipped_skills WHERE inventory_id = ?').run(last.inventoryId);
        for (const siId of oldSiIds) db.prepare('DELETE FROM skill_inventory WHERE id = ? AND user_id = ?').run(siId, req.user.id);
        db.prepare('UPDATE inventory SET skills_initialized = 0 WHERE id = ?').run(last.inventoryId);
        try { initCharacterSkills(req.user.id, last.inventoryId, srChar.id); } catch (e) {
          console.error('[가챠] SR보장 스킬 재초기화 실패:', e.message);
        }
        results[results.length - 1] = { ...last, character: srChar, rarity: 'SR' };
      }
    }

    userLog(req.user.id, 'pull10', { banner: banner.name, results: results.map(r => ({ rarity: r.rarity, characterId: r.character.id, characterName: r.character.name })) });

    res.json({ results, currency: updated.currency, pityCounter: updated.pity_counter });
  } catch (err) {
    console.error('[가챠] 10연차 오류:', err.message);
    res.status(500).json({ error: '뽑기 중 오류가 발생했습니다' });
  }
});

// 확률표
router.get('/rates', (req, res) => {
  const { bannerId } = req.query;
  const banner = bannerId ? getBannerById(bannerId) : null;
  const rates = banner?.rates || gachaCfg.rates;

  let characters;
  if (banner && banner.characterPool !== 'all' && Array.isArray(banner.characterPool) && banner.characterPool.length > 0) {
    const placeholders = banner.characterPool.map(() => '?').join(',');
    characters = db.prepare(`SELECT id, name, rarity, title, image_url FROM characters WHERE is_released = 1 AND id IN (${placeholders}) ORDER BY CASE rarity WHEN "CR" THEN 0 WHEN "SSR" THEN 1 WHEN "SR" THEN 2 WHEN "R" THEN 3 ELSE 4 END, name`).all(...banner.characterPool);
  } else {
    characters = db.prepare('SELECT id, name, rarity, title, image_url FROM characters WHERE is_released = 1 ORDER BY CASE rarity WHEN "CR" THEN 0 WHEN "SSR" THEN 1 WHEN "SR" THEN 2 WHEN "R" THEN 3 ELSE 4 END, name').all();
  }

  res.json({ rates, pityThreshold: gachaCfg.pityThreshold, characters, pullCost: gachaCfg.pullCost, featuredCharIds: banner?.featuredCharIds || [], featuredRateUp: banner?.featuredRateUp || 0 });
});

// ============ 스킬 가챠 ============

let skillGachaCfg = gameConfig.skillGacha;

const SKILL_BANNERS_PATH = path.join(__dirname, '..', '..', 'skillBanners.json');

function loadSkillBanners() {
  try {
    return JSON.parse(fs.readFileSync(SKILL_BANNERS_PATH, 'utf-8'));
  } catch { return { banners: [] }; }
}

function saveSkillBanners(data) {
  fs.writeFileSync(SKILL_BANNERS_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function getActiveSkillBanners() {
  const { banners } = loadSkillBanners();
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

function getSkillBannerById(bannerId) {
  return getActiveSkillBanners().find(b => b.id === bannerId);
}

function rollSkillRarity(banner) {
  const baseRates = banner?.rates || skillGachaCfg.rates;
  const rand = Math.random();
  let cumulative = 0;
  for (const [rarity, rate] of Object.entries(baseRates)) {
    cumulative += rate;
    if (rand < cumulative) return rarity;
  }
  return 'faint';
}

function pickSkill(rarity, banner) {
  let skills;
  if (banner && banner.skillPool !== 'all' && Array.isArray(banner.skillPool) && banner.skillPool.length > 0) {
    const placeholders = banner.skillPool.map(() => '?').join(',');
    skills = db.prepare(`SELECT * FROM skills WHERE rarity = ? AND type != 'ultimate' AND id IN (${placeholders})`).all(rarity, ...banner.skillPool);
    if (skills.length === 0) {
      skills = db.prepare("SELECT * FROM skills WHERE rarity = ? AND obtainable = 1 AND type != 'ultimate'").all(rarity);
    }
  } else {
    skills = db.prepare("SELECT * FROM skills WHERE rarity = ? AND obtainable = 1 AND type != 'ultimate'").all(rarity);
  }

  if (banner && banner.featuredSkillIds && banner.featuredSkillIds.length > 0 && banner.featuredRateUp > 0) {
    const featured = skills.filter(s => banner.featuredSkillIds.includes(s.id));
    if (featured.length > 0 && Math.random() < banner.featuredRateUp) {
      return featured[Math.floor(Math.random() * featured.length)];
    }
  }

  if (skills.length === 0) {
    const fallback = db.prepare("SELECT * FROM skills WHERE obtainable = 1 AND type != 'ultimate' ORDER BY RANDOM() LIMIT 1").get();
    return fallback;
  }
  return skills[Math.floor(Math.random() * skills.length)];
}

function executeSkillPull(userId, banner) {
  const cost = banner?.pullCost ?? skillGachaCfg.pullCost;
  const user = db.prepare('SELECT currency FROM users WHERE id = ?').get(userId);
  if (user.currency < cost) {
    throw new Error('재화가 부족합니다');
  }

  const rarity = rollSkillRarity(banner);
  const skill = pickSkill(rarity, banner);

  const doPull = db.transaction(() => {
    db.prepare('UPDATE users SET currency = currency - ? WHERE id = ?').run(cost, userId);
    const inv = db.prepare('INSERT INTO skill_inventory (user_id, skill_id, obtained_from) VALUES (?, ?, ?)')
      .run(userId, skill.id, 'gacha');
    return inv;
  });

  const inv = doPull();

  return {
    skillInventoryId: inv.lastInsertRowid,
    skill: { id: skill.id, name: skill.name, type: skill.type, rarity: skill.rarity, description: skill.description,
             cost: skill.cost, power: skill.power, element: skill.element },
    rarity: skill.rarity,
  };
}

// 활성 스킬 배너 목록
router.get('/skill-banners', (req, res) => {
  const banners = getActiveSkillBanners().map(b => ({
    id: b.id,
    name: b.name,
    type: b.type,
    description: b.description,
    image: b.image,
    featuredSkillIds: b.featuredSkillIds || [],
    rates: b.rates || skillGachaCfg.rates,
    startDate: b.startDate,
    endDate: b.endDate,
    pullCost: b.pullCost ?? skillGachaCfg.pullCost,
    showTitle: b.showTitle !== undefined ? b.showTitle : true,
    showRates: b.showRates !== undefined ? b.showRates : true,
  }));
  res.json({ banners });
});

// 스킬 단일 뽑기
router.post('/skill-pull', authMiddleware, (req, res) => {
  try {
    const { bannerId } = req.body || {};
    const banner = bannerId ? getSkillBannerById(bannerId) : getActiveSkillBanners()[0];
    if (!banner) return res.status(400).json({ error: '유효하지 않은 스킬 배너입니다' });

    const cost = banner.pullCost ?? skillGachaCfg.pullCost;
    const user = db.prepare('SELECT currency FROM users WHERE id = ?').get(req.user.id);
    if (user.currency < cost) return res.status(400).json({ error: '재화가 부족합니다', needed: cost, have: user.currency });

    const result = executeSkillPull(req.user.id, banner);
    const updated = db.prepare('SELECT currency FROM users WHERE id = ?').get(req.user.id);

    res.json({ result, currency: updated.currency });
  } catch (err) {
    console.error('[스킬가챠] 뽑기 오류:', err.message);
    res.status(500).json({ error: '뽑기 중 오류가 발생했습니다' });
  }
});

// 스킬 10연차
router.post('/skill-pull10', authMiddleware, (req, res) => {
  try {
    const { bannerId } = req.body || {};
    const banner = bannerId ? getSkillBannerById(bannerId) : getActiveSkillBanners()[0];
    if (!banner) return res.status(400).json({ error: '유효하지 않은 스킬 배너입니다' });

    const cost = banner.pullCost ?? skillGachaCfg.pullCost;
    const multiCount = skillGachaCfg.multiPullCount;
    const totalCost = cost * multiCount;
    const user = db.prepare('SELECT currency FROM users WHERE id = ?').get(req.user.id);
    if (user.currency < totalCost) return res.status(400).json({ error: '재화가 부족합니다', needed: totalCost, have: user.currency });

    const results = [];
    for (let i = 0; i < multiCount; i++) {
      results.push(executeSkillPull(req.user.id, banner));
    }

    // 10연차 pale 이상 보장
    const hasPale = results.some(r => r.rarity !== 'faint');
    if (!hasPale) {
      const last = results[results.length - 1];
      const paleSkill = pickSkill('pale', banner);
      if (paleSkill) {
        db.prepare('UPDATE skill_inventory SET skill_id = ? WHERE id = ?').run(paleSkill.id, last.skillInventoryId);
        results[results.length - 1] = {
          ...last,
          skill: { id: paleSkill.id, name: paleSkill.name, type: paleSkill.type, rarity: paleSkill.rarity,
                   description: paleSkill.description, cost: paleSkill.cost, power: paleSkill.power, element: paleSkill.element },
          rarity: paleSkill.rarity,
        };
      }
    }

    const updated = db.prepare('SELECT currency FROM users WHERE id = ?').get(req.user.id);
    res.json({ results, currency: updated.currency });
  } catch (err) {
    console.error('[스킬가챠] 10연차 오류:', err.message);
    res.status(500).json({ error: '뽑기 중 오류가 발생했습니다' });
  }
});

// 스킬 가챠 확률표
router.get('/skill-rates', (req, res) => {
  const { bannerId } = req.query;
  const banner = bannerId ? getSkillBannerById(bannerId) : null;
  const rates = banner?.rates || skillGachaCfg.rates;
  const allSkills = db.prepare('SELECT id, name, type, rarity, description FROM skills WHERE obtainable = 1 ORDER BY CASE rarity WHEN "iridescent" THEN 1 WHEN "deep" THEN 2 WHEN "pale" THEN 3 ELSE 4 END').all();
  res.json({ rates, pullCost: banner?.pullCost ?? skillGachaCfg.pullCost, multiPullCount: skillGachaCfg.multiPullCount, skills: allSkills, featuredSkillIds: banner?.featuredSkillIds || [] });
});

// 설정 핫 리로드
function reloadConfig() {
  delete require.cache[require.resolve('../../gameConfig.json')];
  const fresh = require('../../gameConfig.json');
  gachaCfg = fresh.gacha;
  skillGachaCfg = fresh.skillGacha;
}

module.exports = router;
module.exports.loadBanners = loadBanners;
module.exports.saveBanners = saveBanners;
module.exports.loadSkillBanners = loadSkillBanners;
module.exports.saveSkillBanners = saveSkillBanners;
module.exports.reloadConfig = reloadConfig;
