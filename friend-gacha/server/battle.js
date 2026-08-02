/**
 * 턴 노트 기반 전투 엔진
 * 
 * 핵심 메커니즘:
 * - 각 캐릭터는 turn_notes (행동 자원)를 가짐
 * - 모든 행동(공격/방어/궁극기 등)은 턴 노트 소비
 * - 자기 턴에 노트 남으면 계속 행동 가능 / 아껴서 턴 종료 가능
 * - 공격 받으면 방어 리액션 가능 (턴 노트 소비)
 * - 방어 못하면 +50% 추가 피해 (무방비 패널티)
 * - 턴 사이클 종료 시 모든 노트 풀 회복
 */

const gameConfig = require('../gameConfig.json');

// gameConfig에서 속성 상성 테이블 생성
const ELEMENT_CHART = {};
for (const [key, val] of Object.entries(gameConfig.elements)) {
  ELEMENT_CHART[key] = { strong: val.strong, weak: val.weak };
}

const elemMults = gameConfig.elementMultipliers;
function getElementMultiplier(atkElem, defElem) {
  const chart = ELEMENT_CHART[atkElem] || ELEMENT_CHART.neutral;
  if (chart.strong === defElem) {
    return (defElem === 'light' || defElem === 'dark') ? elemMults.lightDark : elemMults.normal;
  }
  if (chart.weak === defElem) {
    return (defElem === 'light' || defElem === 'dark') ? elemMults.lightDarkResist : elemMults.normalResist;
  }
  return 1.0;
}

const growthCfg = gameConfig.growth;

// 레벨/각성/승급에 따른 스탯 계산 (순수 base stat 기반, 레어도 배율 없음)
function calcStats(char, level, awakening, promotion) {
  const lvlMult = 1 + (level - 1) * growthCfg.statGrowthPerLevel;
  const awkMult = 1 + awakening * growthCfg.statGrowthPerAwakening;
  const promoMult = 1 + (promotion || 0) * (growthCfg.promotion?.statGrowthPerPromotion || 0);
  return {
    hp:  Math.round(char.base_hp  * lvlMult * awkMult * promoMult),
    atk: Math.round(char.base_atk * lvlMult * awkMult * promoMult),
    def: Math.round(char.base_def * lvlMult * awkMult * promoMult),
    spd: Math.round(char.base_spd * (1 + (level - 1) * growthCfg.spdGrowthPerLevel)),
  };
}

/**
 * 전투 유닛 생성
 * @param {Object} charData - 캐릭터 데이터
 * @param {number} level
 * @param {number} awakening
 * @param {boolean} isEnemy
 * @param {Array} equippedSkills - 장착된 스킬 배열 [{name, type, cost, power, element, target, defense_mult, extra}]
 */
const hotRequire = require('./hotRequire');
const loadPromotions = () => hotRequire('promotions');

function createUnit(charData, level = 1, awakening = 0, isEnemy = false, equippedSkills = [], talent = null, promotion = 0) {
  const stats = isEnemy
    ? { hp: charData.hp, atk: charData.atk, def: charData.def, spd: charData.spd }
    : calcStats(charData, level, awakening, promotion);

  const turnNotes = charData.turn_notes || (isEnemy ? 3 : 4);
  let noteBonus = 0;

  if (!isEnemy) {
    // 레벨 보너스: 10렙당 +1
    noteBonus += Math.floor(level / 10);
    // 각성 보너스: 각성당 +2
    noteBonus += awakening * 2;
    // 승급 보너스: 티어별 bonusNotes
    if (promotion > 0) {
      const promoData = loadPromotions();
      const tiers = promoData[charData.character_id || charData.id]?.tiers || [];
      for (let i = 0; i < Math.min(promotion, tiers.length); i++) {
        noteBonus += (tiers[i].bonusNotes || 0);
      }
    }
  }

  // stat_boost / note_bonus → 클라이언트 Effect 시스템으로 이관됨 (StatBoostPassive, NoteBonusPassive)

  return {
    id: charData.id || charData.name,
    characterId: charData.character_id || charData.id || null,
    name: charData.name,
    element: charData.element || 'neutral',
    origin: charData.origin || null,
    rarity: charData.rarity || 'N',
    isEnemy,
    isBoss: charData.isBoss || false,
    aiType: charData.ai_type || charData.aiType || 'basic',
    maxHp: stats.hp, hp: stats.hp,
    atk: stats.atk, def: stats.def, spd: stats.spd,
    maxNotes: turnNotes + noteBonus, notes: turnNotes + noteBonus,
    skills: isEnemy ? (charData.skills || []) : equippedSkills,
    image_sd: charData.image_sd || null,
    image_url: charData.image_url || null,
    talent: talent || null,
    buffs: [], debuffs: [], alive: true,
  };
}

