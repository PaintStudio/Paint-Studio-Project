import { Effect, registerEffect } from '../../effectSystem';

// 방어 스킬에도 과부하 적용 + 방어 시 과부하 증가 + 과부하 비례 스탯 증가
// args: [statBoostPerOL]  예) [0.5]
class DefenseOverload extends Effect {
  static ID = 179;

  modifyCost(value, { owner, unit, skill }) {
    if (owner.id !== unit.id) return;
    if (skill?.type !== 'defense') return;
    const personalOL = (unit.combatStacks || {})._meiOverload || 0;
    if (personalOL <= 0) return;
    return Math.max(1, value + personalOL);
  }

  onSkillUsed({ owner, unit, skill }) {
    if (owner.id !== unit.id) return;
    if (skill?.type !== 'defense') return;
    const cur = (unit.combatStacks || {})._meiOverload || 0;
    return { combatStackUpdates: { _meiOverload: cur + 1 } };
  }

  modifyStat(value, { owner, unit, stat }) {
    if (owner.id !== unit.id) return;
    if (stat !== 'atk' && stat !== 'def') return;
    const ol = (unit.combatStacks || {})._meiOverload || 0;
    if (ol <= 0) return;
    return Math.round(value * (1 + ol * (this.params[0] || 0.5)));
  }
}

registerEffect(DefenseOverload);
