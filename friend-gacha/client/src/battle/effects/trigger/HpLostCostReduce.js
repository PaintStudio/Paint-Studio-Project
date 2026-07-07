import { Effect, registerEffect, mapSkillExtra } from '../../effectSystem';

class HpLostCostReduce extends Effect {
  static ID = 110;
  modifyCost(cost, { owner, unit, skill, modSkill }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill.id !== modSkill.id) return;
    return Math.max(0, cost - (this.state.reducedCost || 0));
  }
  onTakeDamage({ owner, unit, damage }) {
    if (owner.id !== unit.id) return;
    const threshold = unit.maxHp * (this.params[0] ?? 0.05);
    this.state.damageTotal = (this.state.damageTotal || 0) + damage;
    let newReduced = 0;
    if (threshold > 0) {
      newReduced = Math.floor(this.state.damageTotal / threshold);
    }
    if (newReduced !== (this.state.reducedCost || 0)) {
      this.state.reducedCost = newReduced;
      return {
        log: `  [이그나이트] 코스트 감소 ${newReduced}`
      };
    }
  }
  onSkillUsed({ owner, unit, skill, modSkill }) {
    if (owner.id !== unit.id) return;
    if (modSkill && skill.id === modSkill.id) {
      this.state.damageTotal = 0;
      this.state.reducedCost = 0;
    }
  }
}

registerEffect(HpLostCostReduce);
mapSkillExtra('hpLostCostReduce', 110);