// 버프/디버프 적용된 최종 스탯
function getEffectiveStat(unit, statName) {
  let base = unit[statName];
  for (const b of unit.buffs) {
    if (b.stat === statName) base = Math.round(base * (1 + b.amount));
  }
  for (const d of unit.debuffs) {
    if (d.stat === statName) base = Math.round(base * (1 - d.amount));
  }
  return Math.max(1, base);
}

const battleCfg = gameConfig.battle;

// 데미지 계산
function calcDamage(attacker, defender, power, skillElement) {
  const atk = getEffectiveStat(attacker, 'atk');
  const def = getEffectiveStat(defender, 'def');
  const baseDmg = atk * power;
  const defReduction = baseDmg * (100 / (100 + def));
  const elemMult = getElementMultiplier(skillElement || attacker.element, defender.element);
  const variance = battleCfg.varianceMin + Math.random() * (battleCfg.varianceMax - battleCfg.varianceMin);
  const crit = Math.random() < battleCfg.critRate ? battleCfg.critMultiplier : 1.0;
  return {
    damage: Math.round(defReduction * elemMult * variance * crit),
    isCrit: crit > 1,
    elemMult,
  };
}

// 데미지 계산 (DEF 무시 버전)
function calcDamageIgnoreDef(attacker, power, skillElement, defenderElement) {
  const atk = getEffectiveStat(attacker, 'atk');
  const baseDmg = atk * power;
  const elemMult = getElementMultiplier(skillElement || attacker.element, defenderElement);
  const variance = battleCfg.varianceMin + Math.random() * (battleCfg.varianceMax - battleCfg.varianceMin);
  const crit = Math.random() < battleCfg.critRate ? battleCfg.critMultiplier : 1.0;
  return {
    damage: Math.round(baseDmg * elemMult * variance * crit),
    isCrit: crit > 1,
    elemMult,
  };
}

/**
 * 전투 셋업 정보 생성 (클라이언트에 전달)
 * 실제 전투는 클라이언트에서 인터랙티브로 진행
 */
function createBattleSetup(partyUnits, enemyUnits, tagCounts = {}) {
  return {
    party: partyUnits.map(u => serializeUnit(u, tagCounts)),
    enemies: enemyUnits.map(u => serializeUnit(u)),
    elementChart: ELEMENT_CHART,
  };
}

function meetsTagCondition(cond, tagCounts) {
  if (!cond) return true;
  return (tagCounts[cond.tag] || 0) >= (cond.min || 1);
}

function serializeUnit(u, tagCounts) {
  let talent = u.talent || null;
  if (talent?.effects && tagCounts) {
    talent = { ...talent, effects: talent.effects.filter(eff => meetsTagCondition(eff.tagCondition, tagCounts)) };
  }

  return {
    id: u.id, characterId: u.characterId || null, name: u.name, element: u.element, origin: u.origin, rarity: u.rarity,
    isEnemy: u.isEnemy, isBoss: u.isBoss, aiType: u.aiType || 'basic',
    maxHp: u.maxHp, hp: u.hp, atk: u.atk, def: u.def, spd: u.spd,
    maxNotes: u.maxNotes, notes: u.notes,
    image_sd: u.image_sd || null,
    image_url: u.image_url || null,
    skills: u.skills.map(s => {
      const extra = typeof s.extra === 'string' ? JSON.parse(s.extra || '{}') : (s.extra || {});
      const { effectIds, ...restExtra } = extra;
      const filtered = (effectIds || []).filter(e =>
        typeof e !== 'object' || meetsTagCondition(e.tagCondition, tagCounts)
      );
      return {
        id: s.id, name: s.name, description: s.description || '', icon: s.icon || '', type: s.type, cost: s.cost, power: s.power || 0,
        element: s.element || u.element, target: s.target,
        defense_mult: s.defense_mult || 0, cooldown: s.cooldown || 0,
        extra: restExtra,
        effectIds: filtered,
      };
    }),
    buffs: u.buffs, debuffs: u.debuffs, alive: u.alive,
    talent,
    tags: u.tags || [],
  };
}

/**
 * 전투 결과 검증 (서버 사이드 - 기본 검증만)
 * 친구 내수용이니 빡빡한 검증은 안 하고, 기본 무결성만 체크
 */
function validateBattleResult(battleLog, partyCount, enemyCount) {
  if (!battleLog || !Array.isArray(battleLog.actions)) return false;
  if (typeof battleLog.result !== 'string') return false;
  if (!['victory', 'defeat'].includes(battleLog.result)) return false;
  if (typeof battleLog.totalDamage !== 'number') return false;
  if (typeof battleLog.turnCycles !== 'number') return false;
  return true;
}

module.exports = {
  createUnit, calcStats, getElementMultiplier, calcDamage, calcDamageIgnoreDef,
  createBattleSetup, validateBattleResult, serializeUnit,
  getEffectiveStat, ELEMENT_CHART,
};
