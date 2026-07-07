import { Effect, registerEffect } from '../../effectSystem';

// 과부하가 턴 리셋 대신 사이클 종료 시 감소, 음수 가능
// args: [cycleReduce]  예) [4]
class OverloadPersist extends Effect {
  static ID = 178;

  modifyCost(value, { owner, unit, skill, overload }) {
    if (owner.id !== unit.id) return;
    if (skill?.type === 'defense' || skill?.type === 'ultimate') return;
    const ignOL = skill?.extra?.ignore_overload || skill?.effectIds?.some(e => (typeof e === 'object' ? e.id : e) === 319);
    if (ignOL) return;
    const personalOL = (unit.combatStacks || {})._meiOverload || 0;
    const globalOL = overload || 0;
    return Math.max(1, value - globalOL + personalOL);
  }

  onSkillUsed({ owner, unit, skill }) {
    if (owner.id !== unit.id) return;
    if (skill?.type === 'defense') return;
    const cur = (unit.combatStacks || {})._meiOverload || 0;
    return { combatStackUpdates: { _meiOverload: cur + 1 } };
  }

  onCycleEnd({ owner, unit }) {
    if (owner.id !== unit.id) return;
    const cur = (unit.combatStacks || {})._meiOverload || 0;
    const reduce = this.params[0] || 4;
    return {
      combatStackUpdates: { _meiOverload: cur - reduce },
      log: `  [에너지학 연구원] ${unit.name}: 과부하 ${cur} → ${cur - reduce}`,
    };
  }
}

registerEffect(OverloadPersist);
