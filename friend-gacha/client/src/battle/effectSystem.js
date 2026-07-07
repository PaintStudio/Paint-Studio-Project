// ═══════════════════════════════════════════════════
//  Effect System — Unity C#-style ID-based effect architecture
//
//  Usage:
//    class MyEffect extends Effect {
//      static ID = 101;
//      onCycleStart({ unit }) { ... }
//      modifyDamageDealt(value, { attacker }) { ... }
//    }
//    registerEffect(MyEffect);
//
//  내부 변수:
//    this.state.myVar = 10;  // 전투 중 유지, 전투 종료시 자동 초기화
//    this.params.value       // 데이터에서 넘어온 설정값 (읽기 전용)
//
//  Hooks:
//    runCalc('hookName', units, value, ctx) — calc modifier chain
//    runEvent('hookName', units, ctx) — event handler, returns results[]
// ═══════════════════════════════════════════════════

// 전투 컨텍스트 (BattlePage에서 setBattleContext로 설정)
let _bctxParty = [];
let _bctxEnemies = [];

function setBattleContext(party, enemies) {
  _bctxParty = party;
  _bctxEnemies = enemies;
}

function getBattleContext() {
  return { party: _bctxParty, enemies: _bctxEnemies };
}

function getEffStat(unit, stat) {
  let base = unit[stat];
  if (stat === 'atk') {
    const babel = (unit.combatStacks || {})._babelStacks || 0;
    if (babel > 0) base = Math.round(base * (1 + babel * 0.2));
  }
  base = runCalc('modifyStat', [unit], base, { stat, unit, party: _bctxParty, enemies: _bctxEnemies });
  return Math.max(1, base);
}

// 전투 중 Effect 인스턴스별 내부 상태 저장소
// 키: "unitId_effectId" (talent/status) 또는 "unitId_effectId_skillId" (skill extra)
const EFFECT_STATE = new Map();

// 동적 버프/디버프 저장소 (전투 중 부여/해제)
// unitId → [{ effectId, args, label, turns, skillId, skillName, casterId }]
const DYNAMIC_BUFFS = new Map();
const DYNAMIC_DEBUFFS = new Map();
const BUFF_MAX = 5;
const DEBUFF_MAX = 5;

function getStateKey(unitId, effectId, skillId) {
  return skillId != null ? `${unitId}_${effectId}_${skillId}` : `${unitId}_${effectId}`;
}

function getOrCreateState(unitId, effectId, skillId) {
  const key = getStateKey(unitId, effectId, skillId);
  if (!EFFECT_STATE.has(key)) EFFECT_STATE.set(key, {});
  return EFFECT_STATE.get(key);
}

function clearAllState() {
  EFFECT_STATE.clear();
  DYNAMIC_BUFFS.clear();
  DYNAMIC_DEBUFFS.clear();
}

// ═══════════════════════════════════════════════════
//  동적 버프/디버프 API
//  attachBuff / attachDebuff → 부여 (연장/슬롯 관리 포함)
//  tickBuffs / tickDebuffs   → 사이클 종료 시 턴 감소
//  getBuffs / getDebuffs     → UI 표시용 조회
//  dispelBuffs / cleanse     → 해제
// ═══════════════════════════════════════════════════

const STAT_BUFF_ID = 401;
const STAT_DEBUFF_ID = 402;

// attachBuff — 기존 호환 (stat/amount → args 자동 변환)
function attachBuff(unitId, { effectId, stat, amount, args, turns, skillId, skillName, casterId, label }) {
  const eid = effectId ?? STAT_BUFF_ID;
  const buffArgs = args ?? [stat, amount];
  const buffLabel = label ?? (stat ? `+${stat.toUpperCase()} ${Math.round((amount || 0) * 100)}%` : '버프');
  return _insertBuff(DYNAMIC_BUFFS, BUFF_MAX, unitId, { effectId: eid, args: buffArgs, label: buffLabel, turns, skillId, skillName, casterId });
}

function attachDebuff(unitId, { effectId, stat, amount, args, turns, skillId, skillName, casterId, label }) {
  const eid = effectId ?? STAT_DEBUFF_ID;
  const debuffArgs = args ?? [stat, amount];
  const debuffLabel = label ?? (stat ? `-${stat.toUpperCase()} ${Math.round((amount || 0) * 100)}%` : '디버프');
  return _insertBuff(DYNAMIC_DEBUFFS, DEBUFF_MAX, unitId, { effectId: eid, args: debuffArgs, label: debuffLabel, turns, skillId, skillName, casterId });
}

// addBuff / addDebuff — 새 API (Effect 내부에서 직접 호출)
function addBuff(targetId, effectId, args, { turns = 3, skillId, skillName, casterId, label = '버프' } = {}) {
  return _insertBuff(DYNAMIC_BUFFS, BUFF_MAX, targetId, { effectId, args, label, turns, skillId, skillName, casterId });
}

