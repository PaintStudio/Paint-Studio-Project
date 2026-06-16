import React, { useState, useEffect, useRef, useCallback } from 'react';
import './BattlePage.css';

/**
 * 인터랙티브 턴 노트 전투 UI
 * 
 * 전투 흐름:
 * 1. SPD순으로 턴 순서 결정
 * 2. 활성 유닛의 턴:
 *    - 아군: 스킬 선택 → 타겟 선택 → 실행. 노트 남으면 계속 행동 가능. "턴 종료" 가능.
 *    - 적: AI가 행동 결정
 * 3. 공격 시 방어 리액션:
 *    - 아군이 맞을 때: 방어 스킬 선택 프롬프트
 *    - 적이 맞을 때: AI 결정
 * 4. 턴 사이클 종료 → 노트 풀 회복 → 다음 사이클
 */

import gameConfig from '@gameConfig';

// gameConfig에서 속성 상성 생성
const ELEMENT_CHART = {};
for (const [key, val] of Object.entries(gameConfig.elements)) {
  ELEMENT_CHART[key] = { strong: val.strong, weak: val.weak };
}

const ELEM_ICONS = { fire: '🔥', water: '💧', wind: '🌿', light: '✨', dark: '🌑', neutral: '⚪' };
const SKILL_TYPE_LABELS = {};
for (const [k, v] of Object.entries(gameConfig.skillTypes)) SKILL_TYPE_LABELS[k] = v.label;

const _em = gameConfig.elementMultipliers;
function getElemMult(atkElem, defElem) {
  const chart = ELEMENT_CHART[atkElem] || ELEMENT_CHART.neutral;
  if (chart.strong === defElem) return (defElem === 'light' || defElem === 'dark') ? _em.lightDark : _em.normal;
  if (chart.weak === defElem) return (defElem === 'light' || defElem === 'dark') ? _em.lightDarkResist : _em.normalResist;
  return 1.0;
}

function getEffStat(unit, stat) {
  let base = unit[stat];
  for (const b of (unit.buffs || [])) { if (b.stat === stat) base = Math.round(base * (1 + b.amount)); }
  for (const d of (unit.debuffs || [])) { if (d.stat === stat) base = Math.round(base * (1 - d.amount)); }
  return Math.max(1, base);
}

function calcDmg(attacker, defender, power, skillElem, ignoreDef = false) {
  const atk = getEffStat(attacker, 'atk');
  const def = ignoreDef ? 0 : getEffStat(defender, 'def');
  const baseDmg = atk * power;
  const defRed = def > 0 ? baseDmg * (100 / (100 + def)) : baseDmg;
  const elemMult = getElemMult(skillElem || attacker.element, defender.element);
  const _bc = gameConfig.battle;
  const variance = _bc.varianceMin + Math.random() * (_bc.varianceMax - _bc.varianceMin);
  const crit = Math.random() < _bc.critRate ? _bc.critMultiplier : 1.0;
  return { damage: Math.round(defRed * elemMult * variance * crit), isCrit: crit > 1, elemMult };
}

// 적 AI
function enemyTurnAI(enemy, playerUnits) {
  const actions = [];
  let notes = enemy.notes;
  const atkSkills = enemy.skills.filter(s => s.type === 'attack');
  const budget = Math.ceil(notes * (0.5 + Math.random() * 0.3));
  let spent = 0;

  while (spent < budget) {
    const affordable = atkSkills.filter(s => s.cost <= (budget - spent));
    if (affordable.length === 0) break;
    affordable.sort((a, b) => b.power - a.power);
    const skill = Math.random() < 0.5 ? affordable[0] : affordable[Math.floor(Math.random() * affordable.length)];
    const living = playerUnits.filter(u => u.alive);
    if (living.length === 0) break;
    const target = living[Math.floor(Math.random() * living.length)];
    actions.push({ skill, targetId: target.id });
    spent += skill.cost;
  }
  return { actions, spent };
}

function enemyDefenseAI(enemy) {
  if (enemy.notes <= 0) return null;
  const defSkills = enemy.skills.filter(s => s.type === 'defense' && s.cost <= enemy.notes);
  if (defSkills.length === 0) return null;
  if (Math.random() < 0.6) {
    defSkills.sort((a, b) => a.cost - b.cost);
    return defSkills[0];
  }
  return null;
}

