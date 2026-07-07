import { Effect, registerEffect } from '../../effectSystem';

// 사용 시 개인 과부하 감소
// args: [reduceAmount]  예) [2]
class OverloadReduceOnUse extends Effect {
  static ID = 345;
  onSkillUsed({ owner, unit, skill, modSkill }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill.id !== modSkill.id) return;
    const reduceAmt = this.params[0] || 2;
    const cur = (unit.combatStacks || {})._meiOverload || 0;
    return {
      combatStackUpdates: { _meiOverload: cur - reduceAmt },
      log: `  ${unit.name}: 과부하 ${reduceAmt} 감소 (${cur} → ${cur - reduceAmt})`,
    };
  }
}

registerEffect(OverloadReduceOnUse);