function addDebuff(targetId, effectId, args, { turns = 3, skillId, skillName, casterId, label = '디버프' } = {}) {
  return _insertBuff(DYNAMIC_DEBUFFS, DEBUFF_MAX, targetId, { effectId, args, label, turns, skillId, skillName, casterId });
}

function _insertBuff(store, max, unitId, entry) {
  let list = [...(store.get(unitId) || [])];
  if (entry.skillId != null) {
    const idx = list.findIndex(b => b.skillId === entry.skillId && b.effectId === entry.effectId);
    if (idx >= 0) {
      list[idx] = { ...entry, turns: list[idx].turns + entry.turns };
      store.set(unitId, list);
      return { buffs: list, extended: true };
    }
  }
  if (list.length >= max) list = list.slice(1);
  list.push(entry);
  store.set(unitId, list);
  return { buffs: list, extended: false };
}

function tickBuffs(unitId) {
  const prev = DYNAMIC_BUFFS.get(unitId) || [];
  const expired = prev.filter(b => b.turns <= 1);
  const remaining = prev.filter(b => b.turns > 1).map(b => ({ ...b, turns: b.turns - 1 }));
  DYNAMIC_BUFFS.set(unitId, remaining);
  return { buffs: remaining, expired };
}

function tickDebuffs(unitId) {
  const prev = DYNAMIC_DEBUFFS.get(unitId) || [];
  const expired = prev.filter(d => d.turns <= 1);
  const remaining = prev.filter(d => d.turns > 1).map(d => ({ ...d, turns: d.turns - 1 }));
  DYNAMIC_DEBUFFS.set(unitId, remaining);
  return { debuffs: remaining, expired };
}

function extendBuffs(unitId, turns) {
  const prev = DYNAMIC_BUFFS.get(unitId) || [];
  if (!prev.length) return prev;
  const extended = prev.map(b => ({ ...b, turns: b.turns + turns }));
  DYNAMIC_BUFFS.set(unitId, extended);
  return extended;
}

function reduceDebuffs(unitId, turns) {
  const prev = DYNAMIC_DEBUFFS.get(unitId) || [];
  if (!prev.length) return { debuffs: [], expired: [] };
  const expired = prev.filter(d => d.turns <= turns);
  const remaining = prev.filter(d => d.turns > turns).map(d => ({ ...d, turns: d.turns - turns }));
  DYNAMIC_DEBUFFS.set(unitId, remaining);
  return { debuffs: remaining, expired };
}

function getBuffs(unitId) {
  return DYNAMIC_BUFFS.get(unitId) || [];
}

function getDebuffs(unitId) {
  return DYNAMIC_DEBUFFS.get(unitId) || [];
}

function dispelBuffs(unitId, count) {
  let buffs = [...(DYNAMIC_BUFFS.get(unitId) || [])];
  buffs = buffs.slice(Math.min(count, buffs.length));
  DYNAMIC_BUFFS.set(unitId, buffs);
  return buffs;
}

function cleanse(unitId, count) {
  let debuffs = [...(DYNAMIC_DEBUFFS.get(unitId) || [])];
  debuffs = debuffs.slice(Math.min(count, debuffs.length));
  DYNAMIC_DEBUFFS.set(unitId, debuffs);
  return debuffs;
}

function cleanseByStat(unitId, stat) {
  const debuffs = [...(DYNAMIC_DEBUFFS.get(unitId) || [])];
  const idx = debuffs.findIndex(d => d.args?.[0] === stat);
  if (idx < 0) return false;
  debuffs.splice(idx, 1);
  DYNAMIC_DEBUFFS.set(unitId, debuffs);
  return true;
}

class Effect {
  constructor(params = {}, state = {}) {
    this.params = params;
    this.state = state;
  }

  getStack(unit, key) {
    return (unit.combatStacks || {})[key] || 0;
  }

  getTracker(unit, key) {
    return (unit.hpLostTrackers || {})[key] || 0;
  }
}

const REGISTRY = {};
const TYPE_MAP = {};
const SKILL_EXTRA_MAP = {};
const STATUS_MAP = {};
const STACK_MAP = {};

function registerEffect(cls) {
  REGISTRY[cls.ID] = cls;
}

function mapType(typeName, effectId) {
  TYPE_MAP[typeName] = effectId;
}

function mapSkillExtra(key, effectId) {
  SKILL_EXTRA_MAP[key] = effectId;
}

function mapStatus(key, effectId) {
  STATUS_MAP[key] = effectId;
}

function mapStack(key, effectId) {
  STACK_MAP[key] = effectId;
}

