import { Effect, registerEffect, mapSkillExtra } from '../../effectSystem';

// args: [costMult, damageMult]  예) [2, 2]
class Prepare extends Effect {
  static ID = 127;
  onSkillUsed({ owner, unit, skill, modSkill }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill.id !== modSkill.id) return;
    return {
      combatStackUpdates: { _prepared: true },
      log: `  ${unit.name} → ${skill.name}: 다음 공격 데미지 ${this.params[1] || 2}배, 코스트 ${this.params[0] || 2}배`,
    };
  }
  modifyCost(cost, { owner, unit, skill }) {
    if (owner.id !== unit.id) return;
    if ((skill.type === 'attack' || skill.type === 'ultimate') && this.getStack(unit, '_prepared')) {
      return cost * (this.params[0] || 2);
    }
  }
  modifyDamageDealt(value, { owner, attacker }) {
    if (owner.id !== attacker.id) return;
    if (this.getStack(attacker, '_prepared')) {
      return Math.round(value * (this.params[1] || 2));
    }
  }
}

registerEffect(Prepare);
mapSkillExtra('prepare', 127);
