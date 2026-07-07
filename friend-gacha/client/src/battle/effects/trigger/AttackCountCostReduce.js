import { Effect, registerEffect, mapSkillExtra } from '../../effectSystem';

class AttackCountCostReduce extends Effect {
  static ID = 126;
  modifyCost(cost, { owner, unit, skill, modSkill }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill.id !== modSkill.id) return;
    const count = this.getStack(unit, '_attacksThisCycle');
    return Math.max(0, cost - count * this.params[0]);
  }
  onSkillUsed({ owner, unit, skill }) {
    if (owner.id !== unit.id) return;
    if (skill.type === 'attack') {
      const cur = this.getStack(unit, '_attacksThisCycle');
      return { combatStackUpdates: { _attacksThisCycle: cur + 1 } };
    }
  }
  onCycleEnd() {
    return { combatStackUpdates: { _attacksThisCycle: 0 } };
  }
}

registerEffect(AttackCountCostReduce);
mapSkillExtra('attackCountCostReduce', 126);