export default function BattlePage({ setup, onBattleEnd, partyIds }) {
  const [party, setParty] = useState(() => setup.party.map(u => ({ ...u, buffs: [], debuffs: [], alive: true })));
  const [enemies, setEnemies] = useState(() => setup.enemies.map(u => ({ ...u, buffs: [], debuffs: [], alive: true })));
  const [turnOrder, setTurnOrder] = useState([]);
  const [currentTurnIdx, setCurrentTurnIdx] = useState(0);
  const [turnCycle, setTurnCycle] = useState(1);
  const [phase, setPhase] = useState('start'); // start, player_turn, enemy_turn, defense_react, battle_end
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [selectingTarget, setSelectingTarget] = useState(false);
  const [defensePrompt, setDefensePrompt] = useState(null); // { defender, attacker, damage, skill }
  const [log, setLog] = useState([]);
  const [allActions, setAllActions] = useState([]);
  const [result, setResult] = useState(null);
  const [animating, setAnimating] = useState(false);
  const logRef = useRef(null);

  const addLog = useCallback((msg) => {
    setLog(prev => [...prev, msg]);
    setTimeout(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, 50);
  }, []);

  // 턴 순서 계산
  useEffect(() => {
    if (phase !== 'start') return;
    const allUnits = [...party, ...enemies].filter(u => u.alive);
    allUnits.sort((a, b) => {
      const sA = getEffStat(a, 'spd'), sB = getEffStat(b, 'spd');
      if (sB !== sA) return sB - sA;
      return a.isEnemy ? 1 : -1;
    });
    setTurnOrder(allUnits.map(u => u.id));
    setCurrentTurnIdx(0);
    addLog(`--- 사이클 ${turnCycle} 시작 ---`);
    setPhase('next_turn');
  }, [phase === 'start']);

  // 다음 턴 진행
  useEffect(() => {
    if (phase !== 'next_turn') return;

    // 승패 체크
    const partyAlive = party.some(u => u.alive);
    const enemyAlive = enemies.some(u => u.alive);
    if (!partyAlive) { endBattle('defeat'); return; }
    if (!enemyAlive) { endBattle('victory'); return; }
    if (turnCycle > 30) { endBattle('timeout'); return; }

    // 현재 턴 유닛 찾기
    let idx = currentTurnIdx;
    while (idx < turnOrder.length) {
      const uid = turnOrder[idx];
      const unit = [...party, ...enemies].find(u => u.id === uid);
      if (unit && unit.alive) break;
      idx++;
    }

    if (idx >= turnOrder.length) {
      // 사이클 종료 → 노트 풀 회복 + 버프/디버프 틱
      setParty(prev => prev.map(u => ({
        ...u, notes: u.maxNotes,
        buffs: u.buffs.map(b => ({ ...b, turns: b.turns - 1 })).filter(b => b.turns > 0),
        debuffs: u.debuffs.map(b => ({ ...b, turns: b.turns - 1 })).filter(b => b.turns > 0),
      })));
      setEnemies(prev => prev.map(u => ({
        ...u, notes: u.maxNotes,
        buffs: u.buffs.map(b => ({ ...b, turns: b.turns - 1 })).filter(b => b.turns > 0),
        debuffs: u.debuffs.map(b => ({ ...b, turns: b.turns - 1 })).filter(b => b.turns > 0),
      })));
      setTurnCycle(prev => prev + 1);
      addLog(`--- 사이클 종료, 턴 노트 회복! ---`);
      setPhase('start');
      return;
    }

    setCurrentTurnIdx(idx);
    const uid = turnOrder[idx];
    const isPlayerUnit = party.some(u => u.id === uid);

    if (isPlayerUnit) {
      setPhase('player_turn');
    } else {
      setPhase('enemy_turn');
    }
  }, [phase === 'next_turn']);

  // 적 턴 자동 진행
  useEffect(() => {
    if (phase !== 'enemy_turn') return;
    const uid = turnOrder[currentTurnIdx];
    const enemy = enemies.find(u => u.id === uid);
    if (!enemy || !enemy.alive) { advanceTurn(); return; }

    const { actions, spent } = enemyTurnAI(enemy, party);
    if (actions.length === 0) {
      addLog(`${enemy.name}이(가) 대기합니다.`);
      advanceTurn();
      return;
    }

    // 적 행동 순차 실행
    setAnimating(true);
    let delay = 0;
    const actionsToProcess = [...actions];

    const processNextAction = (idx) => {
      if (idx >= actionsToProcess.length) {
        // 노트 차감
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
        // AOE: 전체 공격 후 각각 방어 판정
        const livingParty = party.filter(u => u.alive);
        const hits = livingParty.map(t => {
          const { damage, isCrit } = calcDmg(enemy, t, act.skill.power, act.skill.element);
          return { target: t, damage, isCrit };
        });

        addLog(`${enemy.name} → ${act.skill.name}! (전체 공격)`);

        // AOE는 방어 리액션 없이 바로 적용 (단순화)
        setParty(prev => prev.map(u => {
          const hit = hits.find(h => h.target.id === u.id);
          if (!hit) return u;
          // 무방비 패널티 +50%
          const finalDmg = Math.round(hit.damage * gameConfig.battle.undefendedPenalty);
          const newHp = Math.max(0, u.hp - finalDmg);
          addLog(`  → ${u.name}: ${finalDmg} 피해${hit.isCrit ? ' (크리티컬!)' : ''}`);
          return { ...u, hp: newHp, alive: newHp > 0 };
        }));

        setTimeout(() => processNextAction(idx + 1), 600);
      } else {
        // 단일 공격 → 방어 리액션
        const { damage, isCrit, elemMult } = calcDmg(enemy, target, act.skill.power, act.skill.element);
        addLog(`${enemy.name} → ${act.skill.name} → ${target.name}!`);

        // 방어 리액션 프롬프트
        const defSkills = target.skills?.filter(s => s.type === 'defense' && s.cost <= target.notes) || [];

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
          // processNextAction will be called from onResolve
          return;
        } else {
          // 방어 불가 → 무방비
          applyAttackWithDefense(enemy, target, damage, isCrit, null);
          setTimeout(() => processNextAction(idx + 1), 600);
        }
      }
    };

    setTimeout(() => processNextAction(0), 500);
  }, [phase === 'enemy_turn']);

  function applyAttackWithDefense(attacker, defender, baseDamage, isCrit, defenseSkill) {
    let finalDamage = baseDamage;
    let defended = false;

    if (defenseSkill) {
      finalDamage = Math.round(baseDamage * (1 - defenseSkill.defense_mult));
      defended = true;
      addLog(`  ${defender.name} → ${defenseSkill.name}으로 방어! (${Math.round(defenseSkill.defense_mult * 100)}% 감소)`);

      // 방어 노트 차감
      if (defender.isEnemy) {
        setEnemies(prev => prev.map(u => u.id === defender.id ? { ...u, notes: u.notes - defenseSkill.cost } : u));
      } else {
        setParty(prev => prev.map(u => u.id === defender.id ? { ...u, notes: u.notes - defenseSkill.cost } : u));
      }

      // 반격 체크
      const extra = defenseSkill.extra || {};
      if (extra.counter && defenseSkill.power > 0) {
        const counterDmg = calcDmg(defender, attacker, defenseSkill.power, defender.element);
        addLog(`  ${defender.name} 반격! → ${attacker.name}: ${counterDmg.damage} 피해`);
        if (attacker.isEnemy) {
          setEnemies(prev => prev.map(u => u.id === attacker.id ? { ...u, hp: Math.max(0, u.hp - counterDmg.damage), alive: Math.max(0, u.hp - counterDmg.damage) > 0 } : u));
        } else {
          setParty(prev => prev.map(u => u.id === attacker.id ? { ...u, hp: Math.max(0, u.hp - counterDmg.damage), alive: Math.max(0, u.hp - counterDmg.damage) > 0 } : u));
        }
      }
    } else {
      // 무방비 패널티 +50%
      finalDamage = Math.round(baseDamage * gameConfig.battle.undefendedPenalty);
      addLog(`  ${defender.name} 무방비! (+50% 피해)`);
    }

    addLog(`  → ${defender.name}: ${finalDamage} 피해${isCrit ? ' (크리티컬!)' : ''}`);

    // 데미지 적용
    if (defender.isEnemy) {
      setEnemies(prev => prev.map(u => u.id === defender.id ? {
        ...u, hp: Math.max(0, u.hp - finalDamage), alive: Math.max(0, u.hp - finalDamage) > 0
      } : u));
    } else {
      setParty(prev => prev.map(u => u.id === defender.id ? {
        ...u, hp: Math.max(0, u.hp - finalDamage), alive: Math.max(0, u.hp - finalDamage) > 0
      } : u));
    }

    setAllActions(prev => [...prev, { attacker: attacker.id, defender: defender.id, damage: finalDamage, defended }]);
  }

  // 플레이어 스킬 사용
  function useSkill(skill, targetId) {
    const uid = turnOrder[currentTurnIdx];
    const unit = party.find(u => u.id === uid);
    if (!unit || unit.notes < skill.cost) return;

    const targets = skill.target === 'aoe'
      ? enemies.filter(u => u.alive)
      : skill.target === 'ally_single' || skill.target === 'ally_all'
        ? (skill.target === 'ally_all' ? party.filter(u => u.alive) : [party.find(u => u.id === targetId)])
        : [enemies.find(u => u.id === targetId)];

    if (!targets.length || targets.some(t => !t)) return;

    // 노트 차감
    setParty(prev => prev.map(u => u.id === uid ? { ...u, notes: u.notes - skill.cost } : u));

    if (skill.type === 'attack' || skill.type === 'ultimate') {
      // 공격 처리
      const extra = skill.extra || {};
      for (const target of targets) {
        const { damage, isCrit, elemMult } = calcDmg(unit, target, skill.power, skill.element, extra.ignoreDef);

        // 적 방어 리액션 (단일 타겟만)
        if (skill.target !== 'aoe') {
          const defSkill = enemyDefenseAI(target);
          applyAttackWithDefense(unit, target, damage, isCrit, defSkill);
        } else {
          // AOE는 방어 없이 적용
          const finalDmg = Math.round(damage * gameConfig.battle.undefendedPenalty); // 무방비
          addLog(`  → ${target.name}: ${finalDmg} 피해${isCrit ? ' (크리티컬!)' : ''}`);
          setEnemies(prev => prev.map(u => u.id === target.id ? {
            ...u, hp: Math.max(0, u.hp - finalDmg), alive: Math.max(0, u.hp - finalDmg) > 0
          } : u));
        }
      }

      if (skill.target === 'aoe') {
        addLog(`${unit.name} → ${skill.name}! (전체 공격)`);
      } else {
        addLog(`${unit.name} → ${skill.name} → ${targets[0].name}!`);
      }

      // 궁극기 버프 처리
      if (extra.buff) {
        setParty(prev => prev.map(u => u.alive ? {
          ...u, buffs: [...u.buffs, { stat: extra.buff.stat, amount: extra.buff.amount, turns: extra.buff.turns }]
        } : u));
        addLog(`  아군 전체 ${extra.buff.stat.toUpperCase()} ${Math.round(extra.buff.amount * 100)}% 증가!`);
      }
      if (extra.alsoHeal) {
        setParty(prev => prev.map(u => u.alive ? {
          ...u, hp: Math.min(u.maxHp, u.hp + Math.round(u.maxHp * extra.alsoHeal))
        } : u));
        addLog(`  아군 전체 HP ${Math.round(extra.alsoHeal * 100)}% 회복!`);
      }

    } else if (skill.type === 'heal') {
      for (const target of targets) {
        const healAmt = Math.round(target.maxHp * skill.power);
        setParty(prev => prev.map(u => u.id === target.id ? {
          ...u, hp: Math.min(u.maxHp, u.hp + healAmt)
        } : u));
        addLog(`${unit.name} → ${skill.name} → ${target.name}: HP ${healAmt} 회복`);
      }
    } else if (skill.type === 'buff') {
      const extra = skill.extra || {};
      for (const target of targets) {
        setParty(prev => prev.map(u => u.id === target.id ? {
          ...u, buffs: [...u.buffs, { stat: extra.stat || 'atk', amount: skill.power, turns: extra.turns || 3 }]
        } : u));
        addLog(`${unit.name} → ${skill.name} → ${target.name}: ${(extra.stat || 'ATK').toUpperCase()} ${Math.round(skill.power * 100)}% 증가`);
      }
    } else if (skill.type === 'debuff') {
      const extra = skill.extra || {};
      for (const target of targets) {
        setEnemies(prev => prev.map(u => u.id === target.id ? {
          ...u, debuffs: [...u.debuffs, { stat: extra.stat || 'def', amount: skill.power, turns: extra.turns || 3 }]
        } : u));
        addLog(`${unit.name} → ${skill.name} → ${target.name}: ${(extra.stat || 'DEF').toUpperCase()} ${Math.round(skill.power * 100)}% 감소`);
      }
    }

    setSelectedSkill(null);
    setSelectingTarget(false);
  }

  function endPlayerTurn() {
    const uid = turnOrder[currentTurnIdx];
    const unit = party.find(u => u.id === uid);
    addLog(`${unit?.name || '?'} 턴 종료 (노트 ${unit?.notes || 0} 남김)`);
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
    const totalDmg = allActions.reduce((sum, a) => {
      const isPlayerAttack = party.some(u => u.id === a.attacker);
      return isPlayerAttack ? sum + a.damage : sum;
    }, 0);

    addLog(`=== 전투 ${res === 'victory' ? '승리!' : res === 'defeat' ? '패배...' : '시간 초과'} ===`);

    onBattleEnd({
      result: res,
      totalDamage: totalDmg,
      turnCycles: turnCycle,
      allSurvived: party.every(u => u.alive),
      actions: allActions,
      partyIds: partyIds,
    });
  }

  // 현재 활성 유닛
  const activeUnitId = turnOrder[currentTurnIdx];
  const activeUnit = [...party, ...enemies].find(u => u.id === activeUnitId);
  const isPlayerTurn = phase === 'player_turn' && party.some(u => u.id === activeUnitId);

  return (
    <div className="battle-page">
      <div className="battle-header">
        <span className="cycle-info">사이클 {turnCycle}</span>
        <span className="turn-info">
          {phase === 'battle_end' ? (result === 'victory' ? '승리!' : '패배') :
           phase === 'defense_react' ? '방어 선택!' :
           activeUnit ? `${activeUnit.name}의 턴` : '...'}
        </span>
      </div>

      {/* 적 유닛 */}
      <div className="battle-enemies">
        {enemies.map(e => (
          <div key={e.id}
            className={`battle-unit enemy ${!e.alive ? 'dead' : ''} ${activeUnitId === e.id ? 'active' : ''} ${selectingTarget && selectedSkill?.type === 'attack' ? 'targetable' : ''}`}
            onClick={() => {
              if (selectingTarget && e.alive && selectedSkill) {
                const tgt = selectedSkill.target;
                if (tgt === 'single' || tgt === 'aoe') useSkill(selectedSkill, e.id);
              }
            }}>
            <div className="unit-name">{e.name} {ELEM_ICONS[e.element] || ''}</div>
            <div className="hp-bar">
              <div className="hp-fill enemy-hp" style={{ width: `${e.alive ? (e.hp / e.maxHp * 100) : 0}%` }} />
            </div>
            <div className="hp-text">{e.hp}/{e.maxHp}</div>
            <div className="notes-display">
              {'🎵'.repeat(Math.min(e.notes, 8))}<span className="notes-num">{e.notes}/{e.maxNotes}</span>
            </div>
            {e.buffs?.length > 0 && <div className="buffs">+{e.buffs.map(b => b.stat).join(',')}</div>}
            {e.debuffs?.length > 0 && <div className="debuffs">-{e.debuffs.map(b => b.stat).join(',')}</div>}
          </div>
        ))}
      </div>

      {/* 아군 유닛 */}
      <div className="battle-party">
        {party.map(p => (
          <div key={p.id}
            className={`battle-unit ally ${!p.alive ? 'dead' : ''} ${activeUnitId === p.id ? 'active' : ''} ${selectingTarget && (selectedSkill?.target === 'ally_single') ? 'targetable' : ''}`}
            onClick={() => {
              if (selectingTarget && p.alive && selectedSkill) {
                const tgt = selectedSkill.target;
                if (tgt === 'ally_single' || tgt === 'ally_all' || tgt === 'self') useSkill(selectedSkill, p.id);
              }
            }}>
            <div className="unit-name">{p.name} {ELEM_ICONS[p.element] || ''}</div>
            <div className="hp-bar">
              <div className="hp-fill ally-hp" style={{ width: `${p.alive ? (p.hp / p.maxHp * 100) : 0}%` }} />
            </div>
            <div className="hp-text">{p.hp}/{p.maxHp}</div>
            <div className="notes-display">
              {'🎵'.repeat(Math.min(p.notes, 8))}<span className="notes-num">{p.notes}/{p.maxNotes}</span>
            </div>
            {p.buffs?.length > 0 && <div className="buffs">+{p.buffs.map(b => b.stat).join(',')}</div>}
            {p.debuffs?.length > 0 && <div className="debuffs">-{p.debuffs.map(b => b.stat).join(',')}</div>}
          </div>
        ))}
      </div>

      {/* 방어 리액션 프롬프트 */}
      {phase === 'defense_react' && defensePrompt && (
        <div className="defense-prompt">
          <div className="defense-prompt-inner">
            <h3>{defensePrompt.attacker.name}의 공격!</h3>
            <p>{defensePrompt.defender.name}에게 {defensePrompt.skill.name} (예상 피해: ~{defensePrompt.damage})</p>
            <div className="defense-options">
              {defensePrompt.defender.skills?.filter(s => s.type === 'defense' && s.cost <= defensePrompt.defender.notes).map((ds, i) => (
                <button key={i} className="btn-defense" onClick={() => defensePrompt.onResolve(ds)}>
                  {ds.name} ({ds.cost}노트, {Math.round(ds.defense_mult * 100)}% 감소)
                </button>
              ))}
              <button className="btn-no-defense" onClick={() => {
                defensePrompt.onResolve(null);
              }}>
                방어 안 함 (+50% 피해)
              </button>
            </div>
            <div className="defense-notes-info">
              남은 노트: {defensePrompt.defender.notes}/{defensePrompt.defender.maxNotes}
            </div>
          </div>
        </div>
      )}

      {/* 스킬 패널 (플레이어 턴) */}
      {isPlayerTurn && activeUnit && !animating && (
        <div className="skill-panel">
          <div className="skill-panel-header">
            <span>{activeUnit.name}의 행동</span>
            <span className="notes-remain">노트: {activeUnit.notes}/{activeUnit.maxNotes}</span>
          </div>
          <div className="skill-grid">
            {activeUnit.skills?.map((s, i) => {
              const canUse = s.cost <= activeUnit.notes;
              const typeLabel = SKILL_TYPE_LABELS[s.type] || s.type;
              return (
                <button key={i}
                  className={`btn-skill ${s.type} ${!canUse ? 'disabled' : ''} ${selectedSkill === s ? 'selected' : ''}`}
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
                  }}>
                  <span className="skill-name-btn">{s.name}</span>
                  <span className="skill-meta">{typeLabel} · {s.cost}노트{s.power > 0 ? ` · ${Math.round(s.power * 100)}%` : ''}</span>
                  {s.element !== 'neutral' && <span className="skill-elem">{ELEM_ICONS[s.element]}</span>}
                </button>
              );
            })}
          </div>
          {selectingTarget && <div className="target-hint">대상을 선택하세요</div>}
          <button className="btn-end-turn" onClick={endPlayerTurn}>
            턴 종료 (노트 {activeUnit.notes} 남김)
          </button>
        </div>
      )}

      {/* 전투 종료 */}
      {phase === 'battle_end' && (
        <div className="battle-result-overlay">
          <div className={`battle-result ${result}`}>
            <h2>{result === 'victory' ? '승리!' : result === 'defeat' ? '패배...' : '시간 초과'}</h2>
            <p>사이클: {turnCycle}</p>
            <p>총 피해: {allActions.reduce((s, a) => party.some(u => u.id === a.attacker) ? s + a.damage : s, 0).toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* 로그 */}
      <div className="battle-log" ref={logRef}>
        {log.map((l, i) => <div key={i} className="log-entry">{l}</div>)}
      </div>
    </div>
  );
}
