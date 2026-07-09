import React, { useState, useEffect, useRef, useCallback } from 'react';
import './BattlePage.css';

import gameConfig from '@gameConfig';
import { processEffects } from '../utils/skillEffects';
import DialogueBubble from '../components/DialogueBubble';
import { loadDialogues, getSkillLine, getBattleStartLine, getLine } from '../utils/dialogues';
import {
  runCalc, runEvent, clearAllState,
  attachBuff, attachDebuff, tickBuffs, tickDebuffs,
  getBuffs, getDebuffs, dispelBuffs, cleanse,
  BUFF_MAX, DEBUFF_MAX,
  setBattleContext, getBattleContext, getEffStat,
} from '../battle/modSystem';
import {
  getActiveStacks, hasExtraEffects, getExtraTooltips,
  processResults,
  applySkillExtras, applyPostSkillExtras,
  processBuffExtras, findStatusBuffKey, getStatusBuffName,
  processPostAttackExtras,
} from '../battle/battleActions';

const ELEMENT_CHART = {};
for (const [key, val] of Object.entries(gameConfig.elements)) {
  ELEMENT_CHART[key] = { strong: val.strong, weak: val.weak };
}

const ELEM_ICONS = { fire: '&#128293;', water: '&#128167;', wind: '&#127807;', light: '&#10024;', dark: '&#127761;', neutral: '&#9898;' };
const ELEM_LABELS = Object.fromEntries(Object.entries(gameConfig.elements).map(([k, v]) => [k, v.label]));
const SKILL_TYPE_LABELS = {};
for (const [k, v] of Object.entries(gameConfig.skillTypes)) SKILL_TYPE_LABELS[k] = v.label;
const TARGET_LABELS = { single: '단일', aoe: '전체', self: '자신', ally_single: '아군 단일', ally_all: '아군 전체', any_single: '아무나 단일' };
const SCOPE_LABELS = { self: '자신', party: '아군 전체', enemies: '적 전체', target: '대상' };

function describeEffect(eff) {
  const scope = SCOPE_LABELS[eff.scope] || '대상';
  switch (eff.type) {
    case 'noteRecover': return `${scope} 턴 노트 ${eff.amount} 회복`;
    case 'healPercent': return `${scope} HP ${Math.round(eff.percent * 100)}% 회복`;
    case 'buff': return `${scope} ${(eff.stat||'').toUpperCase()} ${Math.round((eff.amount||0) * 100)}% 증가 (${eff.turns||3}턴)`;
    case 'debuff': return `${scope} ${(eff.stat||'').toUpperCase()} ${Math.round((eff.amount||0) * 100)}% 감소 (${eff.turns||3}턴)`;
    case 'cleanse': return `${scope} 디버프 해제`;
    case 'dispel': return `${scope} 버프 해제`;
    case 'mark': return `${scope} 좌표 고정 (${eff.turns||2}턴, ${Math.round((eff.damageRatio||0.1)*100)}% 추가 피해)`;
    case 'applyStatus': return `${scope} ${eff.displayName||eff.statusKey} 부여 (${eff.turns||2}턴)`;
    default: return `${eff.type}`;
  }
}

const _em = gameConfig.elementMultipliers;
function getElemMult(atkElem, defElem) {
  const chart = ELEMENT_CHART[atkElem] || ELEMENT_CHART.neutral;
  if (chart.strong === defElem) return (defElem === 'light' || defElem === 'dark') ? _em.lightDark : _em.normal;
  if (chart.weak === defElem) return (defElem === 'light' || defElem === 'dark') ? _em.lightDarkResist : _em.normalResist;
  return 1.0;
}

function calcDmg(attacker, defender, power, skillElem, ignoreDef = false, isUltimate = false) {
  let atk = getEffStat(attacker, 'atk');
  atk = runCalc('modifyAtk', [attacker], atk, {
    attacker, defender,
    attackerSpd: getEffStat(attacker, 'spd'),
    defenderSpd: getEffStat(defender, 'spd')
  });

  let def = ignoreDef ? 0 : getEffStat(defender, 'def');
  def = runCalc('modifyDef', [attacker], def, { attacker, defender, party: getBattleContext().party });
  def = runCalc('modifyDefAsDefender', [defender], def, { attacker, defender });

  const baseDmg = atk * power;
  const defRed = def > 0 ? baseDmg * (100 / (100 + def)) : baseDmg;
  let elemMult = getElemMult(skillElem || attacker.element, defender.element);
  elemMult = runCalc('modifyElemMult', [attacker], elemMult, { attacker, defender, skillElem });

  const _bc = gameConfig.battle;
  const variance = _bc.varianceMin + Math.random() * (_bc.varianceMax - _bc.varianceMin);
  let critRate = runCalc('modifyCritRate', [attacker, defender], _bc.critRate, { attacker, defender, skillElem, party: getBattleContext().party });
  let crit = Math.random() < critRate ? _bc.critMultiplier : 1.0;
  if (crit > 1) crit = runCalc('modifyCritMult', [attacker], crit, { attacker, defender, party: getBattleContext().party });

  let rawDmg = defRed * elemMult * variance * crit;
  rawDmg = runCalc('modifyDamageDealt', [attacker], rawDmg, {
    attacker, defender, skillElem, isUltimate,
    isFirstAttack: !(attacker.combatStacks || {})._hasAttacked,
    enemies: getBattleContext().enemies, party: getBattleContext().party
  });

  const dmgReduce = runCalc('calcDamageReduction', [defender], 0, { attacker, defender, skillElem: skillElem || attacker.element });
  const raw = Math.round(rawDmg * Math.max(0, 1 - dmgReduce));
  return { damage: Math.max(1, raw), isCrit: crit > 1, elemMult };
}

let _dmgAttacker = null;
function applyDmgToUnit(u, damage, attacker) {
  _dmgAttacker = attacker || null;
  let remaining = damage;
  let newShield = u.shield || 0;
  if (newShield > 0) {
    const absorbed = Math.min(newShield, remaining);
    newShield -= absorbed;
    remaining -= absorbed;
  }
  let newHp = Math.max(0, u.hp - remaining);
  let alive = newHp > 0;
  const trackerUpdates = {};
  const stackUpdates = {};
  const logs = [];
  let onHitHeal = 0;

  let repeatAttack = null;
  for (const r of runEvent('onTakeDamage', [u, ...getBattleContext().party.filter(p => p.id !== u?.id)], { unit: u, damage, attacker: _dmgAttacker })) {
    if (r.trackerUpdates) Object.assign(trackerUpdates, r.trackerUpdates);
    if (r.combatStackUpdates) Object.assign(stackUpdates, r.combatStackUpdates);
    if (r.healAmount) onHitHeal += r.healAmount;
    if (r.repeatAttack && !repeatAttack) repeatAttack = r.repeatAttack;
    if (r.log) logs.push(r.log);
  }
  if (onHitHeal > 0) newHp = Math.min(u.maxHp, newHp + onHitHeal);

  if (!alive) {
    for (const r of runEvent('onLethalDamage', [u, ...getBattleContext().party.filter(p => p.id !== u?.id)], { unit: u })) {
      if (r.preventDeath) {
        alive = true;
        newHp = r.reviveHp;
        if (r.combatStackUpdates) Object.assign(stackUpdates, r.combatStackUpdates);
        if (r.log) logs.push(r.log);
        break;
      }
    }
  }

  return {
    hp: newHp, alive, shield: newShield,
    hpLostTrackers: { ...(u.hpLostTrackers || {}), ...trackerUpdates },
    combatStacks: { ...(u.combatStacks || {}), ...stackUpdates },
    _dmgLogs: logs,
    _repeatAttack: repeatAttack,
  };
}

// 적 AI
function enemyTurnAI(enemy, playerUnits) {
  const actions = [];
  let notes = enemy.notes;
  const cds = enemy.skillCooldowns || [];
  const atkSkills = enemy.skills.filter((s, i) => s.type === 'attack' && !(cds[i] > 0));
  const budget = Math.ceil(notes * (0.5 + Math.random() * 0.3));
  let spent = 0;
  let enemyOverload = 0;

  while (spent < budget) {
    const affordable = atkSkills.filter(s => {
      const cost = s.type === 'defense' || s.type === 'ultimate' ? s.cost : s.cost + enemyOverload;
      return cost <= (budget - spent);
    });
    if (affordable.length === 0) break;
    affordable.sort((a, b) => b.power - a.power);
    const skill = Math.random() < 0.5 ? affordable[0] : affordable[Math.floor(Math.random() * affordable.length)];
    const actualCost = skill.type === 'defense' || skill.type === 'ultimate' ? skill.cost : skill.cost + enemyOverload;
    const living = playerUnits.filter(u => u.alive);
    if (living.length === 0) break;

    let target = living[Math.floor(Math.random() * living.length)];
    target = runCalc('modifyEnemyTarget', living, target, { enemy, livingTargets: living });

    actions.push({ skill, targetId: target.id });
    spent += actualCost;

    let shouldIncOl = skill.type !== 'defense';
    shouldIncOl = runCalc('modifyEnemyOverload', [enemy], shouldIncOl, { skill });
    if (shouldIncOl) enemyOverload++;
  }
  return { actions, spent };
}

function enemyDefenseAI(enemy, partyUnits) {
  if (enemy.notes <= 0) return null;
  let costPenalty = runCalc('modifyEnemyDefCost', [...(partyUnits || []), enemy], 0, { enemy });
  const eCds = enemy.skillCooldowns || [];
  const defSkills = enemy.skills.filter((s, i) => s.type === 'defense' && (s.cost + costPenalty) <= enemy.notes && !(eCds[i] > 0));
  if (defSkills.length === 0) return null;
  if (Math.random() < 0.6) {
    defSkills.sort((a, b) => a.cost - b.cost);
    return { ...defSkills[0], cost: defSkills[0].cost + costPenalty };
  }
  return null;
}