function getEffects(unit) {
  const results = [];

  for (const eff of (unit.talent?.effects || [])) {
    let id = eff.id ?? eff.effectId;
    if (id == null && eff.type) id = TYPE_MAP[eff.type];
    if (id == null) continue;
    const Cls = REGISTRY[id];
    if (!Cls) continue;
    const params = eff.args || [];
    const state = getOrCreateState(unit.id, Cls.ID);
    results.push({ instance: new Cls(params, state), owner: unit });
  }

  for (const skill of (unit.skills || [])) {
    for (const ref of (skill.effectIds || [])) {
      const isObj = typeof ref === 'object';
      const id = isObj ? ref.id : ref;
      const Cls = REGISTRY[id];
      if (!Cls) continue;
      const params = isObj ? (ref.args || []) : [];
      const state = getOrCreateState(unit.id, Cls.ID, skill.id);
      results.push({ instance: new Cls(params, state), owner: unit, skill });
    }

    // 레거시: extra 키 → mapSkillExtra 매핑 (이관 완료 시 제거)
    for (const [key, val] of Object.entries(skill.extra || {})) {
      const id = SKILL_EXTRA_MAP[key];
      if (id == null) continue;
      const Cls = REGISTRY[id];
      if (!Cls) continue;
      const state = getOrCreateState(unit.id, Cls.ID, skill.id);
      results.push({ instance: new Cls(typeof val === 'object' ? val : [val], state), owner: unit, skill });
    }
  }

  for (const status of (unit.statuses || [])) {
    const id = status.effectId || STATUS_MAP[status.key];
    if (id == null) continue;
    const Cls = REGISTRY[id];
    if (!Cls) continue;
    const state = getOrCreateState(unit.id, Cls.ID);
    results.push({ instance: new Cls(status.params || [], state), owner: unit });
  }

  for (const buff of (DYNAMIC_BUFFS.get(unit.id) || [])) {
    const Cls = REGISTRY[buff.effectId];
    if (!Cls) continue;
    const state = getOrCreateState(unit.id, Cls.ID, buff.skillId);
    results.push({ instance: new Cls(buff.args || [], state), owner: unit });
  }

  for (const debuff of (DYNAMIC_DEBUFFS.get(unit.id) || [])) {
    const Cls = REGISTRY[debuff.effectId];
    if (!Cls) continue;
    const state = getOrCreateState(unit.id, Cls.ID, debuff.skillId);
    results.push({ instance: new Cls(debuff.args || [], state), owner: unit });
  }

  for (const [key, val] of Object.entries(unit.combatStacks || {})) {
    if (!val) continue;
    const effectId = STACK_MAP[key];
    if (effectId == null) continue;
    const Cls = REGISTRY[effectId];
    if (!Cls) continue;
    const state = getOrCreateState(unit.id, Cls.ID);
    results.push({ instance: new Cls(typeof val === 'number' ? [val] : [], state), owner: unit });
  }

  return results;
}

function runCalc(hookName, units, value, ctx = {}) {
  const arr = Array.isArray(units) ? units : [units];
  const allUnits = [...arr];
  if (ctx.party) {
    for (const p of ctx.party) {
      if (p && !arr.some(u => u?.id === p.id)) allUnits.push(p);
    }
  }
  const collected = [];
  for (const unit of allUnits) {
    if (!unit) continue;
    for (const eff of getEffects(unit)) {
      const fn = eff.instance[hookName];
      if (typeof fn !== 'function') continue;
      collected.push(eff);
    }
  }
  collected.sort((a, b) => (a.instance.constructor.PRIORITY || 0) - (b.instance.constructor.PRIORITY || 0));
  for (const { instance, owner, skill } of collected) {
    const r = instance[hookName](value, { ...ctx, owner, modSkill: skill });
    if (r !== undefined && r !== null) value = r;
  }
  return value;
}

function runEvent(hookName, units, ctx = {}) {
  const arr = Array.isArray(units) ? units : [units];
  const collected = [];
  for (const unit of arr) {
    if (!unit) continue;
    for (const eff of getEffects(unit)) {
      const fn = eff.instance[hookName];
      if (typeof fn !== 'function') continue;
      collected.push(eff);
    }
  }
  collected.sort((a, b) => (a.instance.constructor.PRIORITY || 0) - (b.instance.constructor.PRIORITY || 0));
  const results = [];
  for (const { instance, owner, skill } of collected) {
    const r = instance[hookName]({ ...ctx, owner, modSkill: skill });
    if (r) results.push({ ...r, _ownerId: owner.id });
  }
  return results;
}

export {
  Effect, registerEffect, mapType, mapSkillExtra, mapStatus, mapStack,
  runCalc, runEvent, clearAllState, REGISTRY,
  attachBuff, attachDebuff, addBuff, addDebuff,
  tickBuffs, tickDebuffs, extendBuffs, reduceDebuffs,
  getBuffs, getDebuffs, dispelBuffs, cleanse, cleanseByStat,
  BUFF_MAX, DEBUFF_MAX,
  setBattleContext, getBattleContext, getEffStat,
};