export default function BattlePage({ setup, onBattleEnd, partyIds }) {
  const [party, setParty] = useState(() => {
    clearAllState();
    const units = setup.party.map(u => ({ ...u, buffs: [], debuffs: [], shield: 0, alive: true, hpLostTrackers: {}, combatStacks: {}, skillCooldowns: new Array(u.skills?.length || 0).fill(0) }));
    for (const u of units) {
      const effMaxHp = getEffStat(u, 'maxHp');
      if (effMaxHp !== u.maxHp) { u.maxHp = effMaxHp; u.hp = effMaxHp; }
      const effMaxNotes = getEffStat(u, 'maxNotes');
      if (effMaxNotes !== u.maxNotes) { u.maxNotes = effMaxNotes; u.notes = effMaxNotes; }
    }
    const windCount = units.filter(u => u.element === 'wind').length;
    for (const u of units) {
      const eff = u.talent?.effects?.find(e => e.id === 129);
      if (eff && windCount > 0) {
        u.maxNotes += windCount * (eff.args?.[1] || 0);
        u.notes = u.maxNotes;
        u.combatStacks._windPartyCount = windCount;
      }
    }
    return units;
  });
  const [enemies, setEnemies] = useState(() => {
    const units = setup.enemies.map(u => ({ ...u, buffs: [], debuffs: [], shield: 0, alive: true, hpLostTrackers: {}, combatStacks: {}, skillCooldowns: new Array(u.skills?.length || 0).fill(0) }));
    for (const u of units) {
      const effMaxHp = getEffStat(u, 'maxHp');
      if (effMaxHp !== u.maxHp) { u.maxHp = effMaxHp; u.hp = effMaxHp; }
    }
    return units;
  });
  const [turnOrder, setTurnOrder] = useState([]);
  const [currentTurnIdx, setCurrentTurnIdx] = useState(0);
  const [turnCycle, setTurnCycle] = useState(1);
  const [phase, setPhase] = useState('start');
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [selectingTarget, setSelectingTarget] = useState(false);
  const [defensePrompt, setDefensePrompt] = useState(null);
  const [overload, setOverload] = useState(0);
  const [log, setLog] = useState([]);
  const [allActions, setAllActions] = useState([]);
  const [result, setResult] = useState(null);
  const [animating, setAnimating] = useState(false);
  const [unitInfoPopup, setUnitInfoPopup] = useState(null);
  const [showDmgDetail, setShowDmgDetail] = useState(false);
  const [showForfeitConfirm, setShowForfeitConfirm] = useState(false);
  const [floatingDmgs, setFloatingDmgs] = useState([]);
  const floatIdRef = useRef(0);
  const [pinnedSkillIdx, setPinnedSkillIdx] = useState(null);
  const [showEffectDetail, setShowEffectDetail] = useState(false);
  const [battleBubble, setBattleBubble] = useState(null);
  useEffect(() => { setPinnedSkillIdx(null); setShowEffectDetail(false); }, [phase, currentTurnIdx]);
  useEffect(() => { loadDialogues(); }, []);
  const longPressTimer = useRef(null);
  const logRef = useRef(null);
  const dmgTracker = useRef({});

  setBattleContext(party, enemies);

  // ====== 전투 가이드 시스템 ======
  const guide = setup.guide || null;
  const [guideStep, setGuideStep] = useState(0);
  const [guideVisible, setGuideVisible] = useState(false);
  const [guideConstraint, setGuideConstraint] = useState(null);
  const guideBlockRef = useRef(false);

  function guideMatches(step) {
    if (!step) return false;
    switch (step.trigger) {
      case 'battle_start': return phase === 'start' && turnCycle === 1;
      case 'player_turn': return phase === 'player_turn';
      case 'enemy_turn': return phase === 'enemy_turn';
      case 'defense_react': return phase === 'defense_react';
      case 'cycle_end': return phase === 'cycle_end';
      case 'battle_end': return phase === 'battle_end';
      default: return false;
    }
  }

  useEffect(() => {
    guideBlockRef.current = false;
    if (!guide?.length || guideStep >= guide.length || guideVisible || guideConstraint) return;
    if (guideMatches(guide[guideStep])) {
      guideBlockRef.current = true;
      setGuideVisible(true);
    }
  }, [phase, guideStep, guideVisible, guideConstraint, turnCycle]);

  const advanceGuide = useCallback(() => {
    const step = guide?.[guideStep];
    const wf = step?.waitFor;
    if (wf && wf !== 'click') {
      setGuideVisible(false);
      setGuideConstraint(step);
    } else {
      setGuideVisible(false);
      setGuideConstraint(null);
      setGuideStep(prev => prev + 1);
    }
  }, [guide, guideStep]);

  const completeGuideAction = useCallback(() => {
    setGuideConstraint(null);
    setGuideStep(prev => prev + 1);
  }, []);

  function isSkillAllowedByGuide(skillIdx) {
    if (!guideConstraint) return true;
    if (guideConstraint.forceEndTurn) return false;
    if (guideConstraint.allowSkills) return guideConstraint.allowSkills.includes(skillIdx);
    return true;
  }

  function isTargetAllowedByGuide(targetIdx) {
    if (!guideConstraint) return true;
    if (guideConstraint.allowTargets) return guideConstraint.allowTargets.includes(targetIdx);
    return true;
  }

  function isEndTurnAllowedByGuide() {
    if (!guideConstraint) return true;
    if (guideConstraint.forceEndTurn) return true;
    if (guideConstraint.waitFor === 'turn_end') return true;
    if (guideConstraint.allowSkills) return false;
    return true;
  }

  function isDefenseAllowedByGuide(defIdx) {
    if (!guideConstraint || guideConstraint.waitFor !== 'defense_use') return true;
    if (guideConstraint.allowDefenseSkills) return guideConstraint.allowDefenseSkills.includes(defIdx);
    return true;
  }

  function isNoDefenseAllowedByGuide() {
    if (!guideConstraint || guideConstraint.waitFor !== 'defense_use') return true;
    return !!guideConstraint.allowNoDefense;
  }

  function trackDmg(unitId, unitName, targetName, amount, source) {
    if (amount <= 0) return;
    const t = dmgTracker.current;
    if (!t[unitId]) t[unitId] = { name: unitName, total: 0, details: [] };
    t[unitId].total += amount;
    t[unitId].details.push({ source, target: targetName, amount });
  }

  const addLog = useCallback((msg) => {
    setLog(prev => [...prev, msg]);
    setTimeout(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, 50);
  }, []);

  const addFloatingDmg = useCallback((unitId, amount, type = 'damage') => {
    const id = ++floatIdRef.current;
    setFloatingDmgs(prev => [...prev, { id, unitId, amount, type }]);
    setTimeout(() => setFloatingDmgs(prev => prev.filter(f => f.id !== id)), 1200);
  }, []);

  function battleCtx(unitId, extra = {}) {
    const unit = [...party, ...enemies].find(u => u.id === unitId);
    return {
      unitId, unitName: unit?.name || '?',
      setParty, setEnemies, addLog, addFloatingDmg, trackDmg,
      party, enemies, applyDmgToUnit, calcDmg,
      triggerIllusionOnHeal,
      ...extra,
    };
  }

  // 사이클 종료 → start 전환
  useEffect(() => {
    if (phase !== 'cycle_end') return;
    if (guideVisible || guideBlockRef.current) return;
    setPhase('start');
  }, [phase === 'cycle_end', guideVisible]);

  // 턴 순서 계산
  useEffect(() => {
    if (phase !== 'start') return;
    if (guideVisible || guideBlockRef.current) return;
    const allUnits = [...party, ...enemies].filter(u => u.alive);
    allUnits.sort((a, b) => {
      const sA = getEffStat(a, 'spd'), sB = getEffStat(b, 'spd');
      if (sB !== sA) return sB - sA;
      return a.isEnemy ? 1 : -1;
    });
    setTurnOrder(allUnits.map(u => u.id));
    setCurrentTurnIdx(0);
    addLog(`--- 사이클 ${turnCycle} 시작 ---`);

    if (turnCycle === 1) {
      const leader = party.find(u => u.alive);
      if (leader) {
        const startLine = getBattleStartLine(leader.characterId);
        if (startLine) setBattleBubble({ speaker: leader.name, text: startLine });
      }
      const firstCycleExtraTurns = [];
      for (const u of party) {
        if (!u.alive) continue;
        const results = runEvent('onFirstCycle', [u], { unit: u, party, enemies });
        const acc = processResults(results, battleCtx(u.id));
        acc.logs.forEach(l => addLog(l));
        if (acc.extraTurnUnits?.length > 0) firstCycleExtraTurns.push(...acc.extraTurnUnits);
      }
      if (firstCycleExtraTurns.length > 0) {
        setTurnOrder(prev => [...firstCycleExtraTurns, ...prev]);
      }
    }

    // onCycleStart 훅: 상태 기반 사이클 개시 효과 (도발→노트 변환 포함)
    for (const u of party) {
      if (!u.alive) continue;
      const results = runEvent('onCycleStart', [u], { unit: u, party, enemies });
      const acc = processResults(results, battleCtx(u.id));
      acc.logs.forEach(l => addLog(l));
      if (acc.noteRecover > 0) {
        setParty(prev => prev.map(pu => pu.id !== u.id ? pu : {
          ...pu, notes: Math.min(pu.maxNotes, pu.notes + acc.noteRecover)
        }));
      }
    }

    // 적 상태이상 사이클 시작 효과 (색 추출 DOT 등)
    for (const e of enemies) {
      if (!e.alive || !e.statuses?.length) continue;
      const results = runEvent('onEnemyStatusTick', [e], { unit: e, party, enemies });
      if (results.length > 0) {
        const acc = processResults(results, battleCtx(e.id));
        acc.logs.forEach(l => addLog(l));
      }
    }

    setPhase('next_turn');
  }, [phase === 'start', guideVisible]);

  // 다음 턴 진행
  useEffect(() => {
    if (phase !== 'next_turn') return;

    const partyAlive = party.some(u => u.alive);
    const enemyAlive = enemies.some(u => u.alive);
    if (!partyAlive) { endBattle('defeat'); return; }
    if (!enemyAlive) { endBattle('victory'); return; }

    let idx = currentTurnIdx;
    while (idx < turnOrder.length) {
      const uid = turnOrder[idx];
      const unit = [...party, ...enemies].find(u => u.id === uid);
      if (unit && unit.alive) break;
      idx++;
    }

    if (idx >= turnOrder.length) {
      // 사이클 종료 → 노트 풀 회복 + 버프/디버프 틱
      setParty(prev => prev.map(u => {
        const cs = { ...(u.combatStacks || {}) };
        delete cs._extraTurn;
        delete cs._hasAttacked;
        delete cs._defenseUsedThisCycle;
        delete cs._futureVisionActive;
        delete cs._futureVisionBoosted;
        const { buffs: newBuffs, expired: expiredBuffs } = tickBuffs(u.id);
        const { debuffs: newDebuffs } = tickDebuffs(u.id);
        return {
          ...u, notes: u.maxNotes, combatStacks: cs,
          buffs: newBuffs, debuffs: newDebuffs,
          _expiredBuffs: expiredBuffs,
          statuses: (u.statuses || []).map(s => ({ ...s, turns: s.turns - 1 })).filter(s => s.turns > 0),
        };
      }));
      setEnemies(prev => prev.map(u => {
        const { buffs } = tickBuffs(u.id);
        const { debuffs } = tickDebuffs(u.id);
        return {
          ...u, notes: u.maxNotes, buffs, debuffs,
          marks: (u.marks || []).map(m => ({ ...m, turns: m.turns - 1 })).filter(m => m.turns > 0),
          statuses: (u.statuses || []).map(s => ({ ...s, turns: s.turns - 1 })).filter(s => s.turns > 0),
        };
      }));

      // onCycleEnd 훅: 추가 턴 + 사이클 스택 + 유성우 등
      const allExtraTurns = [];
      const allCycleLogs = [];
      for (const u of party) {
        if (!u.alive) continue;
        const results = runEvent('onCycleEnd', [u], { unit: u, party, enemies });
        const acc = processResults(results, battleCtx(u.id));
        allExtraTurns.push(...acc.extraTurnUnits);
        // 추가 턴 로그는 즉시, 나머지는 모아서
        for (const r of results) {
          if (r.extraTurn && r.log) addLog(r.log);
        }
        const nonExtraLogs = acc.logs.filter((_, i) => !results[i]?.extraTurn);
        allCycleLogs.push(...nonExtraLogs);
      }

      if (allExtraTurns.length > 0) {
        setTurnOrder(prev => [...prev, ...allExtraTurns]);
        setParty(prev => prev.map(u => {
          const updates = {};
          if (allExtraTurns.includes(u.id)) updates.combatStacks = { ...(u.combatStacks || {}), _extraTurn: 1 };
          if (u._expiredBuffs) updates._expiredBuffs = undefined;
          return Object.keys(updates).length ? { ...u, ...updates } : u;
        }));
        setPhase('next_turn');
        return;
      }

      for (const l of allCycleLogs) addLog(l);
      setParty(prev => prev.map(u => u._expiredBuffs ? { ...u, _expiredBuffs: undefined } : u));

      setTurnCycle(prev => prev + 1);
      addLog(`--- 사이클 종료, 턴 노트 회복! ---`);
      setPhase('cycle_end');
      return;
    }

    setCurrentTurnIdx(idx);
    const uid = turnOrder[idx];
    const isPlayerUnit = party.some(u => u.id === uid);

    if (isPlayerUnit) {
      setOverload(0);
      const pUnit = party.find(u => u.id === uid);

      // 턴 시작: 패시브 노트 회복 + 첫 공격 플래그 리셋
      const noteRegen = runCalc('turnStartNotes', [pUnit], 0, {});

      // 퓨처 비전: 이전 아군이 futureVision 보유 → 이번 유닛 크리 부스트
      const prevUnitId = currentTurnIdx > 0 ? turnOrder[currentTurnIdx - 1] : null;
      const prevUnit = prevUnitId ? party.find(u => u.id === prevUnitId) : null;
      const hasFV = prevUnit && !prevUnit.isEnemy && ((prevUnit.combatStacks || {})._futureVisionActive > 0);

      setParty(prev => prev.map(u => {
        if (u.id === uid) {
          return {
            ...u,
            notes: Math.min(u.notes + noteRegen, u.maxNotes),
            combatStacks: { ...(u.combatStacks || {}), _hasAttacked: false, _futureVisionBoosted: hasFV ? 1 : 0 },
            skillCooldowns: (u.skillCooldowns || []).map(cd => Math.max(0, cd - 1)),
          };
        }
        if (hasFV && u.id === prevUnitId) {
          return { ...u, combatStacks: { ...(u.combatStacks || {}), _futureVisionActive: 0 } };
        }
        return u;
      }));

      if (hasFV) addLog(`  [퓨처 비전] ${pUnit.name} 치명타 확률 증가!`);

      // 추가 턴 CD 감소
      if ((pUnit.combatStacks || {})._extraTurn) {
        const cdReduceEff = pUnit.talent?.effects?.find(e => e.id === 155);
        if (cdReduceEff) {
          const reduceAmt = cdReduceEff.args?.[0] ?? 1;
          setParty(prev => prev.map(u => u.id !== uid || !u.skillCooldowns ? u : {
            ...u, skillCooldowns: u.skillCooldowns.map(cd => Math.max(0, cd - reduceAmt))
          }));
          addLog(`  [${pUnit.talent?.name}] 추가 턴 → 전 스킬 CD -${reduceAmt}`);
        }
      }

      setPhase('player_turn');
    } else {
      setEnemies(prev => prev.map(u => u.id !== uid ? u : {
        ...u,
        skillCooldowns: (u.skillCooldowns || []).map(cd => Math.max(0, cd - 1)),
      }));
      setPhase('enemy_turn');
    }
  }, [phase === 'next_turn']);

  // 적 턴 자동 진행
  useEffect(() => {
    if (phase !== 'enemy_turn') return;
    if (guideVisible || guideBlockRef.current) return;
    const uid = turnOrder[currentTurnIdx];
    const enemy = enemies.find(u => u.id === uid);
    if (!enemy || !enemy.alive) { advanceTurn(); return; }

    const { actions, spent } = enemyTurnAI(enemy, party);
    if (actions.length === 0) {
      addLog(`${enemy.name}이(가) 대기합니다.`);
      advanceTurn();
      return;
    }

    setAnimating(true);
    const actionsToProcess = [...actions];

    const processNextAction = (idx) => {
      if (idx >= actionsToProcess.length) {
        setEnemies(prev => prev.map(u => u.id === enemy.id ? { ...u, notes: u.notes - spent } : u));
        setAnimating(false);
        advanceTurn();
        return;
      }

      const act = actionsToProcess[idx];
      const target = party.find(u => u.id === act.targetId);
      if (!target || !target.alive) {
        processNextAction(idx + 1);
        return;
      }

      if (act.skill.target === 'aoe') {
        const livingParty = party.filter(u => u.alive);
        addLog(`${enemy.name} → ${act.skill.name}! (전체 공격)`);

        const aoeTargets = livingParty.map(u => {
          const { damage, isCrit } = calcDmg(enemy, u, act.skill.power, act.skill.element);
          return { unit: u, damage, isCrit };
        });

        const processAoeTarget = (ti) => {
          if (ti >= aoeTargets.length) {
            setTimeout(() => processNextAction(idx + 1), 400);
            return;
          }
          const { unit: tgt, damage, isCrit } = aoeTargets[ti];
          const defSkills = tgt.skills?.filter((s, si) => s.type === 'defense' && s.cost <= tgt.notes && !((tgt.skillCooldowns || [])[si] > 0)) || [];

          if (defSkills.length > 0 && tgt.notes > 0) {
            setDefensePrompt({
              defender: tgt, attacker: enemy, damage, isCrit,
              skill: act.skill, aoeIndex: ti, aoeTotal: aoeTargets.length,
              onResolve: (defenseSkill) => {
                applyAttackWithDefense(enemy, tgt, damage, isCrit, defenseSkill);
                setDefensePrompt(null);
                setTimeout(() => processAoeTarget(ti + 1), 300);
              }
            });
            setPhase('defense_react');
          } else {
            applyAttackWithDefense(enemy, tgt, damage, isCrit, null);
            setTimeout(() => processAoeTarget(ti + 1), 300);
          }
        };
        processAoeTarget(0);
      } else {
        const { damage, isCrit, elemMult } = calcDmg(enemy, target, act.skill.power, act.skill.element);
        addLog(`${enemy.name} → ${act.skill.name} → ${target.name}!`);

        const defSkills = target.skills?.filter((s, si) => s.type === 'defense' && s.cost <= target.notes && !((target.skillCooldowns || [])[si] > 0)) || [];

        if (defSkills.length > 0 && target.notes > 0) {
          setDefensePrompt({
            defender: target, attacker: enemy, damage, isCrit, elemMult,
            skill: act.skill,
            onResolve: (defenseSkill) => {
              applyAttackWithDefense(enemy, target, damage, isCrit, defenseSkill);
              setDefensePrompt(null);
              setTimeout(() => processNextAction(idx + 1), 400);
            }
          });
          setPhase('defense_react');
          return;
        } else {
          applyAttackWithDefense(enemy, target, damage, isCrit, null);
          setTimeout(() => processNextAction(idx + 1), 600);
        }
      }
    };

    setTimeout(() => processNextAction(0), 500);
  }, [phase === 'enemy_turn', guideVisible]);

  function applyAttackWithDefense(attacker, defender, baseDamage, isCrit, defenseSkill) {
    let finalDamage = baseDamage;
    let defended = false;

    if (defenseSkill) {
      let defMult = defenseSkill.defense_mult;
      defMult = runCalc('modifyDefenseMult', [defender], defMult, { defender, defenseSkill, attacker, baseDamage });
      if (!defender.isEnemy) {
        defMult = runCalc('partyDefenseAura', party.filter(u => u.alive), defMult, { defender, defenseSkill, attacker });
      }
      defMult = Math.min(1, defMult);
      finalDamage = Math.round(baseDamage * (1 - defMult));
      defended = true;
      if (defMult >= 1) {
        addLog(`  ${defender.name} → ${defenseSkill.name}! 피해 무효화!`);
      } else {
        addLog(`  ${defender.name} → ${defenseSkill.name}으로 방어! (${Math.round(defMult * 100)}% 감소)`);
      }

      if (defender.isEnemy) {
        setEnemies(prev => prev.map(u => {
          if (u.id !== defender.id) return u;
          const updated = { ...u, notes: u.notes - defenseSkill.cost };
          if (defenseSkill.cooldown > 0) {
            const dIdx = u.skills?.findIndex(s => s.name === defenseSkill.name && s.type === 'defense');
            if (dIdx >= 0) { const cds = [...(u.skillCooldowns || [])]; cds[dIdx] = defenseSkill.cooldown; updated.skillCooldowns = cds; }
          }
          return updated;
        }));
      } else {
        setParty(prev => prev.map(u => {
          if (u.id !== defender.id) return u;
          const updated = { ...u, notes: u.notes - defenseSkill.cost };
          if (defenseSkill.cooldown > 0) {
            const dIdx = u.skills?.findIndex(s => s.name === defenseSkill.name && s.type === 'defense');
            if (dIdx >= 0) { const cds = [...(u.skillCooldowns || [])]; cds[dIdx] = defenseSkill.cooldown; updated.skillCooldowns = cds; }
          }
          return updated;
        }));
      }

      // 반격
      const extra = defenseSkill.extra || {};
      if (extra.counter && defenseSkill.power > 0) {
        const counterDmg = calcDmg(defender, attacker, defenseSkill.power, defender.element);
        addLog(`  ${defender.name} 반격! → ${attacker.name}: ${counterDmg.damage} 피해`);
        addFloatingDmg(attacker.id, counterDmg.damage, counterDmg.isCrit ? 'crit' : 'damage');
        trackDmg(defender.id, defender.name, attacker.name, counterDmg.damage, '반격');
        const setter = attacker.isEnemy ? setEnemies : setParty;
        setter(prev => prev.map(u => {
          if (u.id !== attacker.id) return u;
          const dr = applyDmgToUnit(u, counterDmg.damage);
          dr._dmgLogs.forEach(l => addLog(l));
          return { ...u, ...dr };
        }));
      }

      // 파고들기: 다음 사이클 SPD 버프 예약
      const spdBuffEff = (defenseSkill.effectIds || []).find(e => (typeof e === 'object' ? e.id : e) === 325);
      const spdBuffData = extra.next_cycle_spd_buff || (spdBuffEff ? { amount: (typeof spdBuffEff === 'object' ? spdBuffEff.args?.[0] : 0) || 0.15, turns: (typeof spdBuffEff === 'object' ? spdBuffEff.args?.[1] : 0) || 1 } : null);
      if (spdBuffData && !defender.isEnemy) {
        setParty(prev => prev.map(u => u.id !== defender.id ? u : {
          ...u, combatStacks: { ...(u.combatStacks || {}), _pendingSpeedBuff: { ...spdBuffData, skillId: defenseSkill.id, skillName: defenseSkill.name } }
        }));
        addLog(`  [파고들기] 다음 사이클 SPD ${Math.round(spdBuffData.amount * 100)}% 증가 예약`);
      }

      // 방어 스킬 도발 획득
      if (extra.taunt_gain && !defender.isEnemy) {
        const priorDef = (defender.combatStacks || {})._defenseUsedThisCycle || 0;
        let totalTaunt = extra.taunt_gain;
        if (extra.bonus_taunt_on_prior_defense && priorDef > 0) {
          totalTaunt += extra.bonus_taunt_on_prior_defense;
          addLog(`  [수호하기] 이전 방어 감지 → 추가 도발 +${extra.bonus_taunt_on_prior_defense}`);
        }
        setParty(prev => prev.map(u => u.id !== defender.id ? u : {
          ...u, combatStacks: { ...(u.combatStacks || {}), _tauntStacks: ((u.combatStacks || {})._tauntStacks || 0) + totalTaunt }
        }));
        addLog(`  ${defender.name}: 도발 ${totalTaunt}스택 획득`);
      }

      // 방어 스킬 사용 횟수 추적 (수호하기 bonus_taunt_on_prior_defense 용)
      if (!defender.isEnemy) {
        setParty(prev => prev.map(u => u.id !== defender.id ? u : {
          ...u, combatStacks: { ...(u.combatStacks || {}), _defenseUsedThisCycle: ((u.combatStacks || {})._defenseUsedThisCycle || 0) + 1 }
        }));
      }

      // onDefenseUsed 훅: 방어 시 스택 부여 (공생하는 왕, 월드 디자이너)
      if (!defender.isEnemy) {
        const defResults = runEvent('onDefenseUsed', party.filter(u => u.alive), { defender, attacker });
        const defAcc = processResults(defResults, battleCtx(defender.id, { attackerId: attacker.id, defenderId: defender.id }));
        defAcc.logs.forEach(l => addLog(l));
      }

      // onSkillUsed 훅: 방어 스킬도 스킬 사용으로 취급 (수월 스택 등)
      if (!defender.isEnemy) {
        const defSkResults = runEvent('onSkillUsed', party.filter(u => u.alive), { unit: defender, skill: defenseSkill, targets: [attacker], targetId: attacker.id });
        const defSkAcc = processResults(defSkResults, battleCtx(defender.id));
        defSkAcc.logs.forEach(l => addLog(l));
      }
    } else {
      finalDamage = Math.round(baseDamage * gameConfig.battle.undefendedPenalty);
      addLog(`  ${defender.name} 무방비! (+50% 피해)`);
    }

    addLog(`  → ${defender.name}: ${finalDamage} 피해${isCrit ? ' (크리티컬!)' : ''}`);
    addFloatingDmg(defender.id, finalDamage, isCrit ? 'crit' : 'damage');

    // 데미지 적용 (applyDmgToUnit 으로 onTakeDamage + onLethalDamage 처리)
    const setter = defender.isEnemy ? setEnemies : setParty;
    let repeatAttackInfo = null;
    setter(prev => prev.map(u => {
      if (u.id !== defender.id) return u;
      const dr = applyDmgToUnit(u, finalDamage, attacker);
      dr._dmgLogs.forEach(l => addLog(l));
      if (dr._repeatAttack) repeatAttackInfo = dr._repeatAttack;
      return { ...u, ...dr };
    }));

    // 적 처치 시 패시브 힐 온 킬
    if (defender.isEnemy && defender.hp - finalDamage <= 0 && !attacker.isEnemy) {
      const healRate = runCalc('healOnKill', [attacker], 0, {});
      if (healRate > 0) {
        const healAmt = Math.round(attacker.maxHp * healRate);
        setParty(prev => prev.map(u => u.id !== attacker.id ? u : {
          ...u, hp: Math.min(u.maxHp, u.hp + healAmt)
        }));
        addLog(`  [힐 온 킬] ${attacker.name}: HP ${healAmt} 회복`);
        addFloatingDmg(attacker.id, healAmt, 'heal');
      }
    }

    // onCrit 훅: 크리티컬 발생 시 이벤트
    if (isCrit && !attacker.isEnemy) {
      const critResults = runEvent('onCrit', party.filter(u => u.alive), { attacker, defender, damage: finalDamage });
      const critAcc = processResults(critResults, battleCtx(attacker.id));
      critAcc.logs.forEach(l => addLog(l));
    }

    trackDmg(attacker.id, attacker.name, defender.name, finalDamage, defended ? '방어 관통' : '공격');
    setAllActions(prev => [...prev, { attacker: attacker.id, defender: defender.id, damage: finalDamage, defended }]);

    if (attacker.isEnemy && !defender.isEnemy) {
      // onPartyTakeDamage: 아군 피격시 다른 아군 특기 반응
      const ptdResults = runEvent('onPartyTakeDamage', party.filter(u => u.alive), { unit: defender, owner: defender, damagedUnit: defender, damage: finalDamage, party, enemies });
      const ptdAcc = processResults(ptdResults, battleCtx(defender.id));
      ptdAcc.logs.forEach(l => addLog(l));

    }

    // 앵콜 반복 공격: onTakeDamage에서 StackRepeatAttack이 반환한 repeatAttack 처리
    if (repeatAttackInfo && defender.alive !== false) {
      const encDmg = calcDmg(attacker, defender, baseDamage / getEffStat(attacker, 'atk'), attacker.element);
      addLog(`  → ${defender.name}: ${encDmg.damage} 피해${encDmg.isCrit ? ' (크리티컬!)' : ''}`);
      addFloatingDmg(defender.id, encDmg.damage, encDmg.isCrit ? 'crit' : 'damage');
      trackDmg(attacker.id, attacker.name, defender.name, encDmg.damage, '앵콜');
      const encSetter = defender.isEnemy ? setEnemies : setParty;
      encSetter(prev => prev.map(u => {
        if (u.id !== defender.id) return u;
        const dr = applyDmgToUnit(u, encDmg.damage, attacker);
        dr._dmgLogs.forEach(l => addLog(l));
        return { ...u, ...dr };
      }));
    }
  }

  // 효과 뮤테이션 적용
  function applyMutations(mutations) {
    for (const m of mutations) {
      const isAlly = party.some(u => u.id === m.targetId);
      const setter = isAlly ? setParty : setEnemies;
      if (m.log) addLog(m.log);
      switch (m.mut) {
        case 'healHp':
          setter(prev => prev.map(u => u.id === m.targetId
            ? { ...u, hp: Math.min(u.maxHp, u.hp + m.amount) } : u));
          break;
        case 'recoverNotes':
          setter(prev => prev.map(u => u.id === m.targetId
            ? { ...u, notes: Math.min(u.maxNotes, u.notes + m.amount) } : u));
          break;
        case 'addBuff': {
          const res = attachBuff(m.targetId, { stat: m.stat, amount: m.amount, turns: m.turns, skillId: m.skillId, skillName: m.skillName, casterId: m.casterId });
          setter(prev => prev.map(u => u.id === m.targetId ? { ...u, buffs: res.buffs } : u));
          break;
        }
        case 'addDebuff': {
          const res = attachDebuff(m.targetId, { stat: m.stat, amount: m.amount, turns: m.turns, skillId: m.skillId, skillName: m.skillName, casterId: m.casterId });
          setter(prev => prev.map(u => u.id === m.targetId ? { ...u, debuffs: res.debuffs } : u));
          break;
        }
        case 'cleanse': {
          const newDebuffs = cleanse(m.targetId, m.count);
          setter(prev => prev.map(u => u.id === m.targetId ? { ...u, debuffs: newDebuffs } : u));
          break;
        }
        case 'addMark':
          setter(prev => prev.map(u => u.id === m.targetId
            ? { ...u, marks: [...(u.marks || []), { casterId: m.casterId, atkSnapshot: m.atkSnapshot, damageRatio: m.damageRatio, element: m.element, turns: m.turns }] } : u));
          break;
        case 'dispel': {
          const newBuffs = dispelBuffs(m.targetId, m.count);
          setter(prev => prev.map(u => u.id === m.targetId ? { ...u, buffs: newBuffs } : u));
          break;
        }
          break;
        case 'addStatus':
          setter(prev => prev.map(u => u.id === m.targetId
            ? { ...u, statuses: [...(u.statuses || []), { statusKey: m.statusKey, displayName: m.displayName, turns: m.turns, casterId: m.casterId, atkRatio: m.atkRatio }] } : u));
          break;
      }
    }
  }

  // 플레이어 스킬 코스트 계산
  function getActualCost(skill, ol, unit) {
    let cost = skill.cost;
    const ignoreOL = skill.extra?.ignore_overload || skill.effectIds?.some(e => (typeof e === 'object' ? e.id : e) === 319);
    if (skill.type !== 'defense' && skill.type !== 'ultimate' && !ignoreOL) {
      cost += (ol !== undefined ? ol : overload);
    }
    if (unit) cost = runCalc('modifyCost', [unit], cost, { unit, skill, overload: ol, party, enemies });
    return cost;
  }

  function triggerIllusionOnHeal() {
    const results = runEvent('onAllyHealed', party, { party });
    const acc = processResults(results, battleCtx(party[0]?.id));
    acc.logs.forEach(l => addLog(l));
  }

  // 플레이어 스킬 사용
  function useSkill(skill, targetId) {
    const uid = turnOrder[currentTurnIdx];
    const unit = party.find(u => u.id === uid);
    const actualCost = getActualCost(skill, overload, unit);
    if (!unit || unit.notes < actualCost) return;

    const line = getSkillLine(unit.characterId, skill);
    if (line) setBattleBubble({ speaker: unit.name, text: line });

    let targets;
    switch (skill.target) {
      case 'aoe':        targets = enemies.filter(u => u.alive); break;
      case 'ally_all':   targets = party.filter(u => u.alive); break;
      case 'ally_single': targets = [party.find(u => u.id === targetId)]; break;
      case 'self':       targets = [party.find(u => u.id === uid)]; break;
      case 'any_single': targets = [[...party, ...enemies].find(u => u.id === targetId)]; break;
      default:           targets = [enemies.find(u => u.id === targetId)]; break;
    }
    if (!targets.length || targets.some(t => !t)) return;

    // 비방어 스킬 → 과부하 증가 (modifyOverloadInc 훅)
    if (skill.type !== 'defense') {
      const olInc = runCalc('modifyOverloadInc', [unit], 1, { unit, skill, currentOverload: overload });
      setOverload(prev => prev + olInc);
    }

    // onSkillUsed 훅 수집 → processResults로 일괄 처리
    const skillResults = runEvent('onSkillUsed', party.filter(u => u.alive), { unit, skill, targets, targetId, party, enemies, actualCost });
    const skAcc = processResults(skillResults, battleCtx(uid), { accumulateStacks: true });
    const csUpdates = skAcc.combatStackUpdates;
    const noteRec = skAcc.noteRecover;
    const noteRecUncapped = skAcc.noteRecoverUncapped;
    const trResets = skAcc.trackerUpdates;
    const skillLogs = skAcc.logs;
    const totalCdReduce = skAcc.cdReduce;

    // grantExtraTurn: 특기에 의한 다른 유닛 추가 턴 부여 (스텔라라이트 등)
    if (skAcc.grantExtraTurns?.length > 0) {
      for (const tid of skAcc.grantExtraTurns) {
        setTurnOrder(prev => {
          const newOrder = [...prev];
          newOrder.splice(currentTurnIdx + 1, 0, tid);
          return newOrder;
        });
      }
    }

    // 스킬 extra 핸들러 (환영/도발/프리페어/근원 등)
    const skillExtra = skill.extra || {};
    const extraCtx = applySkillExtras(skillExtra, csUpdates, unit, skill, skillLogs);
    const consumedIllusionStacks = extraCtx.consumedIllusion;

    // 노트 차감 + 모디파이어 결과 적용 + 쿨타임
    const skillIdx = unit.skills?.findIndex(s => s === skill);
    setParty(prev => prev.map(u => {
      if (u.id !== uid) return u;
      const updated = { ...u, notes: u.notes - actualCost };
      if (Object.keys(csUpdates).length) updated.combatStacks = { ...(u.combatStacks || {}), ...csUpdates };
      if (noteRec > 0) updated.notes = Math.min(updated.notes + noteRec, u.maxNotes);
      if (noteRecUncapped > 0) updated.notes = updated.notes + noteRecUncapped;
      if (Object.keys(trResets).length) updated.hpLostTrackers = { ...(u.hpLostTrackers || {}), ...trResets };
      if (skill.cooldown > 0 && skillIdx >= 0) {
        const cds = [...(u.skillCooldowns || [])];
        cds[skillIdx] = runCalc('modifyBaseCooldown', [u], skill.cooldown, { unit: u, skill });
        updated.skillCooldowns = cds;
      }
      // CdReduceReceiver(312): 버프 사용 시 해당 스킬 CD 감소
      if (totalCdReduce > 0 && u.skillCooldowns) {
        const cds = [...(updated.skillCooldowns || u.skillCooldowns)];
        u.skills?.forEach((s, i) => {
          if ((s.extra?.cd_reduce_on_buff || s.effectIds?.some(e => (typeof e === 'object' ? e.id : e) === 312)) && cds[i] > 0) cds[i] = Math.max(0, cds[i] - totalCdReduce);
        });
        updated.skillCooldowns = cds;
      }
      return updated;
    }));

    // 스킬 사용 후 extra 처리 (noteRestoreIfZero, hpCost 등)
    applyPostSkillExtras(skillExtra, { unit, skill, targets, setParty, setEnemies, addLog, addFloatingDmg });

    // onPostSkill 훅: 스킬 extra 이펙트 (encore_grant 등)
    {
      const postResults = runEvent('onPostSkill', party.filter(u => u.alive), { unit, skill, targets, party, enemies });
      const postAcc = processResults(postResults, battleCtx(uid));
      postAcc.logs.forEach(l => addLog(l));
    }

    // === 스킬 타입별 처리 ===
    if (skill.type === 'attack' || skill.type === 'ultimate') {
      const extra = skill.extra || {};
      let totalDmgDealt = 0;
      const killedEnemies = [];

      // 일루전: 아군 대상 시 피해 대신 회복
      const allyHealEff = (skill.effectIds || []).find(e => (typeof e === 'object' ? e.id : e) === 323);
      const allyHealRatio = extra.ally_heal_ratio || (allyHealEff ? (typeof allyHealEff === 'object' ? allyHealEff.args?.[0] : 0) || 0.5 : 0);
      const isAllyTarget = allyHealRatio && targets.length === 1 && party.some(p => p.id === targets[0].id);
      if (isAllyTarget) {
        const healAmt = Math.round(getEffStat(unit, 'atk') * skill.power * allyHealRatio);
        addLog(`${unit.name} → ${skill.name} → ${targets[0].name}: HP ${healAmt} 회복`);
        addFloatingDmg(targets[0].id, healAmt, 'heal');
        setParty(prev => prev.map(u => u.id !== targets[0].id ? u : {
          ...u, hp: Math.min(u.maxHp, u.hp + healAmt)
        }));
        triggerIllusionOnHeal();
      }

      // 메타포모시스: 환영 소모로 위력 증가
      let effectivePower = skill.power;
      if (consumedIllusionStacks > 0 && extra.power_per_stack) {
        effectivePower += consumedIllusionStacks * extra.power_per_stack;
      } else if (skAcc.illusionPowerBonus > 0) {
        effectivePower += skAcc.illusionPowerBonus;
      }

      if (!isAllyTarget && effectivePower > 0) {
        for (const target of targets) {
          const { damage, isCrit, elemMult } = calcDmg(unit, target, effectivePower, skill.element, extra.ignoreDef, skill.type === 'ultimate');
          if (skill.target !== 'aoe') {
            const defSkill = enemyDefenseAI(target, party);
            applyAttackWithDefense(unit, target, damage, isCrit, defSkill);
            totalDmgDealt += damage;
            if (target.hp - damage <= 0) killedEnemies.push(target);
          } else {
            const finalDmg = Math.round(damage * gameConfig.battle.undefendedPenalty);
            addLog(`  → ${target.name}: ${finalDmg} 피해${isCrit ? ' (크리티컬!)' : ''}`);
            addFloatingDmg(target.id, finalDmg, isCrit ? 'crit' : 'damage');
            trackDmg(unit.id, unit.name, target.name, finalDmg, '공격');
            let aoeRepeat = null;
            setEnemies(prev => prev.map(u => {
              if (u.id !== target.id) return u;
              const dr = applyDmgToUnit(u, finalDmg, unit);
              dr._dmgLogs.forEach(l => addLog(l));
              if (dr._repeatAttack) aoeRepeat = { target, dr };
              return { ...u, ...dr };
            }));
            totalDmgDealt += finalDmg;
            if (isCrit) {
              const critR = runEvent('onCrit', party.filter(u => u.alive), { attacker: unit, defender: target, damage: finalDmg });
              const critA = processResults(critR, battleCtx(unit.id));
              critA.logs.forEach(l => addLog(l));
            }
            if (target.hp - finalDmg <= 0) killedEnemies.push(target);
            if (aoeRepeat && target.hp - finalDmg > 0) {
              const encDmg = calcDmg(unit, target, effectivePower, skill.element, extra.ignoreDef, skill.type === 'ultimate');
              const encFinal = Math.round(encDmg.damage * gameConfig.battle.undefendedPenalty);
              addLog(`  → ${target.name}: ${encFinal} 피해${encDmg.isCrit ? ' (크리티컬!)' : ''}`);
              addFloatingDmg(target.id, encFinal, encDmg.isCrit ? 'crit' : 'damage');
              trackDmg(unit.id, unit.name, target.name, encFinal, '앵콜');
              setEnemies(prev => prev.map(u => {
                if (u.id !== target.id) return u;
                const dr2 = applyDmgToUnit(u, encFinal, unit);
                dr2._dmgLogs.forEach(l => addLog(l));
                return { ...u, ...dr2 };
              }));
              totalDmgDealt += encFinal;
            }
          }
        }
      }
      if (!isAllyTarget) {
        if (skill.target === 'aoe') {
          addLog(`${unit.name} → ${skill.name}! (전체 공격)`);
        } else {
          addLog(`${unit.name} → ${skill.name} → ${targets[0].name}!`);
        }
      }

      // 공격 후 extra 처리 (레거시 buff/alsoHeal, shield, storm)
      processPostAttackExtras(extra, {
        skill, unit, targets, party,
        setParty, setEnemies, addLog, addFloatingDmg
      });

      // onPostAttack 훅: 스킬 extra 이펙트 (selfHeal 등)
      {
        const paResults = runEvent('onPostAttack', party.filter(u => u.alive), { unit, skill, targets, party, enemies, totalDmgDealt });
        const paAcc = processResults(paResults, battleCtx(uid));
        paAcc.logs.forEach(l => addLog(l));
      }

      // onAttackHit 훅: 왕권 소모, 붕괴 부여
      {
        const hitResults = runEvent('onAttackHit', party, { attacker: unit, targets, party, enemies, actualCost, skill });
        const hitAcc = processResults(hitResults, battleCtx(unit.id, { attackerId: unit.id }));
        hitAcc.logs.forEach(l => addLog(l));
      }

      // 패시브 흡혈
      if (totalDmgDealt > 0) {
        const lsRate = runCalc('lifestealRate', [unit], 0, {});
        if (lsRate > 0) {
          const healAmt = Math.round(totalDmgDealt * lsRate);
          setParty(prev => prev.map(u => u.id !== uid ? u : {
            ...u, hp: Math.min(u.maxHp, u.hp + healAmt)
          }));
          addLog(`  [흡혈] ${unit.name}: ${healAmt} HP 회복`);
        }
      }

      // AOE 적 처치 패시브 힐 온 킬
      if (skill.target === 'aoe' && killedEnemies.length > 0) {
        const healRate = runCalc('healOnKill', [unit], 0, {});
        if (healRate > 0) {
          const healAmt = Math.round(unit.maxHp * healRate) * killedEnemies.length;
          setParty(prev => prev.map(u => u.id !== uid ? u : {
            ...u, hp: Math.min(u.maxHp, u.hp + healAmt)
          }));
          addLog(`  [힐 온 킬] ${unit.name}: ${killedEnemies.length}킬 → HP ${healAmt} 회복`);
        }
      }

      // 첫 공격 플래그 설정
      setParty(prev => prev.map(u => u.id === uid ? {
        ...u, combatStacks: { ...(u.combatStacks || {}), _hasAttacked: true }
      } : u));

    } else if (skill.type === 'heal') {
      // onHealCalc 훅: 황혼의 인형사 보너스 힐
      const healResults = runEvent('onHealCalc', party.filter(u => u.alive), { caster: unit });
      const healAcc = processResults(healResults, battleCtx(uid));
      healAcc.logs.forEach(l => addLog(l));
      const bonusHeal = healAcc.bonusHeal;
      if (Object.keys(healAcc.trackerUpdates).length) {
        setParty(prev => prev.map(u => u.id !== uid ? u : {
          ...u, hpLostTrackers: { ...(u.hpLostTrackers || {}), ...healAcc.trackerUpdates }
        }));
      }

      for (const target of targets) {
        let healAmt = Math.round(target.maxHp * skill.power) + bonusHeal;
        // 풍류를 아는 교수: 저HP 대상 힐 부스트
        const lowHpEff = unit.talent?.effects?.find(e => e.id === 156);
        if (lowHpEff && target.hp / target.maxHp <= (lowHpEff.args?.[0] || 0.2)) {
          healAmt = Math.round(healAmt * (1 + (lowHpEff.args?.[1] || 0.5)));
        }
        healAmt = runCalc('modifyHealAmount', [unit], healAmt, { caster: unit, target, skill, party });
        setParty(prev => prev.map(u => u.id === target.id ? {
          ...u, hp: Math.min(u.maxHp, u.hp + healAmt)
        } : u));
        addLog(`${unit.name} → ${skill.name} → ${target.name}: HP ${healAmt} 회복`);
      }
      triggerIllusionOnHeal();
    } else if (skill.type === 'buff') {
      const extra = skill.extra || {};
      processBuffExtras(extra, { unit, skill, setParty, addLog, addFloatingDmg });

      const hasEffectIds = skill.effectIds?.length > 0;
      const statusKey = findStatusBuffKey(extra);
      if (statusKey) {
        const statusData = extra[statusKey];
        const displayName = getStatusBuffName(statusKey);
        for (const target of targets) {
          setParty(prev => prev.map(u => {
            if (u.id !== target.id) return u;
            const statuses = (u.statuses || []).filter(s => s.key !== statusKey);
            const params = statusData.stacks != null ? [statusData.stacks] : statusData.amount != null ? [statusData.amount] : [];
            return { ...u, statuses: [...statuses, { key: statusKey, statusKey, displayName, turns: statusData.turns || 3, params, ...statusData }] };
          }));
          addLog(`${unit.name} → ${skill.name} → ${target.name}: ${displayName} (${statusData.turns || 3}사이클)`);
        }
      } else if (!hasEffectIds && (!extra.taunt_gain && !extra.prepare || extra.stat)) {
        // effectIds 없는 레거시 버프 스킬: 하드코딩 폴백
        for (const target of targets) {
          const res = attachBuff(target.id, { stat: extra.stat || 'atk', amount: skill.power, turns: extra.turns || 3, skillId: skill.id, skillName: skill.name, casterId: unit.id });
          setParty(prev => prev.map(u => u.id !== target.id ? u : { ...u, buffs: res.buffs }));
          addLog(`${unit.name} → ${skill.name} → ${target.name}: ${(extra.stat || 'ATK').toUpperCase()} ${Math.round(skill.power * 100)}% 증가`);
        }
      }
      // onBuffApplied 훅: 바벨 스택/근원 스택 등 버프 반응
      for (const target of targets) {
        const hadBuff = getBuffs(target.id).some(b => b.skillId === skill.id);
        const buffResults = runEvent('onBuffApplied', party, { caster: unit, target, wasExtended: hadBuff, skill, party });
        const buffAcc = processResults(buffResults, battleCtx(uid));
        buffAcc.logs.forEach(l => addLog(l));
      }
    } else if (skill.type === 'debuff') {
      const extra = skill.extra || {};
      const hasEffectIds = skill.effectIds?.length > 0;
      if (!hasEffectIds) {
        // effectIds 없는 레거시 디버프 스킬: 하드코딩 폴백
        for (const target of targets) {
          const res = attachDebuff(target.id, { stat: extra.stat || 'def', amount: skill.power, turns: extra.turns || 3, skillId: skill.id, skillName: skill.name, casterId: unit.id });
          setEnemies(prev => prev.map(u => u.id === target.id ? { ...u, debuffs: res.debuffs } : u));
          addLog(`${unit.name} → ${skill.name} → ${target.name}: ${(extra.stat || 'DEF').toUpperCase()} ${Math.round(skill.power * 100)}% 감소`);
        }
      }
      // onDebuffApplied 훅
      for (const target of targets) {
        const dbResults = runEvent('onDebuffApplied', party.filter(u => u.alive), { unit, target });
        const dbAcc = processResults(dbResults, battleCtx(unit.id));
        dbAcc.logs.forEach(l => addLog(l));
      }
    } else if (skill.type === 'support') {
      const sExtra = skill.extra || {};
      if (targets.length === 1) {
        addLog(`${unit.name} → ${skill.name} → ${targets[0].name}!`);
      } else {
        addLog(`${unit.name} → ${skill.name}!`);
      }
      if (sExtra.noteRestore) {
        for (const t of targets) {
          setParty(prev => prev.map(u => u.id !== t.id ? u : {
            ...u, notes: Math.min(u.maxNotes, u.notes + sExtra.noteRestore)
          }));
          addLog(`  ${t.name}: 턴 노트 ${sExtra.noteRestore} 회복`);
        }
      }
      if (sExtra.grantExtraTurn && targets.length === 1) {
        const tgt = targets[0];
        setTurnOrder(prev => {
          const newOrder = [...prev];
          newOrder.splice(currentTurnIdx + 1, 0, tgt.id);
          return newOrder;
        });
        addLog(`  ${tgt.name}에게 추가 턴 부여!`);
      }
      if (sExtra.shield) {
        const shieldAmt = Math.round(getEffStat(unit, 'atk') * sExtra.shield.atkRatio);
        for (const t of targets) {
          setParty(prev => prev.map(u => u.id !== t.id ? u : {
            ...u, shield: (u.shield || 0) + shieldAmt
          }));
          addLog(`  ${t.name}: 보호막 ${shieldAmt} 부여`);
          addFloatingDmg(t.id, shieldAmt, 'shield');
        }
      }
    }

    // extra.effects 배열 처리 (모든 스킬 타입 공통)
    const extra = skill.extra || {};
    if (extra.effects && Array.isArray(extra.effects)) {
      const ctx = { caster: unit, targets, allies: party, enemies, skillExtra: extra, skill };
      const mutations = processEffects(extra.effects, ctx);
      applyMutations(mutations);
    }

    // 마크 피해
    if (skill.type !== 'defense') {
      setEnemies(prev => {
        const updated = prev.map(e => {
          if (!e.alive || !(e.marks?.length > 0)) return e;
          let hp = e.hp;
          for (const mark of e.marks) {
            const dmg = Math.round(mark.atkSnapshot * mark.damageRatio);
            hp = Math.max(0, hp - dmg);
            trackDmg(mark.casterId || unit.id, mark.casterName || unit.name, e.name, dmg, '마크');
            addLog(`  [좌표 고정] → ${e.name}: ${dmg} ${mark.element} 피해`);
          }
          return { ...e, hp, alive: hp > 0 };
        });
        return updated;
      });
    }

    // onSkillUsed 로그 출력 (공격/데미지 로그 뒤에)
    for (const l of skillLogs) addLog(l);

    setSelectedSkill(null);
    setSelectingTarget(false);
    if (guideConstraint?.waitFor === 'skill_use') completeGuideAction();
  }

  function endPlayerTurn() {
    if (!isEndTurnAllowedByGuide()) return;
    const uid = turnOrder[currentTurnIdx];
    const unit = party.find(u => u.id === uid);
    addLog(`${unit?.name || '?'} 턴 종료 (노트 ${unit?.notes || 0} 남김)`);
    if (guideConstraint?.waitFor === 'turn_end' || guideConstraint?.forceEndTurn) completeGuideAction();
    advanceTurn();
  }

  function advanceTurn() {
    setCurrentTurnIdx(prev => prev + 1);
    setSelectedSkill(null);
    setSelectingTarget(false);
    setPhase('next_turn');
  }

  function endBattle(res) {
    setResult(res);
    setPhase('battle_end');
    addLog(`=== 전투 ${res === 'victory' ? '승리!' : '패배...'} ===`);
    const survivor = party.find(u => u.alive);
    if (survivor) {
      const cat = res === 'victory' ? 'victory' : 'defeat';
      const line = getLine(survivor.characterId, cat);
      if (line) setBattleBubble({ speaker: survivor.name, text: line });
    }
  }

  const confirmedRef = useRef(false);
  function confirmBattleEnd() {
    if (confirmedRef.current) return;
    confirmedRef.current = true;
    const totalDmg = Object.values(dmgTracker.current).reduce((s, u) => s + u.total, 0);
    onBattleEnd({
      result,
      totalDamage: totalDmg,
      turnCycles: turnCycle,
      allSurvived: party.every(u => u.alive),
      actions: allActions,
      partyIds: partyIds,
    });
  }

  // 전멸 자동 감지
  useEffect(() => {
    if (phase === 'battle_end' || phase === 'start') return;
    if (enemies.length > 0 && enemies.every(e => !e.alive)) {
      endBattle('victory');
    } else if (party.length > 0 && party.every(p => !p.alive)) {
      endBattle('defeat');
    }
  }, [enemies, party]);

  const activeUnitId = turnOrder[currentTurnIdx];
  const activeUnit = [...party, ...enemies].find(u => u.id === activeUnitId);
  const isPlayerTurn = phase === 'player_turn' && party.some(u => u.id === activeUnitId);

  // 키보드 단축키
  useEffect(() => {
    const handleKey = (e) => {
      if (guideVisible) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); advanceGuide(); }
        return;
      }
      if (phase === 'battle_end') return;
      const num = parseInt(e.key);

      if (isPlayerTurn && activeUnit && !animating) {
        if (selectingTarget && selectedSkill && num >= 1) {
          const isAllyTarget = selectedSkill.target === 'ally_single';
          const isAnyTarget = selectedSkill.target === 'any_single';
          const pool = isAnyTarget ? [...party, ...enemies].filter(u => u.alive)
            : isAllyTarget ? party.filter(u => u.alive) : enemies.filter(u => u.alive);
          if (num <= pool.length && isTargetAllowedByGuide(num - 1)) {
            useSkill(selectedSkill, pool[num - 1].id);
            return;
          }
        }
        if (e.key === 'Escape' && selectingTarget) {
          setSelectedSkill(null);
          setSelectingTarget(false);
          return;
        }
        const skills = activeUnit.skills?.filter(s => s.type !== 'defense') || [];
        if (!selectingTarget && num >= 1 && num <= skills.length) {
          if (!isSkillAllowedByGuide(num - 1)) return;
          const sk = skills[num - 1];
          const skRealIdx = activeUnit.skills.indexOf(sk);
          if ((activeUnit.skillCooldowns || [])[skRealIdx] > 0) return;
          if (getActualCost(sk, overload, activeUnit) <= activeUnit.notes) {
            if (sk.target === 'self' || sk.target === 'aoe' || sk.target === 'ally_all') {
              useSkill(sk, sk.target === 'self' ? activeUnit.id : null);
            } else {
              setSelectedSkill(sk);
              setSelectingTarget(true);
            }
          }
          return;
        }
        if (e.key === 'e' || e.key === 'E' || (e.key === ' ' && !selectingTarget)) {
          e.preventDefault();
          if (!isEndTurnAllowedByGuide()) return;
          endPlayerTurn();
          return;
        }
      }

      if (phase === 'defense_react' && defensePrompt) {
        const dCds = defensePrompt.defender.skillCooldowns || [];
        const defs = defensePrompt.defender.skills?.filter((s, si) => s.type === 'defense' && s.cost <= defensePrompt.defender.notes && !(dCds[si] > 0)) || [];
        if (num >= 1 && num <= defs.length) {
          if (!isDefenseAllowedByGuide(num - 1)) return;
          defensePrompt.onResolve(defs[num - 1]);
          if (guideConstraint?.waitFor === 'defense_use') completeGuideAction();
          return;
        }
        if (e.key === '0' || e.key === 'x' || e.key === 'X' || e.key === ' ') {
          if (!isNoDefenseAllowedByGuide()) return;
          e.preventDefault();
          defensePrompt.onResolve(null);
          if (guideConstraint?.waitFor === 'defense_use') completeGuideAction();
          return;
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [phase, isPlayerTurn, activeUnit, animating, defensePrompt, selectingTarget, overload, guideVisible, advanceGuide]);

  const chapterClass = setup.chapter ? `ch-${setup.chapter}` : 'ch-raid';

  const renderUnit = (u, isEnemy) => {
    const isActive = activeUnitId === u.id;
    const isInactive = !isActive && u.alive && phase !== 'battle_end';
    let canTarget = selectingTarget && u.alive && selectedSkill && (
      selectedSkill.target === 'any_single'
      || (isEnemy ? (selectedSkill.target === 'single' || selectedSkill.target === 'aoe')
        : (selectedSkill.target === 'ally_single' || selectedSkill.target === 'ally_all' || selectedSkill.target === 'self'))
    );
    if (canTarget && guideConstraint?.allowTargets) {
      const pool = isEnemy ? enemies.filter(e => e.alive) : party.filter(p => p.alive);
      const tIdx = pool.findIndex(t => t.id === u.id);
      if (!isTargetAllowedByGuide(tIdx)) canTarget = false;
    }

    let targetHotkey = null;
    if (canTarget && selectedSkill && (selectedSkill.target === 'single' || selectedSkill.target === 'ally_single' || selectedSkill.target === 'any_single')) {
      const pool = selectedSkill.target === 'any_single'
        ? [...party, ...enemies].filter(t => t.alive)
        : (isEnemy ? enemies.filter(e => e.alive) : party.filter(p => p.alive));
      const idx = pool.findIndex(t => t.id === u.id);
      if (idx >= 0) targetHotkey = idx + 1;
    }

    const startLongPress = (e) => {
      if (canTarget) return;
      longPressTimer.current = setTimeout(() => {
        longPressTimer.current = 'fired';
        setUnitInfoPopup(u);
      }, 400);
    };
    const cancelLongPress = () => {
      if (longPressTimer.current && longPressTimer.current !== 'fired') clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    };
    const handleClick = () => {
      if (longPressTimer.current === 'fired') { longPressTimer.current = null; return; }
      cancelLongPress();
      if (canTarget) useSkill(selectedSkill, u.id);
    };

    return (
      <div key={u.id}
        className={`battle-unit ${isActive ? 'active' : ''} ${isInactive ? 'inactive' : ''} ${!u.alive ? 'dead' : ''} ${canTarget ? 'targetable' : ''}`}
        onClick={handleClick}
        onMouseDown={startLongPress} onMouseUp={cancelLongPress} onMouseLeave={cancelLongPress}
        onTouchStart={startLongPress} onTouchEnd={cancelLongPress} onTouchCancel={cancelLongPress}
        onContextMenu={(e) => e.preventDefault()}>
        {targetHotkey && <span className="target-hotkey">{targetHotkey}</span>}
        {floatingDmgs.filter(f => f.unitId === u.id).map(f => (
          <span key={f.id} className={`floating-dmg ${f.type}`}>
            {f.type === 'heal' || f.type === 'shield' ? `+${f.amount}` : f.amount}
          </span>
        ))}
        <span className="turn-arrow" dangerouslySetInnerHTML={{ __html: '&#9660;' }} />
        <div className={`unit-sprite ${isEnemy ? 'enemy-sprite' : ''} ${u.isBoss ? 'boss-sprite' : ''}`}>
          {(u.image_sd || u.image_url)
            ? <img src={u.image_sd || u.image_url} alt={u.name} />
            : <span className="unit-sprite-initial">{u.name[0]}</span>}
        </div>
        <div className="unit-info-bar">
          <div className="unit-name-row">
            <span>{u.name}</span>
            <span className="unit-elem-icon" dangerouslySetInnerHTML={{ __html: ELEM_ICONS[u.element] || '' }} />
          </div>
          <div className="unit-hp-section">
            <div className="hp-bar">
              <div className={`hp-fill ${isEnemy ? 'enemy-hp' : 'ally-hp'}`}
                style={{ width: `${u.alive ? (u.hp / u.maxHp * 100) : 0}%` }} />
              {(u.shield || 0) > 0 && <div className="shield-fill" style={{ width: `${Math.min(100, u.shield / u.maxHp * 100)}%` }} />}
            </div>
            <div className="hp-text">{u.hp}/{u.maxHp}{(u.shield || 0) > 0 && <span className="shield-text"> +{u.shield}</span>}</div>
          </div>
          <div className="notes-display">
            {Array.from({ length: Math.min(u.maxNotes, 10) }, (_, i) => (
              <span key={i} className={`note-dot ${i < u.notes ? 'filled' : ''} ${isEnemy ? 'enemy-note' : ''}`} />
            ))}
            <span className="notes-num">{u.notes}/{u.maxNotes}</span>
          </div>
        </div>
        {(() => {
          const stacks = getActiveStacks(u);
          if (!stacks.length && !u.buffs?.length && !u.debuffs?.length && !u.statuses?.length && !(u.shield > 0)) return null;
          return (
            <div className="unit-status">
              {stacks.map(sd => (
                <span key={sd.key} className={`stack-icon-wrap ${sd.cls}`} title={sd.label}>
                  {sd.icon
                    ? <img className="stack-icon-img" src={sd.icon} alt={sd.label}
                        onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'inline'; }} />
                    : null}
                  <span className="stack-icon-emoji" style={sd.icon ? { display: 'none' } : {}}>{sd.emoji}</span>
                  {sd.count && <span className="stack-count">{sd.value}</span>}
                </span>
              ))}
              {(u.shield || 0) > 0 && <span className="status-tag shield">보호막 {u.shield}</span>}
              {u.buffs?.map((b, i) => <span key={`b${i}`} className="status-tag buff" title={b.skillName || ''}>{b.label}</span>)}
              {u.debuffs?.map((b, i) => <span key={`d${i}`} className="status-tag debuff" title={b.skillName || ''}>{b.label}</span>)}
              {u.statuses?.map((s, i) => <span key={`s${i}`} className="status-tag status">{s.displayName}</span>)}
            </div>
          );
        })()}
      </div>
    );
  };

  return (
    <div className="battle-page" onClick={(e) => {
      if (pinnedSkillIdx !== null && !e.target.closest('.btn-skill') && !e.target.closest('.effect-detail-panel')) {
        setPinnedSkillIdx(null);
        setShowEffectDetail(false);
      }
    }}>
      <div className={`battle-bg ${chapterClass}`} />

      {battleBubble && (
        <DialogueBubble
          speaker={battleBubble.speaker}
          text={battleBubble.text}
          variant="battle"
          duration={2500}
          onDone={() => setBattleBubble(null)}
        />
      )}

      <div className="battle-header">
        <div className="battle-header-left">
          <span className="cycle-badge">사이클 {turnCycle}</span>
          {setup.stageName && <span className="stage-name-label">{setup.stageName}</span>}
        </div>
        <span className="turn-info">
          {phase === 'battle_end' ? (result === 'victory' ? '승리!' : '패배') :
           phase === 'defense_react' ? '방어 선택!' :
           activeUnit ? `${activeUnit.name}의 턴` : '...'}
        </span>
        {phase !== 'battle_end' && (
          <button className="btn-forfeit" onClick={() => setShowForfeitConfirm(true)}>포기</button>
        )}
      </div>

      {phase !== 'battle_end' && turnOrder.length > 0 && (
        <div className="turn-order-bar">
          {turnOrder.slice(currentTurnIdx).map((uid, i) => {
            const u = [...party, ...enemies].find(u => u.id === uid);
            if (!u) return null;
            const isCurrent = i === 0;
            return (
              <div key={`${uid}-${i}`} className={`to-unit ${isCurrent ? 'to-current' : ''} ${u.isEnemy ? 'to-enemy' : 'to-ally'} ${!u.alive ? 'to-dead' : ''}`}>
                <div className="to-portrait">
                  {(u.image_sd || u.image_url)
                    ? <img src={u.image_sd || u.image_url} alt={u.name} />
                    : <span className="to-initial">{u.name[0]}</span>}
                </div>
                {isCurrent && <div className="to-indicator" />}
              </div>
            );
          })}
        </div>
      )}

      <div className="battlefield">
        <div className="battle-row ally-row">
          {party.map(p => renderUnit(p, false))}
        </div>
        <div className="battle-divider">
          <div className="battle-divider-line" />
          <span className="battle-divider-vs">VS</span>
          <div className="battle-divider-line" />
        </div>
        <div className="battle-row enemy-row">
          {enemies.map(e => renderUnit(e, true))}
        </div>
      </div>

      {phase === 'defense_react' && defensePrompt && (
        <div className="defense-prompt">
          <div className="defense-prompt-inner">
            <h3>{defensePrompt.attacker.name}의 공격!{defensePrompt.aoeTotal > 0 ? ` (${defensePrompt.aoeIndex + 1}/${defensePrompt.aoeTotal})` : ''}</h3>
            <p>{defensePrompt.defender.name}에게 {defensePrompt.skill.name} (예상 피해: ~{defensePrompt.damage})</p>
            <div className="defense-options">
              {defensePrompt.defender.skills?.filter((s, si) => s.type === 'defense' && s.cost <= defensePrompt.defender.notes && !((defensePrompt.defender.skillCooldowns || [])[si] > 0)).map((ds, i) => {
                const defLocked = !isDefenseAllowedByGuide(i);
                return (
                  <button key={i} className={`btn-defense ${defLocked ? 'guide-locked' : ''}`} disabled={defLocked}
                    onClick={() => {
                      defensePrompt.onResolve(ds);
                      if (guideConstraint?.waitFor === 'defense_use') completeGuideAction();
                    }}>
                    <span className="defense-hotkey">{i + 1}</span>
                    {ds.name} ({ds.cost}노트, {Math.round(ds.defense_mult * 100)}% 감소)
                  </button>
                );
              })}
              <button className={`btn-no-defense ${!isNoDefenseAllowedByGuide() ? 'guide-locked' : ''}`}
                disabled={!isNoDefenseAllowedByGuide()}
                onClick={() => {
                  defensePrompt.onResolve(null);
                  if (guideConstraint?.waitFor === 'defense_use') completeGuideAction();
                }}>
                <span className="defense-hotkey">0</span>
                방어 안 함 (+50% 피해)
              </button>
            </div>
            <div className="defense-notes-info">
              남은 노트: {defensePrompt.defender.notes}/{defensePrompt.defender.maxNotes}
            </div>
          </div>
        </div>
      )}

      {isPlayerTurn && activeUnit && !animating && !guideVisible && (
        <div className="skill-panel">
          <div className="skill-panel-header">
            <span>{activeUnit.name}의 행동</span>
            <span className="notes-remain">&#9835; {activeUnit.notes}/{activeUnit.maxNotes}</span>
            {overload > 0 && <span className="overload-badge">과부하 +{overload}</span>}
          </div>
          <div className="skill-grid">
            {activeUnit.skills?.filter(s => s.type !== 'defense').map((s, i) => {
              const realIdx = activeUnit.skills.indexOf(s);
              const cdRemain = (activeUnit.skillCooldowns || [])[realIdx] || 0;
              const effectiveCost = getActualCost(s, overload, activeUnit);
              const guideLocked = !isSkillAllowedByGuide(i);
              const onCooldown = cdRemain > 0;
              let canUse = effectiveCost <= activeUnit.notes && !guideLocked && !onCooldown;
              if (canUse) canUse = runCalc('modifyCanUse', [activeUnit], canUse, { unit: activeUnit, skill: s });
              const typeLabel = SKILL_TYPE_LABELS[s.type] || s.type;
              const ignOL = s.extra?.ignore_overload || s.effectIds?.some(e => (typeof e === 'object' ? e.id : e) === 319);
              const hasOverload = s.type !== 'defense' && s.type !== 'ultimate' && !ignOL && overload > 0;
              const hasCostReduce = effectiveCost < s.cost;
              return (
                <button key={i}
                  className={`btn-skill ${s.type} ${!canUse ? 'disabled' : ''} ${guideLocked ? 'guide-locked' : ''} ${onCooldown ? 'on-cooldown' : ''} ${selectedSkill === s ? 'selected' : ''} ${pinnedSkillIdx === i ? 'pinned' : ''}`}
                  disabled={!canUse}
                  onClick={() => {
                    if (!canUse) return;
                    if (s.target === 'self') {
                      useSkill(s, activeUnit.id);
                    } else if (s.target === 'aoe' || s.target === 'ally_all') {
                      useSkill(s, null);
                    } else {
                      setSelectedSkill(s);
                      setSelectingTarget(true);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (pinnedSkillIdx === i) {
                      setPinnedSkillIdx(null);
                      setShowEffectDetail(false);
                    } else {
                      setPinnedSkillIdx(i);
                      setShowEffectDetail(false);
                    }
                  }}>
                  <span className="skill-hotkey">{i + 1}</span>
                  {s.icon && <img className="skill-icon-img" src={s.icon} alt="" />}
                  <span className="skill-name-btn">{s.name}</span>
                  <span className="skill-meta">
                    <span className={`skill-type-label ${s.type === 'ultimate' ? 'exc-type' : ''}`}>{typeLabel}</span>
                    {' · '}{hasOverload || hasCostReduce ? <><s>{s.cost}</s> {effectiveCost}</> : effectiveCost}&#9835;
                    {s.power > 0 ? ` · ${Math.round(s.power * 100)}%` : ''}
                    {onCooldown && <span className="skill-cd-badge"> · CD {cdRemain}</span>}
                  </span>
                  <span className="skill-elem" dangerouslySetInnerHTML={{ __html: s.element !== 'neutral' ? (ELEM_ICONS[s.element] || '') : '' }} />
                  <div className={`skill-tooltip ${pinnedSkillIdx === i ? 'pinned' : ''}`}>
                    <div className="st-header">
                      {s.icon && <img className="st-icon" src={s.icon} alt="" />}
                      <span className="st-name">{s.name}</span>
                      <span className="st-type" style={{ background: gameConfig.skillTypes[s.type]?.color || '#666' }}>{typeLabel}</span>
                    </div>
                    <div className="st-stats">
                      <span>코스트: {s.cost}&#9835;</span>
                      {s.power > 0 && <span>{s.type === 'heal' ? '회복' : '위력'}: {Math.round(s.power * 100)}%</span>}
                      <span>대상: {TARGET_LABELS[s.target] || s.target}</span>
                      {s.element !== 'neutral' && <span dangerouslySetInnerHTML={{ __html: '속성: ' + (ELEM_ICONS[s.element] || '') + ' ' + (ELEM_LABELS[s.element] || s.element) }} />}
                      {s.defense_mult > 0 && <span>피해 감소: {Math.round(s.defense_mult * 100)}%</span>}
                      {s.cooldown > 0 && <span>쿨타임: {s.cooldown}턴</span>}
                    </div>
                    {hasExtraEffects(s.extra, s.effectIds) && (
                      <div className={`st-effects ${pinnedSkillIdx === i ? 'clickable' : ''}`}
                        onMouseEnter={() => { if (pinnedSkillIdx === i) setShowEffectDetail(true); }}
                        onMouseLeave={() => { if (pinnedSkillIdx === i) setShowEffectDetail(false); }}
                        onClick={(e) => { if (pinnedSkillIdx === i) { e.stopPropagation(); setShowEffectDetail(v => !v); } }}>
                        추가 효과 &#9654;
                      </div>
                    )}
                    {pinnedSkillIdx === i && showEffectDetail && (
                      <div className="effect-detail-panel"
                        onMouseEnter={() => setShowEffectDetail(true)}
                        onMouseLeave={() => setShowEffectDetail(false)}>
                        <div className="edp-title">추가 효과</div>
                        {(s.extra?.effects || []).map((eff, ei) => (
                          <div key={ei} className="edp-row">
                            <span className={`edp-type ${eff.type}`}>{eff.type}</span>
                            <span className="edp-desc">{describeEffect(eff)}</span>
                            {eff.chance && eff.chance < 1 && <span className="edp-chance">{Math.round(eff.chance * 100)}%</span>}
                          </div>
                        ))}
                        {getExtraTooltips(s.extra, s.effectIds).map((t, ti) => (
                          <div key={`t${ti}`} className="edp-row">
                            <span className={`edp-type ${t.cls}`}>{t.label}</span>
                            <span className="edp-desc">{t.desc}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          {selectingTarget && <div className="target-hint">대상을 선택하세요</div>}
          <button className={`btn-end-turn ${!isEndTurnAllowedByGuide() ? 'guide-locked' : ''}`} onClick={endPlayerTurn} disabled={!isEndTurnAllowedByGuide()}>
            턴 종료 (노트 {activeUnit.notes} 남김) <span className="hotkey-hint">[E]</span>
          </button>
        </div>
      )}

      {showForfeitConfirm && (
        <div className="forfeit-overlay" onClick={() => setShowForfeitConfirm(false)}>
          <div className="forfeit-box" onClick={e => e.stopPropagation()}>
            <h3>전투 포기</h3>
            <p>전투를 포기하시겠습니까?<br />패배로 처리됩니다.</p>
            <div className="forfeit-btns">
              <button className="btn-secondary" onClick={() => setShowForfeitConfirm(false)}>취소</button>
              <button className="btn-forfeit-confirm" onClick={() => { setShowForfeitConfirm(false); endBattle('defeat'); }}>포기</button>
            </div>
          </div>
        </div>
      )}

      {phase === 'battle_end' && (() => {
        const tracker = dmgTracker.current;
        const partyDmg = party.map(u => tracker[u.id] || { name: u.name, total: 0, details: [] })
          .filter(d => d.total > 0).sort((a, b) => b.total - a.total);
        const grandTotal = partyDmg.reduce((s, d) => s + d.total, 0);
        return (
          <div className="battle-result-overlay">
            <div className={`battle-result ${result}`}>
              <h2>{result === 'victory' ? '승리!' : result === 'defeat' ? '패배...' : '시간 초과'}</h2>
              <p>사이클: {turnCycle}</p>
              <p className="result-total-dmg">총 피해: {grandTotal.toLocaleString()}</p>

              {partyDmg.length > 0 && (
                <div className="dmg-meter">
                  {partyDmg.map((d, i) => {
                    const pct = grandTotal > 0 ? (d.total / grandTotal * 100) : 0;
                    return (
                      <div key={i} className="dmg-meter-row">
                        <span className="dmg-meter-name">{d.name}</span>
                        <div className="dmg-meter-bar-wrap">
                          <div className="dmg-meter-bar" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="dmg-meter-val">{d.total.toLocaleString()} ({Math.round(pct)}%)</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {!showDmgDetail && partyDmg.length > 0 && (
                <button className="btn-dmg-detail" onClick={() => setShowDmgDetail(true)}>상세 확인</button>
              )}
              {showDmgDetail && (
                <div className="dmg-detail-panel">
                  {partyDmg.map((d, i) => (
                    <div key={i} className="dmg-detail-unit">
                      <h4>{d.name} ({d.total.toLocaleString()})</h4>
                      <div className="dmg-detail-rows">
                        {Object.entries(d.details.reduce((acc, e) => {
                          const key = e.source;
                          acc[key] = (acc[key] || 0) + e.amount;
                          return acc;
                        }, {})).sort((a, b) => b[1] - a[1]).map(([src, amt]) => (
                          <div key={src} className="dmg-detail-row">
                            <span className="ddr-src">{src}</span>
                            <span className="ddr-amt">{amt.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button className="btn-primary result-confirm-btn" onClick={confirmBattleEnd}>확인</button>
            </div>
          </div>
        );
      })()}

      {unitInfoPopup && (() => {
        const u = unitInfoPopup;
        return (
          <div className="unit-info-overlay" onClick={() => setUnitInfoPopup(null)}>
            <div className="unit-info-popup" onClick={(e) => e.stopPropagation()}>
              <button className="unit-info-close" onClick={() => setUnitInfoPopup(null)} dangerouslySetInnerHTML={{ __html: '&#10005;' }} />
              <div className="unit-info-header">
                <div className={`unit-info-sprite ${u.isEnemy ? 'enemy-sprite' : ''}`}>
                  {(u.image_sd || u.image_url)
                    ? <img src={u.image_sd || u.image_url} alt={u.name} />
                    : <span className="unit-sprite-initial">{u.name[0]}</span>}
                </div>
                <div className="unit-info-name-area">
                  <div className="unit-info-name">
                    {u.name}
                    <span className="unit-elem-icon" dangerouslySetInnerHTML={{ __html: ELEM_ICONS[u.element] || '' }} />
                  </div>
                  {u.rarity && <span className="unit-info-rarity">{u.rarity}</span>}
                </div>
              </div>

              <div className="unit-info-stats">
                <div className="unit-info-stat">
                  <span className="uis-label">HP</span>
                  <div className="uis-bar-wrap">
                    <div className={`uis-bar ${u.isEnemy ? 'enemy-hp' : 'ally-hp'}`} style={{ width: `${u.alive ? (u.hp / u.maxHp * 100) : 0}%` }} />
                  </div>
                  <span className="uis-value">{u.hp}/{u.maxHp}</span>
                </div>
                <div className="unit-info-stat"><span className="uis-label">ATK</span><span className="uis-value">{getEffStat(u, 'atk')}</span></div>
                <div className="unit-info-stat"><span className="uis-label">DEF</span><span className="uis-value">{getEffStat(u, 'def')}</span></div>
                <div className="unit-info-stat"><span className="uis-label">SPD</span><span className="uis-value">{getEffStat(u, 'spd')}</span></div>
                <div className="unit-info-stat">
                  <span className="uis-label">&#9835;</span>
                  <span className="uis-value">{u.notes}/{u.maxNotes}</span>
                </div>
              </div>

              {(u.buffs?.length > 0 || u.debuffs?.length > 0 || (u.shield || 0) > 0) && (
                <div className="unit-info-section">
                  <h4>상태 효과 ({u.buffs?.length || 0}/{BUFF_MAX} 버프, {u.debuffs?.length || 0}/{DEBUFF_MAX} 디버프)</h4>
                  <div className="unit-info-status-list">
                    {(u.shield || 0) > 0 && <span className="status-tag shield">보호막 {u.shield}</span>}
                    {u.buffs?.map((b, i) => (
                      <span key={`b${i}`} className="status-tag buff">{b.skillName ? `[${b.skillName}] ` : ''}{b.label} ({b.turns}턴)</span>
                    ))}
                    {u.debuffs?.map((b, i) => (
                      <span key={`d${i}`} className="status-tag debuff">{b.skillName ? `[${b.skillName}] ` : ''}{b.label} ({b.turns}턴)</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="unit-info-section">
                <h4>스킬</h4>
                <div className="unit-info-skill-list">
                  {u.skills?.map((s, i) => (
                    <div key={i} className="unit-info-skill">
                      <span className="uis-skill-type" style={{ background: gameConfig.skillTypes[s.type]?.color || '#666' }}>
                        {SKILL_TYPE_LABELS[s.type] || s.type}
                      </span>
                      <span className="uis-skill-name">{s.name}</span>
                      <span className="uis-skill-cost">&#9835;{s.cost}{s.power > 0 ? ` · ${Math.round(s.power * 100)}%` : ''}</span>
                    </div>
                  ))}
                </div>
              </div>

              {u.talent && (
                <div className="unit-info-section">
                  <h4>특기</h4>
                  <div className="unit-info-talent">
                    <span className="uis-talent-name">{u.talent.name}</span>
                    <p className="uis-talent-desc">{u.talent.desc}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {guideConstraint && !guideVisible && (
        <div className="guide-constraint-bar">
          <span className="guide-constraint-icon">&#9888;</span>
          <span className="guide-constraint-text">{guideConstraint.text}</span>
        </div>
      )}

      {guideVisible && guide && guide[guideStep] && (() => {
        const step = guide[guideStep];
        const hasConstraint = step.waitFor && step.waitFor !== 'click';
        return (
          <div className="battle-guide-overlay" onClick={advanceGuide}>
            <div className="battle-guide-box">
              {step.speakerImage && (
                <div className="guide-speaker-img">
                  <img src={step.speakerImage} alt="" />
                </div>
              )}
              <div className="guide-content">
                {step.speaker && <span className="guide-speaker-name">{step.speaker}</span>}
                <p className="guide-text">{step.text}</p>
              </div>
              <span className="guide-continue">&#9660; {hasConstraint ? '클릭하여 진행' : '클릭하여 계속'}</span>
            </div>
          </div>
        );
      })()}

      <div className="battle-log" ref={logRef}>
        {log.map((l, i) => <div key={i} className="log-entry">{l}</div>)}
      </div>
    </div>
  );
}
